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
        copyIconContent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4H4a2 2 0 0 1-2-2V4zm8 12v4h10V10h-4v4a2 2 0 0 1-2 2h-4zm4-2V4H4v10h10z" fill="currentColor"/></svg>', // &nbsp;Copy
        checkIconClass: 'text-success',
        checkIconContent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.664 5.253a1 1 0 0 1 .083 1.411l-10.666 12a1 1 0 0 1-1.495 0l-5.333-6a1 1 0 0 1 1.494-1.328l4.586 5.159 9.92-11.16a1 1 0 0 1 1.411-.082z" fill="currentColor"/></svg>&nbsp;Copied!',
        onBeforeCodeCopied: null
    };

    #settings = {};

    addBadge = (highlightEl) => { // Should be mostly a pre or div
        if (highlightEl.classList.contains('clip-badge-pre')) return;

        let htmlText = '';

        const langMatch = highlightEl.className.match(/\blanguage-(?<lang>[a-z0-9_-]+)\b/i);
        let language = langMatch !== null ? langMatch.groups.lang : 'unknown';
        const plainText = decodeURIComponent(highlightEl.dataset.plaintext) || highlightEl.textContent;
        if (language === 'svg' && plainText != '') {    // TODO: add tab to view highlighted code
            highlightEl.innerHTML = plainText;
        } else if (language == 'table') {
            language = '';
            htmlText = highlightEl.innerHTML;
        }

        if (highlightEl.classList.contains('hljs-message')) {
            language = '';
            const right = highlightEl.querySelector('span > small > span.right');
            if (right !== null) {
                language = right.textContent;
                right.remove();
            }
        }

        const badge = this.#settings.template.cloneNode(true);
        badge.classList.add('clip-badge');
        badge.querySelector('.clip-badge-language').textContent = language;

        const copyIcon = badge.querySelector('.clip-badge-copy-icon');
        copyIcon.className = this.#settings.copyIconClass;
        copyIcon.classList.add('clip-badge-copy-icon');
        copyIcon.innerHTML = this.#settings.copyIconContent;

        copyIcon.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (copyIcon.classList.contains('text-success')) return;

            if (this.#settings.onBeforeCodeCopied) {
                plainText = this.#settings.onBeforeCodeCopied(plainText, highlightEl);
            }

            const clipboardData = { 'text/plain': new Blob([plainText], { type: 'text/plain' }) };
            if (htmlText !== '') {
                clipboardData['text/html'] = new Blob([htmlText], { type: 'text/html' });
            }
            navigator.clipboard.write([new ClipboardItem(clipboardData)]).then(() => {
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

        highlightEl.classList.add('clip-badge-pre');
        highlightEl.insertAdjacentElement('afterbegin', badge);
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
color: white;
font-size: 0.875em;
font-size: 12px;
opacity: 0.3;
transition: opacity linear 0.4s;
position: absolute;
right: 0;
top: 0;
}
.hljs-message > .clip-badge {
border-radius: 0 16px 0 7px;
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
margin-top: 2px;
font-weight: 600;
color: goldenrod;
}
.hljs-message > div > div.clip-badge-language {
color: white;
font-weight: 200;
}
.clip-badge-copy-icon {
height: 1.2em;
font-size: 1em;
cursor: pointer;
padding: 0 7px;
margin-top: 2;
user-select: none;
background: #444;
padding: 5px 8px 5px 8px;
border-radius: 0 5px 0 7px;
}
.hljs-message > div > div.clip-badge-copy-icon {
border-radius: 0 16px 0 7px;
}
.hljs-table > div > div.clip-badge-copy-icon {
border-radius: 0 4px 0 7px;
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
<div class="clip-badge-copy-icon" title="Copy to clipboard"></div>
</div>
`;
        }
        return node;
    };


    addAll = () => {
        const addAllInternal = () => {
            const content = document.querySelector(this.#settings.contentSelector);
            const highlightEls1 = content.querySelectorAll('.hljs');
            highlightEls1.forEach(this.addBadge);
            const highlightEls2 = content.querySelectorAll('.hljs-nobg');
            highlightEls2.forEach(this.addBadge);
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addAllInternal);
        } else {
            addAllInternal();
        }
    };


    addTo = (container) => {
        const addToInternal = () => {
            const highlightEls1 = container.querySelectorAll('.hljs');
            highlightEls1.forEach(this.addBadge);
            const highlightEls2 = container.querySelectorAll('.hljs-nobg');
            highlightEls2.forEach(this.addBadge);
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
