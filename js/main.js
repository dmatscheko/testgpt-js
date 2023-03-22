(function (globals) {
    "use strict";


    globals.getApiKey = () => {
        setTimeout(()=>{
            globals.api_key = prompt('Either create the file\njs/api_key.js\nwhere you put the OpenAI API key like this:\nconst api_key = "sk-6AQdmaPySsomeW2randomCdmaPIkey0HdmaEI";\n\nOr always enter the API key (only the sk-6AQdmaPySsomeW2randomCdmaPIkey0HdmaEI) at this prompt:');
            if (globals.api_key == null) globals.api_key = '';
            localStorage.api_key = api_key;
        }, 0);
    }


    document.addEventListener("DOMContentLoaded", () => {
        const chatlog = new MessageTree();
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

        globals.api_key = localStorage.api_key;

        // Get API key if it is not defined already
        if (api_key == '') {
            getApiKey();
        }

        // Start new chat
        newChatBtn.click();
    });


}(this));