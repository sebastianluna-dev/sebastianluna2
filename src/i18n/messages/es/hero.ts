// Home hero: selected-name scene, bio, CTAs and the Blue tip.
export const hero = {
  avatar: {
    /** Name of the avatar link (LinkedIn profile). */
    label: 'Perfil de LinkedIn de Sebastian Luna (se abre en otra pestaña)',
  },
  intro: 'Soy',
  name: 'Sebastian Luna',
  /** Line under the selected name; the scene splits it into words. */
  title: 'Diseño y construyo productos web',
  menu: {
    label: 'Acciones sobre el nombre',
    /** Visible text of the copy action; `copyName` is its accessible name (it copies the email). */
    copy: 'Copiar',
    copyName: 'Copiar email',
    openCv: 'Abrir CV',
    askBlue: 'Preguntar a Blue',
    /** Read by the live region after a successful copy. */
    copied: 'Email copiado',
  },
  bio: {
    /** First paragraph; `metal` is the word painted with the liquid-metal gradient. */
    first: {
      before:
        'Product engineer full-stack, diseñador de interfaces y entrenador de ajedrez, con más de seis años en ',
      metal: 'React',
      after: ', Next.js, Node.js y PostgreSQL.',
    },
    second:
      'Llevo productos de la idea a producción: hablo con quien los usará, diseño la interfaz y programo backend y frontend, con agentes de IA bajo mi dirección.',
  },
  ctas: {
    contact: 'Contacto',
    works: 'Trabajos',
  },
  tip: {
    before: 'Pulsa',
    after: 'para hablar con Blue',
    /** Spoken names of the keys; the keycaps show symbols. */
    keys: {
      command: 'Comando',
      option: 'Opción',
      ctrl: 'Control',
      alt: 'Alt',
      plus: 'más',
      slash: 'barra',
    },
    /** Legends of the keycaps outside Apple platforms, where the shortcut is Ctrl + Alt + /. */
    caps: {
      ctrl: 'Ctrl',
      alt: 'Alt',
    },
  },
};
