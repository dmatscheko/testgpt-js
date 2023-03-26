"use strict";


class Message {
    constructor(value) {
        this.value = value;
        this.metadata = null;
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
        const current = this.getActiveMessage();
        if (current !== null && current.value === null) {
            current.value = value;
            return current;
        }
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

    next() {
        if (this.activeMessageIndex === -1) return null;
        this.activeMessageIndex++;
        if (this.activeMessageIndex > this.messages.length - 1) this.activeMessageIndex = 0;
        return this.messages[this.activeMessageIndex];
    }

    prev() {
        if (this.activeMessageIndex === -1) return null;
        this.activeMessageIndex--;
        if (this.activeMessageIndex < 0) this.activeMessageIndex = this.messages.length - 1;
        return this.messages[this.activeMessageIndex];
    }
}


// Chatlog is a whole tree of messages
class Chatlog {
    constructor() {
        this.rootAlternatives = null;
    }

    addMessage(value) {
        const lastMessage = this.getLastMessage();
        if (lastMessage === null) {
            this.rootAlternatives = new Alternatives();
            return this.rootAlternatives.addMessage(value);
        }
        if (lastMessage.value === null) {
            lastMessage.value = value;
            return lastMessage;
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
        n = parseInt(n);
        let alternative = getNthAlternatives(n);
        if (alternative === null) return null;
        return alternative.getActiveMessage();
    }

    getNthAlternatives(n) {
        n = parseInt(n);
        let pos = 0;
        let current = this.rootAlternatives;
        while (current !== null) {
            if (pos === n) return current;
            const activeMessage = current.getActiveMessage();
            if (activeMessage === null || activeMessage.answerAlternatives === null) break;
            current = activeMessage.answerAlternatives;
            pos++;
        }
        return null;
    }

    getLastAlternatives() {
        let current = this.rootAlternatives;
        let last = current;
        while (current !== null) {
            last = current;
            const activeMessage = current.getActiveMessage();
            if (activeMessage === null || activeMessage.answerAlternatives === null) break;
            current = activeMessage.answerAlternatives;
        }
        return last;
    }

    // getActiveMessages() {
    //     let result = [];
    //     // Trace the active path through the chatlog
    //     let message = this.getFirstMessage();
    //     while (message !== null) {
    //         result.push(message);
    //         if (message.value === null) break;
    //         message = message.getAnswerMessage();
    //     }
    //     return result;
    // }

    getActiveMessageValues() {
        let result = [];
        // Trace the active path through the chatlog
        let message = this.getFirstMessage();
        while (message !== null && message.value !== null) {
            result.push(message.value);
            message = message.getAnswerMessage();
        }
        return result;
    }

    load(alternative) {
        let msgcount = 0;
        const buildAlternatives = (parsedAlt) => {
            if (!parsedAlt) return null;

            const alt = new Alternatives();
            alt.activeMessageIndex = parsedAlt.activeMessageIndex;

            for (const parsedMessage of parsedAlt.messages) {
                const msg = new Message(parsedMessage.value);
                msg.metadata = parsedMessage.metadata;
                msg.answerAlternatives = buildAlternatives(parsedMessage.answerAlternatives);
                alt.messages.push(msg);
                msgcount++;
            }

            return alt;
        };

        this.rootAlternatives = buildAlternatives(alternative);

        // if (msgcount % 2 !== 1) {
        //     this.addMessage({ role: 'assistant', content: '🤔...' });
        // }
    }
}
