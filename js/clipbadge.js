"use strict";

// a heavily modified version of this:
// https://unpkg.com/highlightjs-badge@0.1.9/highlightjs-badge.js

// use like this:
//
// const cb = new ClipBadge({
//   templateSelector: '#my-badge-template',
//   contentSelector: '#my-clip-snippets',
//   autoRun: true,
//   copyIconClass: 'fa fa-copy',
//   copyIconContent: ' Copy',
//   checkIconClass: 'fa fa-check text-success',
//   checkIconContent: ' Copied!',
//   onBeforeCodeCopied: (text, code) => {
//     // Modify the text or code element before copying
//     return text;
//   }
// });

class ClipBadge {
    constructor(options = {}) {
        this.#settings = Object.assign({}, this.#defaults, options);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.#init);
        } else {
            this.#init();
        }
    }


    #defaults = {
        templateSelector: '#clip-badge-template',
        contentSelector: 'body',
        autoRun: true,
        copyIconClass: '',
        copyIconContent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4H4a2 2 0 0 1-2-2V4zm8 12v4h10V10h-4v4a2 2 0 0 1-2 2h-4zm4-2V4H4v10h10z" fill="currentColor"/></svg>&nbsp;Copy',
        checkIconClass: 'text-success',
        checkIconContent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.664 5.253a1 1 0 0 1 .083 1.411l-10.666 12a1 1 0 0 1-1.495 0l-5.333-6a1 1 0 0 1 1.494-1.328l4.586 5.159 9.92-11.16a1 1 0 0 1 1.411-.082z" fill="currentColor"/></svg>&nbsp;Copied!',
        onBeforeCodeCopied: null
    };

    #settings = {};


    addBadge = (pre) => {
        if (pre.classList.contains('clip-badge-pre')) return;

        // const code = pre.querySelector('code') || pre;
        let code = pre.querySelector('code');
        if (!code) {    // TODO: remove specialized svg handling by unifying data-plaintext tag with top (.hljs) tag (mostly pre)
            code = pre;
            //     const node = document.createElement("div");
            //     node.appendChild(pre);
            //     code = pre;
            //     pre.replaceWith(node);
            //     pre.classList.add('hljs');
        }

        const langMatch = code.className.match(/\blanguage-(?<lang>[a-z0-9_-]+)\b/i);
        const language = langMatch !== null ? langMatch.groups.lang : 'unknown';
        const badge = this.#settings.template.cloneNode(true);
        const copyIcon = badge.querySelector('.clip-badge-copy-icon');

        // let text = decodeURIComponent(code.dataset.plaintext) || code.textContent;
        const plaintext = decodeURIComponent(code.dataset.plaintext);
        if (language === 'svg' && plaintext != '') {    // TODO: add tab to view highlighted code
            code.innerHTML = plaintext;
        }

        badge.classList.add('clip-badge');
        badge.querySelector('.clip-badge-language').textContent = language;

        copyIcon.className = this.#settings.copyIconClass;
        copyIcon.classList.add('clip-badge-copy-icon');
        copyIcon.innerHTML = this.#settings.copyIconContent;

        copyIcon.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (copyIcon.classList.contains('text-success')) return;

            let text = decodeURIComponent(code.dataset.plaintext) || code.textContent;

            // TODO: remove specialized svg handling and add tags with a plaintext version (data-plaintext="...") around every part that can be copied
            // if (code.tagName.toLowerCase() === 'svg') text = code.outerHTML;
            // else if (code.firstElementChild && code.firstElementChild.tagName.toLowerCase() === 'svg') text = code.innerHTML;
            // else if (code.firstElementChild.firstElementChild && code.firstElementChild.firstElementChild.tagName.toLowerCase() === 'svg') text = code.firstElementChild.innerHTML;

            if (this.#settings.onBeforeCodeCopied) {
                text = this.#settings.onBeforeCodeCopied(text, code);
            }

            const clipboardItem = new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
            navigator.clipboard.write([clipboardItem]).then(() => {
                copyIcon.className = this.#settings.checkIconClass;
                copyIcon.classList.add('clip-badge-copy-icon');
                copyIcon.innerHTML = this.#settings.checkIconContent;

                setTimeout(() => {
                    copyIcon.className = this.#settings.copyIconClass;
                    copyIcon.classList.add('clip-badge-copy-icon');
                    copyIcon.innerHTML = this.#settings.copyIconContent;
                }, 2000);
            });
        });

        code.classList.add('clip-badge-pre');
        pre.classList.add('clip-badge-pre');
        pre.insertAdjacentElement('afterbegin', badge);
    };


    #getTemplate = () => {
        let node = document.querySelector(this.#settings.templateSelector);
        if (!node) {
            node = document.createElement("template");
            node.innerHTML = `
<style>
.clip-badge-pre {
position: relative;
}
@media print {
.clip-badge {
display: none;
}
}
.clip-badge {
display: flex;
flex-flow: row nowrap;
align-items: flex-start;
white-space: normal;
background: #444;
color: white;
font-size: 0.875em;
opacity: 0.3;
transition: opacity linear 0.4s;
border-radius: 0 0 0 7px;
padding: 5px 8px 5px 8px;
position: absolute;
right: 0;
top: 0;
}
.clip-badge.active {
opacity: 0.8;
}
.clip-badge:hover {
opacity: .95;
}
.clip-badge a,
.clip-badge a:hover {
text-decoration: none;
}
.clip-badge-language {
margin-right: 10px;
font-weight: 600;
color: goldenrod;
}
.clip-badge-copy-icon {
font-size: 1em;
cursor: pointer;
padding: 0 7px;
margin-top: 2;
user-select: none;
}
.clip-badge-copy-icon * {
cursor: pointer;
vertical-align: top;
}
.text-success {
color: limegreen !important;
}
</style>
<div class="clip-badge">
<div class="clip-badge-language"></div>
<div title="Copy to clipboard">
<div class="clip-badge-copy-icon"></div>
</div>
</div>
`;
        }
        return node;
    };


    addAll = () => {
        const addAllInternal = () => {
            const content = document.querySelector(this.#settings.contentSelector);
            const pres = content.querySelectorAll('.hljs');
            pres.forEach(this.addBadge);
            // const svgs = content.querySelectorAll('svg');
            // svgs.forEach(this.addBadge);
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addAllInternal);
        } else {
            addAllInternal();
        }
    };


    addTo = (container) => {
        const addToInternal = () => {
            const pres = container.querySelectorAll('.hljs');
            pres.forEach(this.addBadge);
            // const svgs = container.querySelectorAll('svg');
            // svgs.forEach(this.addBadge);
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addToInternal);
        } else {
            addToInternal();
        }
    };


    #init = () => {
        const node = this.#getTemplate();
        const style = node.content.querySelector("style").cloneNode(true);
        const template = node.content.querySelector('.clip-badge').cloneNode(true);
        document.head.appendChild(style);
        this.#settings.template = template;

        if (this.#settings.autoRun) this.addAll();
    };
}
