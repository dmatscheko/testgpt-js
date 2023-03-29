"use strict";

// TODO: Maybe add token count and answer price to the title.

// Chatbox display the currently selected message path through a Chatlog
class Chatbox {
    constructor(chatlog, container) {
        this.chatlog = chatlog;
        this.container = container;
        this.clipbadge = new ClipBadge({ autoRun: false });
    }

    // Updates the HTML inside the chat window
    update(chatlog, scroll = true) {
        const should_scroll_down = scroll &&
            (this.container.parentElement.scrollHeight - this.container.parentElement.clientHeight <=
                this.container.parentElement.scrollTop + 5);

        const fragment = document.createDocumentFragment();

        // Show the active path through the chatlog
        // const messages = chatlog.getActiveMessages();
        let message = chatlog.getFirstMessage();
        let alternative = null;
        let lastRole = 'assistant';
        let pos = 0;
        while (true) {
            alternative = message.answerAlternatives;
            if (alternative == null) break;
            message = alternative.getActiveMessage();
            if (message === null) break;

            if (message.cache !== null) {
                fragment.appendChild(message.cache);
                lastRole = message.value.role;
                pos++;
                continue;
            }

            const msgIdx = alternative.activeMessageIndex;
            const msgCnt = alternative.messages.length;
            pos++;

            if (message.value === null) {
                let role = 'assistant';
                if (lastRole === 'assistant') role = 'user';
                const messageEl = this.#formatMessage({ value: { role, content: '🤔...' } }, pos, msgIdx, msgCnt);
                fragment.appendChild(messageEl);
                break;
            }

            if (message.value.content === null) {
                const messageEl = this.#formatMessage({ value: { role: message.value.role, content: '🤔...' } }, pos, msgIdx, msgCnt);
                fragment.appendChild(messageEl);
                break;
            }

            const messageEl = this.#formatMessage(message, pos, msgIdx, msgCnt);
            fragment.appendChild(messageEl);
            message.cache = messageEl;
            lastRole = message.value.role;
        }

        this.container.replaceChildren(fragment);

        if (should_scroll_down) {
            this.container.parentElement.scrollTop = this.container.parentElement.scrollHeight;
        }

        try {
            localStorage.chatlog = JSON.stringify(chatlog);
        } catch (error) {
            console.error(error);
        }
    }

    // Formats one message as HTML
    #formatMessage(message, pos, msgIdx, msgCnt) {
        let type = 'ping';
        if (message.value.role === 'assistant') type = 'pong';
        const el = document.createElement('div');
        el.classList.add('message');
        el.classList.add(type);
        el.classList.add('hljs-nobg');
        el.classList.add('hljs-message');
        if (message.value.role === 'system') el.classList.add('system');
        el.dataset.plaintext = encodeURIComponent(message.value.content.trim());
        el.dataset.pos = pos;

