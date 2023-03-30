(function (globals) {
    'use strict';


    // Interact with OpenAI API
    async function openaiChat(message, chatlog, model, temperature, top_p, user_role, ui) {
        if (!regenerateLastAnswer && !message) return;
        if (receiving) return;
        receiving = true;

        if (user_role === 'assistant') {
            const prompt_msg = {
                role: user_role,
                content: message
            };
            chatlog.addMessage(prompt_msg);
            ui.chatlogEl.update();
            receiving = false;
            return;
        }

        ui.submitBtn.innerHTML = message_stop;
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
            ui.chatlogEl.update();
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
                if (value_str.startsWith('{')) {
                    const data = JSON.parse(value_str);
                    if ('error' in data) throw new Error(data.error.message);
                }
                const chunks = value_str.split('\n');
                let content = '';
                chunks.forEach(chunk => {
                    if (chunk.startsWith('data: ')) chunk = chunk.substring(6)
                    if (chunk === '' || chunk === '[DONE]') return;
                    const data = JSON.parse(chunk);
                    if ('error' in data) throw new Error(data.error.message);
                    content += data.choices[0].delta.content || '';
                });
                
                if (!entryCreated) {
                    const lastMessage = chatlog.addMessage({ role: 'assistant', content });
                    entryCreated = true;
                    lastMessage.metadata = { model, temperature, top_p };
                } else {
                    const lastMessage = chatlog.getLastMessage();
                    lastMessage.value.content += content;
                    lastMessage.cache = null;
                }
                ui.chatlogEl.update();
            }
        } catch (error) {
            console.error(error);
            if (('' + error).startsWith('AbortError: ')) {
                controller = new AbortController();
                return;
            }
            if (('' + error).startsWith("Error: You didn't provide an API key.") || ('' + error).startsWith('Error: Incorrect API key provided:')) {
                getApiKey();
            }

            if (!entryCreated) {
                chatlog.addMessage({ role: 'assistant', content: '' + error });
                entryCreated = true;
            } else {
                chatlog.getLastMessage().value.content += `\n\n${error}`;
            }
        } finally {
            receiving = false;
            ui.submitBtn.innerHTML = message_submit;
            if (entryCreated) {
                chatlog.getLastMessage().metadata = { model, temperature, top_p };
            }

            ui.chatlogEl.update();
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
    // ChatApp.prototype.setUpEventListeners = () => {
    globals.setUpEventListeners = (chatlog, ui) => {

        ui.submitBtn.addEventListener('click', () => {
            if (receiving) {
                controller.abort();
                return;
            }
            openaiChat(ui.messageEl.value, chatlog, document.querySelector('input[name="model"]:checked').value, Number(ui.temperatureEl.value), Number(ui.topPEl.value), document.querySelector('input[name="user_role"]:checked').value, ui);
            ui.messageEl.value = '';
            ui.messageEl.style.height = 'auto';
        });

        ui.messageEl.addEventListener('keydown', (event) => {
            if (event.keyCode === 13 && (event.shiftKey || event.ctrlKey || event.altKey)) {
                event.preventDefault();
                ui.submitBtn.click();
            }
        });

        ui.messageEl.addEventListener('input', function () {
            this.style.height = 'auto';
            let height = this.scrollHeight - parseInt(getComputedStyle(this).paddingTop) - parseInt(getComputedStyle(this).paddingBottom);
            if (height > window.innerHeight / 2) {
                height = window.innerHeight / 2;
                this.style.overflowY = 'scroll';
            } else {
                this.style.overflowY = 'hidden';
            }
            if (height > this.clientHeight) this.style.height = `${height}px`;
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                controller.abort();
            }
        });

        ui.newChatBtn.addEventListener('click', () => {
            if (receiving) {
                controller.abort();
                return;
            }
            ui.messageEl.value = start_message;
            ui.messageEl.style.height = 'auto';
            chatlog.rootAlternatives = null;
            chatlog.addMessage({ role: 'system', content: first_prompt });
            ui.chatlogEl.update();
        });

        ui.saveChatBtn.addEventListener('click', () => {
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

        ui.loadChatBtn.addEventListener('click', () => {
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
                    ui.chatlogEl.update();
                });

                reader.readAsText(file);
                document.body.removeChild(input);
            });

            input.click();
        });

        ui.temperatureValueEl.textContent = ui.temperatureEl.value;
        ui.temperatureEl.addEventListener('input', () => {
            ui.temperatureValueEl.textContent = ui.temperatureEl.value;
        });

        ui.topPValueEl.textContent = ui.topPEl.value;
        ui.topPEl.addEventListener('input', () => {
            ui.topPValueEl.textContent = ui.topPEl.value;
        });

        ui.settingsBtn.addEventListener('click', () => {
            ui.settingsEl.classList.toggle('open');
        });

        ui.loginBtn.addEventListener('click', () => {
            getApiKey();
        });

        ui.logoutBtn.addEventListener('click', () => {
            try {
                localStorage.removeItem('api_key');
            } catch (error) {
                console.error(error);
            }
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
        // If no or an empty API key has been set, then try to get one from localStorage
        if (typeof api_key == 'undefined' || api_key == '') {
            try {
                globals.api_key = localStorage.api_key;
            } catch (error) {
                console.error(error);
            }
            if (typeof api_key != 'undefined' && api_key != '') {
                showLogoutButton();
                return;
            }
        }
        showLoginButton();

        // If any API key has been set, or localStorage was empty, ask the user for a new API key
        setTimeout(() => {
            globals.api_key = prompt('Enter an OpenAI API key:');
            if (globals.api_key == null) globals.api_key = '';
            try {
                localStorage.api_key = api_key;
            } catch (error) {
                console.error(error);
            }
            if (typeof api_key == 'undefined' || api_key == '') {
                showLoginButton();
            } else {
                showLogoutButton();
            }
        }, 0);
    }


}(this));