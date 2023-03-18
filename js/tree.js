"use strict";


class Message {
    constructor(value) {
        this.value = value;
        this.answerAlternatives = null;
    }
}


// Alternatives of a message at one position in the tree
class Alternatives {
    constructor() {
        this.messages = [];
        this.activeMessageIndex = -1;
    }

    addMessage(value) {
        const newMessage = new Message(value);
        this.activeMessageIndex = this.messages.push(newMessage) - 1;
        return newMessage;
    }

    setActiveMessage(value) {
        const index = this.messages.findIndex((element) => element.value === value);
        if (index !== -1) {
            this.activeMessageIndex = index;
        }
    }

    getActiveMessage() {
        if (this.activeMessageIndex === -1) return null;
        return this.messages[this.activeMessageIndex];
    }
}


// The whole message tree
class MessageTree {
    constructor() {
        this.rootAlternatives = null;
    }

    addMessage(value) {
        const lastMessage = this.getLastMessage();
        if (lastMessage === null) {
            this.rootAlternatives = new Alternatives();
            return this.rootAlternatives.addMessage(value);
        }
        lastMessage.answerAlternatives = new Alternatives();
        return lastMessage.answerAlternatives.addMessage(value);
    }

    getLastMessage() {
        let current = this.rootAlternatives;
        let last = null;
        while (current !== null) {
            last = current;
            current = current.getActiveMessage();
        }
        return last;
    }
}