        el.appendChild(this.#getAvatar(type));

        let msgStat = '';
        if (msgIdx > 0 || msgCnt > 1) msgStat = `<button title="Previous Message" class="msg_mod-prev-btn toolbtn small"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 7.766c0-1.554-1.696-2.515-3.029-1.715l-7.056 4.234c-1.295.777-1.295 2.653 0 3.43l7.056 4.234c1.333.8 3.029-.16 3.029-1.715V7.766zM9.944 12L17 7.766v8.468L9.944 12zM6 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1z" fill="currentColor"/></svg></button>&nbsp;${msgIdx + 1}/${msgCnt}&nbsp;<button title="Next Message" class="msg_mod-next-btn toolbtn small"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7.766c0-1.554 1.696-2.515 3.029-1.715l7.056 4.234c1.295.777 1.295 2.653 0 3.43L8.03 17.949c-1.333.8-3.029-.16-3.029-1.715V7.766zM14.056 12L7 7.766v8.468L14.056 12zM18 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1z" fill="currentColor"/></svg></button>&nbsp;&nbsp;`;
        let model = '';
        if (message.metadata && message.metadata.model) {
            model = '&nbsp;<span class="right">' + message.metadata.model + '</span>';
        }
        const msgTitleStrip = document.createElement('small');
        msgTitleStrip.innerHTML = `<span class="nobreak"><button title="New Message" class="msg_mod-add-btn toolbtn small"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" fill="currentColor"/></svg></button>&nbsp;&nbsp;${msgStat}<b>${message.value.role}</b>${model}</span><br><br>`;
        el.appendChild(msgTitleStrip);

        const formattedEntities = this.#formatCodeBlocks(message.value.content);
        if (formattedEntities) {
            el.appendChild(formattedEntities);
        } else {
            const div = document.createElement('div');
            div.innerHTML = 'Error: Timeout on API server.';
            el.appendChild(div);
        }

        el.getElementsByClassName('msg_mod-add-btn')[0].addEventListener('click', async () => {
            const messageInp = document.getElementById("message-inp");
            if (type === 'ping') {
                if (messageInp.value === '') messageInp.value = decodeURIComponent(el.dataset.plaintext);
            }
            const alternative = this.chatlog.getNthAlternatives(pos);
            if (alternative !== null) alternative.addMessage(null);
            this.update(this.chatlog, false);
            if (type === 'pong') {
                // Assistant message
                if (receiving) {
                    controller.abort();
                }
                setTimeout(() => {
                    // Set this global to true, so that the click on submit runs without a message in the input box
                    regenerateLastAnswer = true;
                    document.getElementById("submit-btn").click();
                }, 100);
                return;
            }
            messageInp.focus();
        });

        if (msgIdx > 0 || msgCnt > 1) {
            el.getElementsByClassName('msg_mod-prev-btn')[0].addEventListener('click', () => {
                this.chatlog.getNthAlternatives(el.dataset.pos).prev();
                this.update(this.chatlog, false);
            });

            el.getElementsByClassName('msg_mod-next-btn')[0].addEventListener('click', () => {
                this.chatlog.getNthAlternatives(el.dataset.pos).next();
                this.update(this.chatlog, false);
            });
        }

        if (this.clipbadge) {
            this.#prepareTablesAndRemainingSvg(el);
            this.clipbadge.addTo(el);
        }

        return el;
    }

