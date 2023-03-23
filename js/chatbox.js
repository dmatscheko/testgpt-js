"use strict";

// TODO: Maybe add GPT-model, token and answer price to the title. 


class Chatbox {
    constructor(chatlog, container) {
        this.chatlog = chatlog;
        this.container = container;
        this.codebadge = new ClipBadge({ autoRun: false });
    }

    // Updates the HTML inside the chat window
    update(chatlog, scroll = true) {
        const should_scroll_down = scroll &&
            (this.container.parentElement.scrollHeight - this.container.parentElement.clientHeight <=
                this.container.parentElement.scrollTop + 5);

        this.container.innerHTML = '';

        // Trace the active path through the chatlog
        let alternative, messageA, messageB, msgIdxA, msgCntA, msgIdxB, msgCntB;
        let pos = 1;
        messageB = chatlog.getFirstMessage();
        while (true) {
            alternative = messageB.answerAlternatives;
            if (alternative == null) break;
            messageA = alternative.getActiveMessage();
            if (messageA === null) break;
            msgIdxA = alternative.activeMessageIndex;
            msgCntA = alternative.messages.length;
            if (messageA.value === null) {
                this.container.appendChild(this.#formatMessagePairAsRow({ value: { role: 'user', content: '🤔...' } }, null, pos, msgIdxA, msgCntA, 0, 0));
                break;
            }

            alternative = messageA.answerAlternatives;
            messageB = alternative !== null ? alternative.getActiveMessage() : null;
            if (messageB === null) break;
            msgIdxB = alternative.activeMessageIndex;
            msgCntB = alternative.messages.length;
            if (messageB.value === null) {
                this.container.appendChild(this.#formatMessagePairAsRow(messageA, { value: { role: 'assistant', content: '🤔...' } }, pos, msgIdxA, msgCntA, msgIdxB, msgCntB));
                break;
            }

            this.container.appendChild(this.#formatMessagePairAsRow(messageA, messageB, pos, msgIdxA, msgCntA, msgIdxB, msgCntB));
            pos += 2;
        }

        if (this.codebadge) this.codebadge.addTo(this.container);

        if (should_scroll_down) {
            this.container.parentElement.scrollTop = this.container.parentElement.scrollHeight;
        }
    }


    // Formats a message pair as HTML
    #formatMessagePairAsRow(messageA, messageB, pos, msgIdxA, msgCntA, msgIdxB, msgCntB) {
        const row = document.createElement('div');
        row.classList.add('row');
        const ping = this.#formatMessage(messageA, 'ping', pos, msgIdxA, msgCntA);
        row.appendChild(ping);
        if (messageB === null) return row;
        const pong = this.#formatMessage(messageB, 'pong', pos + 1, msgIdxB, msgCntB);
        row.appendChild(pong);
        return row;
    }


    // Formats one message as HTML
    #formatMessage(messageObj, type, pos, msgIdx, msgCnt) {
        const el = document.createElement('div');
        el.classList.add(type);

        let msgStat = ''
        if (msgIdx > 0 || msgCnt > 1) msgStat = `<button title="Previous Message" class="msg_mod-prev-btn toolbtn small"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 7.766c0-1.554-1.696-2.515-3.029-1.715l-7.056 4.234c-1.295.777-1.295 2.653 0 3.43l7.056 4.234c1.333.8 3.029-.16 3.029-1.715V7.766zM9.944 12L17 7.766v8.468L9.944 12zM6 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1z" fill="currentColor"/></svg></button>&nbsp;${msgIdx + 1}/${msgCnt}&nbsp;<button title="Next Message" class="msg_mod-next-btn toolbtn small"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7.766c0-1.554 1.696-2.515 3.029-1.715l7.056 4.234c1.295.777 1.295 2.653 0 3.43L8.03 17.949c-1.333.8-3.029-.16-3.029-1.715V7.766zM14.056 12L7 7.766v8.468L14.056 12zM18 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1z" fill="currentColor"/></svg></button>&nbsp;&nbsp;`;

        let model = '';
        if (messageObj.metadata && messageObj.metadata.model) {
            model = '&nbsp;<span class="right">' + messageObj.metadata.model + '</span>';
        }

        // Using innerHTML instead of string conatenation prevents breaking the HTML with badly formatted HTML inside the messages
        el.innerHTML = `<span class="nobreak"><button title="New Message" class="msg_mod-add-btn toolbtn small"><svg width="16" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1z" fill="currentColor"/></svg></button>&nbsp;&nbsp;<small>${msgStat}<b>${messageObj.value.role}</b>${model}</span><br><br></small>${this.#formatCodeBlocks(messageObj.value.content)}`;
        if (messageObj.value.role === 'system') el.classList.add('system');
        el.dataset.pos = pos;

        el.getElementsByClassName('msg_mod-add-btn')[0].addEventListener('click', () => {
            const alternative = this.chatlog.getNthAlternatives(el.dataset.pos);
            if (alternative !== null) alternative.addMessage(null);
            this.update(this.chatlog, false);
            if (parseInt(el.dataset.pos) % 2 === 0) {
                // Assistant message
                if (receiving) {
                    controller.abort();
                }
                // Set this global to true, so that the click on submit runs without a message in the input box
                regenerateLastAnswer = true;
                document.getElementById("submit-btn").click();
                return;
            }
            document.getElementById("message").focus();
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

        return el;
    }


    // Adds syntax highlighting and renders latex formulas to all code blocks in a message
    #formatCodeBlocks(text) {
        if (!text) return text;
        text = text.trim();

        text = text.replaceAll(/!--MATCH_SVG_A###/ismg, '!-- NO MATCH_SVG_A###'); // partially prevent XSS -- scripts can still be created inside SVGs.
        text = text.replaceAll(/<svg\s.*?<\/svg>/ismg, (match) => {
            return '<!--MATCH_SVG_A###' + btoa(unescape(encodeURIComponent(match))) + '###MATCH_SVG_B-->';
        });

        const defaults = {
            html: false, // Whether to allow HTML tags in the source
            xhtmlOut: false, // Whether to use XHTML-style self-closing tags (e.g. <br />)
            breaks: false, // Whether to convert line breaks into <br> tags
            langPrefix: 'language-', // The prefix for CSS classes applied to code blocks
            linkify: true, // Whether to automatically convert URLs to links
            typographer: false, // Whether to use typographic replacements for quotation marks and the like
            _highlight: true, // Whether to syntax-highlight code blocks using highlight.js
            _strict: false, // Whether to enforce strict parsing rules
            _view: 'html' // The default view mode for the renderer (html | src | debug)
        };
        defaults.highlight = function (code, language) {
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
            return `<pre class="hljs"><code class="${this.langPrefix}${language}">${value}</code></pre>`;
        };
        const md = window.markdownit(defaults);
        text = md.render(text);

        function renderMathInString(str) {
            const delimiters = [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                // { left: "\\(", right: "\\)", display: false },
                { left: "\\begin{equation}", right: "\\end{equation}", display: true },
                // { left: "\\begin{align}", right: "\\end{align}", display: true },
                // { left: "\\begin{alignat}", right: "\\end{alignat}", display: true },
                // { left: "\\begin{gather}", right: "\\end{gather}", display: true },
                // { left: "\\begin{CD}", right: "\\end{CD}", display: true },
                // { left: "\\[", right: "\\]", display: true }
            ];
            const ignoredTags = ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'table', 'svg'];
            const wrapper = document.createElement('div');
            wrapper.innerHTML = str;
            renderMathInElement(wrapper, { delimiters, ignoredTags, throwOnError: false });
            return wrapper.innerHTML;
        }
        text = renderMathInString(text);

        text = text.replaceAll(/(?:<|&lt;)!--MATCH_SVG_A###([A-Za-z0-9\/=%+-]+?)###MATCH_SVG_B--(?:>|&gt;)/ig, (match, p1) => {
            return decodeURIComponent(escape(atob(p1)));
        });

        return text;
    }

}
