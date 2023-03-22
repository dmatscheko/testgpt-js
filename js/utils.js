(function (globals) {
    "use strict";


    // Interact with OpenAI API
    async function openaiChat(message, chatlog, model, temperature, top_p, user_role, { chatlogEl, submitBtn }) {
        if (!regenerateLastAnswer && !message) return;
        if (receiving) return;
        receiving = true;

        submitBtn.innerHTML = message_stop;
        let entryCreated = false;
        try {
            if (!regenerateLastAnswer) {
                message = message.trim();
                const prompt_msg = {
                    role: user_role,
                    content: message
                };
                chatlog.addMessage(prompt_msg);
                chatlog.addMessage(null);
            }
            regenerateLastAnswer = false;
            chatlogEl.update(chatlog);
            chatlog.getFirstMessage().value.content = first_prompt + getDatePrompt();
            const payload = {
                model,
                messages: chatlog.getActiveMessageValues(),
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
                    chatlog.addMessage({ role: 'assistant', content });
                    entryCreated = true;
                } else {
                    chatlog.getLastMessage().value.content += content;
                }
                chatlogEl.update(chatlog);
            }
        } catch (error) {
            console.error(error);
            if (('' + error).startsWith('AbortError: ')) {
                controller = new AbortController();
                return;
            }
            if (('' + error).startsWith("Error: You didn't provide an API key.") || ('' + error).startsWith("Error: Incorrect API key provided:")) {
                getApiKey();
            }
            if (!entryCreated) {
                chatlog.addMessage({ role: 'assistant', content: '' + error });
                entryCreated = true;
            } else {
                chatlog.getLastMessage().value.content += `\n\n${error}`;
            }
            chatlogEl.update(chatlog);
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

    // Sets up event listeners for the chat interface
    globals.setUpEventListeners = (chatlog, { chatlogEl, messageEl, submitBtn, newChatBtn, saveChatBtn, loadChatBtn, temperatureEl, topPEl }) => {
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
            if (event.keyCode === 13 && (event.shiftKey || event.ctrlKey)) {
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
            chatlog.rootAlternatives = null;
            chatlog.addMessage({ role: "system", content: first_prompt });
            chatlogEl.update(chatlog);
        });

        saveChatBtn.addEventListener("click", () => {
            const jsonData = JSON.stringify(chatlog);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chatlog.json';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        loadChatBtn.addEventListener("click", () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.addEventListener('change', () => {
                const file = input.files[0];
                const reader = new FileReader();

                reader.addEventListener('load', () => {
                    const jsonData = reader.result;
                    const data = JSON.parse(jsonData);
                    chatlog.load(data.rootAlternatives);
                    chatlogEl.update(chatlog);
                });

                reader.readAsText(file);
                document.body.removeChild(input);
            });

            input.click();
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

        const login_btn = document.getElementById('login-btn');
        login_btn.addEventListener('click', () => {
            getApiKey();
        });

        const logout_btn = document.getElementById('logout-btn');
        logout_btn.addEventListener('click', () => {
            localStorage.removeItem("api_key");
            location.reload();
        });

    }


    const showLoginButton = () => {
        const login = document.getElementById('session-login');
        const logout = document.getElementById('session-logout');
        login.style.display = 'block';
        logout.style.display = 'none';
    }


    const showLogoutButton = () => {
        const login = document.getElementById('session-login');
        const logout = document.getElementById('session-logout');
        login.style.display = 'none';
        logout.style.display = 'block';
    }


    globals.getApiKey = () => {
        // If we need API key handling, we always need the session part
        document.getElementById("session").style.display = 'block';

        // If no or an empty API key has been set, then try to get one from localStorage
        if (typeof api_key == 'undefined' || api_key == '') {
            globals.api_key = localStorage.api_key;
            if (typeof api_key != 'undefined' && api_key != '') {
                showLogoutButton();
                return;
            }
        }

        // If any API key has been set, or localStorage was empty, ask the user for a new API key
        setTimeout(() => {
            globals.api_key = prompt('Either create the file\njs/api_key.js\nwhere you put the OpenAI API key like this:\nconst api_key = "sk-6AQdmaPySsomeW2randomCdmaPIkey0HdmaEI";\n\nOr always enter the API key (only the sk-6AQdmaPySsomeW2randomCdmaPIkey0HdmaEI) at this prompt:');
            if (globals.api_key == null) globals.api_key = '';
            localStorage.api_key = api_key;
            if (typeof api_key == 'undefined' || api_key == '') {
                showLoginButton();
            } else {
                showLogoutButton();
            }
        }, 0);
    }


}(this));