"use strict";

// TODO: merge message into Alternatives (an Alternatives IS an array of messages with each element a value and again an Alternatives):


class Message {
    constructor(value) {
        this.value = value;
        this.answerAlternatives = null;
    }

    getAnswerMessage() {
        if (this.answerAlternatives === null) return null;
        return this.answerAlternatives.getActiveMessage();
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

    getFirstMessage() {
        if (this.rootAlternatives === null) return null;
        return this.rootAlternatives.getActiveMessage();
    }

    getLastMessage() {
        const lastAlternatives = this.getLastAlternatives();
        if (lastAlternatives === null) return null;
        return lastAlternatives.getActiveMessage();
    }

    getNthMessage(n) {
        let last = getNthAlternatives(n);
        if (last === null) return;
        return last.getActiveMessage();
    }

    getNthAlternatives(n) {
        let pos = 0;
        let current = this.rootAlternatives;
        let last = null;
        while (current !== null || pos === n) {
            last = current;
            const activeMessage = current.getActiveMessage();
            if (activeMessage === null) break;
            current = activeMessage.answerAlternatives;
            pos++;
        }
        return last;
    }

    getLastAlternatives() {
        let current = this.rootAlternatives;
        let last = null;
        while (current !== null) {
            last = current;
            const activeMessage = current.getActiveMessage();
            if (activeMessage === null) break;
            current = activeMessage.answerAlternatives;
        }
        return last;
    }

    getActiveMessages() {
        let result = [];
        // Trace the active path through the chatlog
        let message = this.getFirstMessage();
        while (message !== null) {
            result.push(message.value);
            message = message.getAnswerMessage();
        }
        return result;
    }
}
