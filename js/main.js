(function (globals) {
    "use strict";


    document.addEventListener("DOMContentLoaded", () => {
        const chatlog = new Chatlog();
        const chatlogEl = new Chatbox(chatlog, document.getElementById("chat"));
        const messageEl = document.getElementById("message");
        const submitBtn = document.getElementById("submit-btn");
        const newChatBtn = document.getElementById("new_chat-btn");
        const saveChatBtn = document.getElementById("save_chat-btn");
        const loadChatBtn = document.getElementById("load_chat-btn");
        const temperatureEl = document.getElementById("temperature");
        const topPEl = document.getElementById("top_p");

        // Set up event listeners and initialize chat
        setUpEventListeners(chatlog, { chatlogEl, messageEl, submitBtn, newChatBtn, saveChatBtn, loadChatBtn, temperatureEl, topPEl });

        // Get API key
        getApiKey();

        // Load old chat
        try {
            const data = JSON.parse(localStorage.chatlog);
            chatlog.load(data.rootAlternatives);
            chatlogEl.update(chatlog);
        } catch (error) {
            console.error(error);
        }

        if (chatlog.rootAlternatives == null) {
            // Start new chat, if no old chat could be loaded
            newChatBtn.click();
        }
    });


}(this));