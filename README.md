# sebastianluna2

Sebastian Luna's portfolio: a home page and one case study per project, in Spanish and English, with live demos of each project's UI inside its case study and "Blue", a chat that answers questions about Sebastian's work.

Built with Astro 7 and React islands, deployed on Vercel. It will replace www.sebastianluna.dev.

## Getting started

Requires Node 22.23.4 or newer (`.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
```

| Script            | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Development server                                             |
| `npm run build`   | Static build plus the chat function (`.vercel/output`)         |
| `npm run preview` | Serves the build; use it for layout and performance checks     |
| `npm run check`   | Types for `.astro`, MDX frontmatter and the message catalogues |
| `npm run lint`    | ESLint (TypeScript, Astro, jsx-a11y, React hooks)              |
| `npm test`        | Vitest, Node environment                                       |
| `npm run format`  | Prettier                                                       |

Copy `.env.example` to `.env` to try the chat locally.

## Routes

| Spanish         | English            | Source                                                            |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| `/`             | `/en`              | `src/pages/index.astro`, `src/pages/en/index.astro`               |
| `/works/<slug>` | `/en/works/<slug>` | `src/pages/works/[slug].astro`, `src/pages/en/works/[slug].astro` |
| `/api/chat`     |                    | `src/pages/api/chat.ts`, the only on-demand route                 |

## Structure

See `AGENTS.md` for the conventions, in particular the split between portfolio components (`src/components/portfolio`) and project demos (`src/demos`).
