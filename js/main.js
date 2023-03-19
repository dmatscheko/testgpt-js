(function (globals) {
    "use strict";


    document.addEventListener("DOMContentLoaded", () => {
        // Semi global chatlog
        // Each entry looks like this: { active, { message, next }, { message, next }, ... }
        let chatlog = new MessageTree();

        const chatlogEl = new Chatbox(chatlog,
            document.getElementById("chat"),
            new ClipBadge({ autoRun: false })
        );
        const messageEl = document.getElementById("message");
        const submitBtn = document.getElementById("submit");
        const newChatBtn = document.getElementById("new_chat");
        const temperatureEl = document.getElementById("temperature");
        const topPEl = document.getElementById("top_p");

        // Set up event listeners and initialize chat
        setUpEventListeners(chatlog, { chatlogEl, messageEl, submitBtn, newChatBtn, temperatureEl, topPEl });

        // Get API key if it is not defined already
        if (typeof api_key == 'undefined') {
            globals.api_key = prompt('Either create the file\njs/api_key.js\nwhere you put the OpenAI API key like this:\nconst api_key = "sk-6AQdmaPySsomeW2randomCdmaPIkey0HdmaEI";\n\nOr always enter the API key (only the sk-6AQdmaPySsomeW2randomCdmaPIkey0HdmaEI) at this prompt:');
            if (globals.api_key == null) globals.api_key = '';
        }

        // Start new chat
        newChatBtn.click();
    });


}((1, eval)('this')));