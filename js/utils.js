(function (globals) {
    "use strict";


    // Interact with OpenAI API
    async function openaiChat(
        message,
        chatlog,
        model,
        temperature,
        top_p,
        user_role,
        { chatlogEl, submitBtn }
    ) {
        if (!message) return;
        if (receiving) return;
        receiving = true;

        submitBtn.innerHTML = message_stop;
        let entryCreated = false;
        try {
            message = message.trim();
            const prompt_msg = {
                role: user_role,
                content: message
            };
            chatlog.push(prompt_msg);
            chatlog[0].content = first_prompt + getDatePrompt();
            chatlogEl.update(chatlogToChat(chatlog));
            const payload = {
                model,
                messages: chatlog,
                temperature,
                top_p,
                stream: true,
            };
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                signal: controller.signal,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api_key}`
                },
                body: JSON.stringify(payload)
            });
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const value_str = new TextDecoder().decode(value);
                if (value_str.startsWith("{")) {
                    const data = JSON.parse(value_str);
                    if ('error' in data) throw new Error(data.error.message);
                }
                const chunks = value_str.split('\n');
                let content = '';
                chunks.forEach(chunk => {
                    if (chunk.startsWith("data: ")) chunk = chunk.substring(6)
                    if (chunk === '' || chunk === '[DONE]') return;
                    const data = JSON.parse(chunk);
                    if ('error' in data) throw new Error(data.error.message);
                    content += data.choices[0].delta.content || '';
                });
                if (!entryCreated) {
                    chatlog.push({ role: 'assistant', content });
                    entryCreated = true;
                } else {
                    chatlog[chatlog.length - 1].content += content;
                }
                chatlogEl.update(chatlogToChat(chatlog));
            }
        } catch (error) {
            if (('' + error).startsWith('AbortError: ')) {
                controller = new AbortController();
                return;
            }
            if (!entryCreated) {
                chatlog.push({ role: 'assistant', content: '' + error });
                entryCreated = true;
            } else {
                chatlog[chatlog.length - 1].content += `\n\n${error}`;
            }
            chatlogEl.update(chatlogToChat(chatlog));
        } finally {
            receiving = false;
            submitBtn.innerHTML = message_submit;
        }
    }


    // Returns the current date and time as prompt part
    function getDatePrompt() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const datePrompt = `\nKnowledge cutoff: none\nCurrent date: ${year}-${month}-${day}\nCurrent time: ${hours}:${minutes}`;
        return datePrompt;
    }


    // Formats the active chatlog path as array of pairs of HTML formatted messages
    function chatlogToChat(chatlog) {
        let result = [];

        // TODO: trace the active path through the chatlog

        for (let i = 1; i < chatlog.length - 1; i += 2) {
            result.push([
                `<small><b>${chatlog[i].role}</b><br><br></small>${formatCodeBlocks(chatlog[i].content)}`,
                `<small><b>${chatlog[i + 1].role}</b><br><br></small>${formatCodeBlocks(chatlog[i + 1].content)}`
            ]);
        }
        if (chatlog.length > 0 && chatlog.length % 2 === 0) {
            result.push([
                `<small><b>${chatlog[chatlog.length - 1].role}</b><br><br></small>${formatCodeBlocks(chatlog[chatlog.length - 1].content)}`,
                `<small><b>assistant</b><br><br></small>🤔...`
            ]);
        }
        return result;
    }


    // Adds syntax highlighting and renders latex formulas
    function formatCodeBlocks(text) {
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
                // ignore error here
                // console.error(error, code);
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


    // Sets up event listeners for the chat interface
    globals.setUpEventListeners = ({
        chatlogEl,
        messageEl,
        submitBtn,
        newChatBtn,
        temperatureEl,
        topPEl,
    }) => {
        // Semi global chatlog
        // Each entry looks like this: { active, { message, next }, { message, next }, ... }
        let chatlog = [];

        submitBtn.addEventListener("click", () => {
            if (receiving) {
                controller.abort();
                return;
            }
            openaiChat(messageEl.value, chatlog, document.querySelector('input[name="model"]:checked').value, Number(temperatureEl.value), Number(topPEl.value), document.querySelector('input[name="user_role"]:checked').value, { chatlogEl, submitBtn });
            messageEl.value = "";
            messageEl.style.height = "auto";
        });

        messageEl.addEventListener("keydown", (event) => {
            if (event.keyCode === 13 && event.shiftKey) {
                event.preventDefault();
                submitBtn.click();
            }
        });

        messageEl.addEventListener("input", function () {
            this.style.height = "auto";
            let height = this.scrollHeight - parseInt(getComputedStyle(this).paddingTop) - parseInt(getComputedStyle(this).paddingBottom);
            if (height > window.innerHeight / 2) {
                height = window.innerHeight / 2;
                this.style.overflowY = "scroll";
            } else {
                this.style.overflowY = "hidden";
            }
            if (height > this.clientHeight) this.style.height = `${height}px`;
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === "Escape") {
                controller.abort();
            }
        });

        newChatBtn.addEventListener("click", () => {
            if (receiving) {
                controller.abort();
                return;
            }
            messageEl.value = start_message;
            messageEl.style.height = "auto";
            chatlog = [{ role: "system", content: first_prompt }];
            chatlogEl.update(chatlogToChat(chatlog));
        });

        const temperature_val = document.getElementById('temperature-value');
        temperature_val.textContent = temperatureEl.value;
        temperatureEl.addEventListener('input', () => {
            temperature_val.textContent = temperatureEl.value;
        });

        const top_p_val = document.getElementById('top-p-value');
        top_p_val.textContent = topPEl.value;
        topPEl.addEventListener('input', () => {
            top_p_val.textContent = topPEl.value;
        });

        const settings_btn = document.getElementById('settings-btn');
        const settings = document.getElementById('settings');
        settings_btn.addEventListener('click', () => {
            settings.classList.toggle('open');
        });

    }


}((1, eval)('this')));