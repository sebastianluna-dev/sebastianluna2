// Blue, the chat about Sebastian's work (phase 6): launcher and panel.
export const blue = {
  /** Fixed name of the launcher button (its state is `aria-expanded`). */
  launcher: 'Hablar con Blue',
  title: 'Blue',
  subtitle: 'Conoce el trabajo de Sebastian',
  /** First message, shown locally (never sent to the model). */
  greeting:
    'Hola, soy Blue. Conozco los proyectos de Sebastian, su experiencia y su forma de trabajar. ¿Qué te gustaría saber?',
  logLabel: 'Conversación con Blue',
  /** Spoken before each message of the visitor and of Blue. */
  speakerYou: 'Tú:',
  speakerBlue: 'Blue:',
  suggestionsLabel: 'Empieza por aquí',
  suggestions: [
    '¿Qué proyectos ha construido Sebastian?',
    '¿Qué hizo en 365 Días de Ajedrez?',
    '¿Con qué tecnologías trabaja?',
    '¿Está disponible para una vacante?',
  ],
  inputLabel: 'Tu pregunta para Blue',
  send: 'Enviar',
  stop: 'Detener la respuesta',
  close: 'Cerrar el chat',
  newChat: 'Nueva conversación',
  thinking: 'Pensando…',
  stopped: 'Respuesta interrumpida.',
  counter: '{count} de {max} caracteres',
  tooLong: 'Tu pregunta pasa de {max} caracteres; acórtala para enviarla.',
  retry: 'Reintentar',
  errors: {
    upstream: 'No pude responder esta vez. Inténtalo de nuevo.',
    offline: 'No hay conexión. Revisa tu red e inténtalo de nuevo.',
    /** `{wait}` is a relative time ("dentro de 2 minutos"). */
    rateLimited: 'Hiciste muchas preguntas seguidas. Podrás preguntar de nuevo {wait}.',
    rateLimitedSoon: 'Hiciste muchas preguntas seguidas. Espera un poco e inténtalo de nuevo.',
    budget:
      'Blue llegó a su límite de respuestas por hoy. Puedes escribirle a Sebastian al correo {email}.',
    notConfigured:
      'Blue no está disponible ahora mismo. Puedes escribirle a Sebastian al correo {email}.',
    tooLarge: 'La conversación ya es muy larga. Empieza una nueva para seguir preguntando.',
  },
};

/**
 * Text the chat endpoint writes into an answer itself (`src/lib/blue/handler.ts`); the panel renders
 * it like any answer (light Markdown). A separate export, so the panel's chunk does not carry it;
 * the catalogue serves it as `blue.server`.
 */
export const blueServer = {
  /** Sent when the model declines (`stop_reason: refusal`); Haiku 5.5 has no server fallback. */
  refusal:
    'Prefiero no responder eso. Puedo contarte sobre los proyectos, la experiencia y la forma de trabajar de Sebastian.',
  /** Sent when the model ends without any visible text. */
  empty: 'No tengo una respuesta para eso. Si quieres, escríbele a Sebastian al correo {email}.',
  /** The whole answer of the local demo mode (`astro dev` without `ANTHROPIC_API_KEY`). */
  demo: [
    '**Modo de demostración local.** Esta respuesta no viene del modelo: el servidor de desarrollo no tiene `ANTHROPIC_API_KEY`, así que Blue repite este texto con el mismo protocolo.',
    '',
    '- Llega en fragmentos, como una respuesta real.',
    '- Termina con el evento `done`.',
    '',
    'Un enlace interno de ejemplo: [el resultado de Reto MD](/works/reto-md#outcome).',
  ].join('\n'),
};
