import type { blue as reference, blueServer as serverReference } from '../es/blue';

export const blue = {
  launcher: 'Chat with Blue',
  title: 'Blue',
  subtitle: 'Ask about Sebastian’s work',
  greeting:
    'Hi, I’m Blue. I know Sebastian’s projects, his experience and the way he works. What would you like to know?',
  logLabel: 'Conversation with Blue',
  speakerYou: 'You:',
  speakerBlue: 'Blue:',
  suggestionsLabel: 'Start here',
  suggestions: [
    'What has Sebastian built?',
    'What did he do on 365 Días de Ajedrez?',
    'Which technologies does he work with?',
    'Is he open to a new role?',
  ],
  inputLabel: 'Your question for Blue',
  send: 'Send',
  stop: 'Stop the answer',
  close: 'Close the chat',
  newChat: 'New conversation',
  thinking: 'Thinking…',
  stopped: 'Answer stopped.',
  counter: '{count} of {max} characters',
  tooLong: 'Your question is over {max} characters; shorten it to send it.',
  retry: 'Try again',
  errors: {
    upstream: 'I couldn’t answer this time. Please try again.',
    offline: 'You seem to be offline. Check your connection and try again.',
    rateLimited: 'That was a lot of questions in a row. You can ask again {wait}.',
    rateLimitedSoon: 'That was a lot of questions in a row. Wait a moment and try again.',
    budget: 'Blue has reached its limit for today. You can write to Sebastian at {email}.',
    notConfigured: 'Blue isn’t available right now. You can write to Sebastian at {email}.',
    tooLarge: 'This conversation is getting long. Start a new one to keep asking.',
  },
} satisfies typeof reference;

export const blueServer = {
  refusal:
    'I’d rather not answer that. I can tell you about Sebastian’s projects, experience, and the way he works.',
  empty: 'I don’t have an answer for that. If you like, write to Sebastian at {email}.',
  demo: [
    '**Local demo mode.** This answer does not come from the model: the development server has no `ANTHROPIC_API_KEY`, so Blue repeats this text over the same protocol.',
    '',
    '- It arrives in fragments, like a real answer.',
    '- It ends with the `done` event.',
    '',
    'A sample internal link: [the outcome of Reto MD](/en/works/reto-md#outcome).',
  ].join('\n'),
} satisfies typeof serverReference;
