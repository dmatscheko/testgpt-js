(function (globals) {
    "use strict";


    document.addEventListener("DOMContentLoaded", () => {
        const chatlog = new Chatlog();
        const ui = {
            chatlogEl: new Chatbox(chatlog, document.getElementById("chat")),
            messageEl: document.getElementById("message-inp"),
            submitBtn: document.getElementById("submit-btn"),
            newChatBtn: document.getElementById("new_chat-btn"),
            saveChatBtn: document.getElementById("save_chat-btn"),
            loadChatBtn: document.getElementById("load_chat-btn"),
            settingsBtn: document.getElementById('settings-btn'),
            settingsEl: document.getElementById('settings'),
            temperatureEl: document.getElementById("temperature"),
            temperatureValueEl: document.getElementById('temperature-value'),
            topPEl: document.getElementById("top_p"),
            topPValueEl: document.getElementById('top_p-value'),
            loginBtn: document.getElementById('login-btn'),
            logoutBtn: document.getElementById('logout-btn')
        };

        // Set up event listeners and initialize chat
        setUpEventListeners(chatlog, ui);

        // Get API key
        getApiKey();

        // Load old chat
        try {
            const data = JSON.parse(localStorage.chatlog);
            chatlog.load(data.rootAlternatives);
            ui.chatlogEl.update();
        } catch (error) {
            console.error(error);
        }

        if (chatlog.rootAlternatives == null) {
            // Start new chat, if no old chat could be loaded
            newChatBtn.click();
        }
    });


}(this));