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
        'Desarrollador frontend senior, diseñador de interfaces y entrenador de ajedrez, con seis años de experiencia en ',
      metal: 'React',
      after: ', Next.js y TypeScript.',
    },
    second:
      'Convierto necesidades de negocio en productos: diseño la interfaz, escribo el código y lo llevo a producción en salud, educación, música y turismo.',
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