    #getAvatar(type) {
        const avatar = document.createElement('img');
        let avatarSrc = undefined;
        let avatarFromLocalStorage = false;
        try {
            avatarSrc = localStorage.getItem(`${type}Avatar`);
            avatarFromLocalStorage = avatarSrc !== null;
        } catch (error) {
            console.error(error);
        }
        avatar.src = avatarSrc || 'data:image/svg+xml,' + encodeURIComponent(type === 'ping' ? avatar_ping : avatar_pong);
        avatar.addEventListener('click', () => {
            if (avatarFromLocalStorage) {
                const original = 'data:image/svg+xml,' + encodeURIComponent(type === 'ping' ? avatar_ping : avatar_pong);
                avatar.src = original;
                try {
                    localStorage.removeItem(`${type}Avatar`);
                } catch (error) {
                    console.error(error);
                }
                this.chatlog.clearCache();
                this.update(this.chatlog, false);
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', () => {
                const file = input.files[0];
                const reader = new FileReader();
                reader.addEventListener('load', () => {
                    try {
                        localStorage.setItem(`${type}Avatar`, reader.result);
                    } catch (error) {
                        console.error(error);
                    }
                    avatar.src = reader.result;
                    this.chatlog.clearCache();
                    this.update(this.chatlog, false);
                });
                reader.readAsDataURL(file);
            });
            input.click();
        });
        avatar.classList.add('avatar');

        return avatar;
    }

    // TODO: also update SVG 
    #prepareTablesAndRemainingSvg(parent) {
        function tableToCSV(table) {
            const separator = ';';
            const rows = table.querySelectorAll('tr');
            const csv = [];
            for (const rowElement of rows) {
                const row = [];
                const cols = rowElement.querySelectorAll('td, th');
                for (const col of cols) {
                    let data = col.innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ');
                    data = data.replace(/"/g, '""');
                    row.push(`"${data}"`);
                }
                csv.push(row.join(separator));
            }
            return csv.join('\n');
        }

        const tables = parent.querySelectorAll('table');
        for (const table of tables) {
            const div = document.createElement("div");
            div.classList.add('hljs-nobg');
            div.classList.add('hljs-table');
            div.classList.add('language-table');
            div.dataset.plaintext = encodeURIComponent(tableToCSV(table));

            // div.appendChild(table);
            // table.replaceWith(div);
            const pe = table.parentElement;
            pe.insertBefore(div, table);
            pe.removeChild(table);
            div.appendChild(table);
        }
    }

    // Adds syntax highlighting and renders latex formulas to all code blocks in a message
    #formatCodeBlocks(text) {
        if (!text) return text;
        text = text.trim();

        // To mark all SVG as svg, even when the AI marks it as something else
        text = text.replaceAll(/```\w*\s*<svg\s/smgi, '```svg\n<svg ');
        // Add xmlns so that the browser actually shows the image
        text = text.replaceAll(/\(data:image\/svg\+xml,([a-z0-9_"'%+-]+?)\)/smgi, (match, g1) => {
            let data = decodeURIComponent(g1);
            data = data.replace(/<svg\s/smgi, '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" ');
            return '(data:image/svg+xml,' + encodeURIComponent(data) + ')';
        });

        const md_settings = {
            html: false, // Whether to allow HTML tags in the source
            xhtmlOut: false, // Whether to use XHTML-style self-closing tags (e.g. <br />)
            breaks: false, // Whether to convert line breaks into <br> tags
            langPrefix: 'language-', // The prefix for CSS classes applied to code blocks
            linkify: true, // Whether to automatically convert URLs to links
            typographer: false, // Whether to use typographic replacements for quotation marks and the like
            quotes: `""''`, // Which types of quotes to use, if typographer is true
            highlight: function (code, language) {
                let value = '';
                try {
                    if (language && hljs.getLanguage(language)) {
                        value = hljs.highlight(code, { language, ignoreIllegals: true }).value;
                    } else {
                        const highlighted = hljs.highlightAuto(code);
                        language = highlighted.language ? highlighted.language : 'unknown';
                        value = highlighted.value;
                    }
                } catch (error) {
                    console.error(error, code);
                }
                return `<pre class="hljs ${this.langPrefix}${language}" data-plaintext="${encodeURIComponent(code.trim())}"><code>${value}</code></pre>`;
            }
        };
        const md = window.markdownit(md_settings);
        md.validateLink = (link) => {
            if (link.startsWith('javascript:')) return false;
            return true;
        };

        text = md.render(text);

        // would be useful, but the created svgs are not standard conform, so it does not make sense
        // text = text.replaceAll(/!\[([^]+)\]\((data:image\/[;,+%=a-z0-9-]+)\)/gi, '<img src="$2" alt="$1">');

        const origFormulas = [];
        const kt_settings = {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                // { left: "\\(", right: "\\)", display: false },
                { left: "\\begin{equation}", right: "\\end{equation}", display: true },
                // { left: "\\begin{align}", right: "\\end{align}", display: true },
                // { left: "\\begin{alignat}", right: "\\end{alignat}", display: true },
                // { left: "\\begin{gather}", right: "\\end{gather}", display: true },
                // { left: "\\begin{CD}", right: "\\end{CD}", display: true },
                // { left: "\\[", right: "\\]", display: true }
            ],
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'table', 'svg'],
            throwOnError: false,
            preProcess: function (math) {
                origFormulas.push(math);
                return math;
            }
        };

        const wrapper = document.createElement('div');
        wrapper.classList.add('content');
        wrapper.innerHTML = text;

        renderMathInElement(wrapper, kt_settings);

        const elems = wrapper.querySelectorAll('.katex');
        if (elems.length === origFormulas.length) {
            for (let i = 0; i < elems.length; i++) {
                const formula = elems[i].parentElement;
                if (formula.classList.contains('katex-display')) {
                    const div = document.createElement("div");
                    div.classList.add('hljs');
                    div.classList.add('language-latex');
                    div.dataset.plaintext = encodeURIComponent(origFormulas[i].trim());

                    const pe = formula.parentElement;
                    // div.appendChild(pe);
                    // pe.replaceWith(div);
                    const ppe = pe.parentElement;
                    ppe.insertBefore(div, pe);
                    ppe.removeChild(pe);
                    div.appendChild(pe);
                }
            }
        }

        return wrapper;
    }

}
