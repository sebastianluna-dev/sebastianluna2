import type { blue as reference } from '../es/blue';

export const blue = {
  launcher: 'Chat with Blue',
  title: 'Blue',
  subtitle: 'Ask me about Sebastian’s work',
  greeting:
    'Hi, I’m Blue. I can tell you about Sebastian’s projects, experience, and the way he works.',
  logLabel: 'Conversation',
  suggestionsLabel: 'Suggestions',
  suggestions: [
    'What projects has he worked on?',
    'Which technologies does he use?',
    'Is he open to a new role?',
  ],
  inputLabel: 'Type your question',
  send: 'Send',
  close: 'Close',
  typing: 'Typing…',
  error: 'I could not answer. Please try again.',
  rateLimited: 'Too many questions in a row. Try again in a few minutes.',
} satisfies typeof reference;
