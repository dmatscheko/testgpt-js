"use strict";


class Chatbox {

    constructor(container, codebadge) {
        this.container = container;
        this.codebadge = codebadge;
    }


    // Updates the HTML inside the chat window
    update(messages) {
        const should_scroll_down =
            this.container.parentElement.scrollHeight - this.container.parentElement.clientHeight <=
            this.container.parentElement.scrollTop + 5;

        this.container.innerHTML = '';
        for (const message of messages) {
            const left = document.createElement('div');
            left.classList.add('right');
            const right = document.createElement('div');
            right.classList.add('left');
            const row = document.createElement('div');
            row.classList.add('row');
            row.appendChild(left);
            row.appendChild(right);
            [left.innerHTML, right.innerHTML] = message;
            this.container.appendChild(row);
        }
        if (this.codebadge) this.codebadge.addTo(this.container);

        if (should_scroll_down) {
            this.container.parentElement.scrollTop = this.container.parentElement.scrollHeight;
        }
    }

}
