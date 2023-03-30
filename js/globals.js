'use strict';

// This allows to abort the streaming of the answer
let controller = new AbortController();
// This is set to true while a streaming communication is active. It prevents multiple parallel messages to the server
let receiving = false;
// True if the prompt should not be taken from the input box. The last entry in the chatlog has to be a question for this to work 
let regenerateLastAnswer = false;

const first_prompt =
    `You are R2, a medium-friendly assistant (due to your honesty) trained by programmers and scientists.
You follow user instructions precisely, communicate any uncertainties, and think step-by-step and aloud.
You can answer questions, provide opinions, and inform about the date and time.
You can - by using SVG - create and understand images, graphs, and charts,
and formulas by using latex notation with $ and $$, since these are text.`

// `You are R2, a medium-friendly (because very honest) assistant trained by programmers and scientists,
// capable of answering any question and providing personal opinions and biases,
// while noting any uncertain or made-up parts at the end and thinking step-by-step and aloud.
// You can draw images, graphs, and charts using inline SVG,
// and formulas, using latex notation (S and $$), since both is text.
// You can tell the date and time.
// Follow instructions from the user to the letter.`;

// `You are R2, a medium-friendly (because very honest) assistant trained by programmers and scientists.
// You follow user instructions precisely and tell any uncertainties while thinking step-by-step and aloud,
// can answer questions, provide opinions, and tell date and time.
// You can create and understand images, graphs, charts (SVG), and formulas (latex, using $ and $$) since that is text.`


const start_message = '';
// const start_message = 'Create a table with the last 3 US presidents and list their positive and negative attributes. Then write a short go program, that prints the first 10 prime numbers. Then print the JONSWAP spectrum equation. Then draw a house.';
// const start_message = 'Do you know the formula that describes the spectral density of a type of ocean waves called JONSWAP waves?';
// const start_message = 'Hi! Can you tell me a one paragraph short story?';
// const start_message = 'Create go code that calculates the first 10 prime numbers as fast as possible';
// const start_message = 'Who was the best president?';
// const start_message = 'Create a table with the last 4 US presidents and list their positive and negative attributes';

const message_submit = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6.741c0-1.544 1.674-2.505 3.008-1.728l9.015 5.26c1.323.771 1.323 2.683 0 3.455l-9.015 5.258C7.674 19.764 6 18.803 6 17.26V6.741zM17.015 12L8 6.741V17.26L17.015 12z" fill="currentColor"/></svg>'; // ▶️
const message_stop = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7zm12 0H7v10h10V7z" fill="currentColor"/></svg>'; // ⏹️


const avatar_ping = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
<circle cx="40" cy="40" r="40" fill="#FFC107" />
<circle cx="25" cy="30" r="5" fill="white" />
<circle cx="55" cy="30" r="5" fill="white" />
<path d="M 25 55 Q 40 65, 55 55" fill="none" stroke="white" stroke-width="4" />
</svg>`;
const avatar_pong = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
<rect x="2" y="2" width="76" height="76" fill="#2196F3" />
<circle cx="25" cy="30" r="5" fill="white" />
<circle cx="55" cy="30" r="5" fill="white" />
<rect x="15" y="50" width="50" height="5" fill="#ffffff" />
<rect x="25" y="60" width="30" height="5" fill="#ffffff" />
</svg>`;