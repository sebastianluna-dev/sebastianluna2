# sebastianluna2

Sebastian Luna's portfolio: a home page and one case study per project, in Spanish and English, with live demos of each project's UI inside its case study and "Blue", a chat that answers questions about Sebastian's work.

Built with Astro 7 and React islands, deployed on Vercel. It will replace www.sebastianluna.dev.

## Getting started

Requires Node 22.23.4 or newer (`.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:4321
```

| Script            | What it does                                                                   |
| ----------------- | ------------------------------------------------------------------------------ |
| `npm run dev`     | Development server                                                             |
| `npm run build`   | Static build plus the chat function (`.vercel/output`)                         |
| `npm run preview` | Serves the static build (`scripts/preview.mjs`); layout and performance checks |
| `npm run check`   | Types for `.astro`, MDX frontmatter and the message catalogues                 |
| `npm run lint`    | ESLint (TypeScript, Astro, jsx-a11y, React hooks)                              |
| `npm test`        | Vitest, Node environment                                                       |
| `npm run format`  | Prettier                                                                       |

Copy `.env.example` to `.env` to try the chat locally.

`@astrojs/vercel` has no preview entrypoint, so `npm run preview` runs `scripts/preview.mjs`: a small server for `.vercel/output/static` that mirrors the Vercel routes (308 to the URL without a trailing slash, immutable `/_astro`, brotli/gzip). It does not serve `/api/chat`. Pass `--port <n>` to change the port (default 4321).

## Routes

| Spanish         | English            | Source                                                            |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| `/`             | `/en`              | `src/pages/index.astro`, `src/pages/en/index.astro`               |
| `/works/<slug>` | `/en/works/<slug>` | `src/pages/works/[slug].astro`, `src/pages/en/works/[slug].astro` |
| `/api/chat`     |                    | `src/pages/api/chat.ts`, the only on-demand route                 |

## Structure

See `AGENTS.md` for the conventions, in particular the split between portfolio components (`src/components/portfolio`) and project demos (`src/demos`).

| Path                                   | What lives there                                                                                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                           | Thin routes: they pick the locale and render a view                                                                                                                                                                                          |
| `src/views/HomeView.astro`             | The home of either language: hero, technology wall, works                                                                                                                                                                                    |
| `src/layouts/BaseLayout.astro`         | `<html>`, head (canonical, hreflang, Open Graph, font preloads), theme bootstrap, `<ClientRouter/>`, header, footer                                                                                                                          |
| `src/components/portfolio/`            | The site: `shell/`, `home/`, `theme/`, `ui/` (`case/` and `blue/` come later)                                                                                                                                                                |
| `src/components/motion/`               | Page appear engine (WAAPI with springs precomputed to `linear()`) and `presets.ts`, the home of every timing and spring                                                                                                                      |
| `src/styles/`                          | `layers.css` (layer order, inlined first), `reset.css`, `fonts.css`, `tokens.css` (`--pf-*`, light and dark), `portfolio.css`, `view-transitions.css` (shared cover box)                                                                     |
| `src/i18n/`                            | `locales.ts`, `t.ts` (`getMessages`, `createT`, `format`) and `messages/{es,en}/<namespace>.ts`                                                                                                                                              |
| `src/content/works/{es,en}/<slug>.mdx` | One case study per project and language (schema in `src/content.config.ts`)                                                                                                                                                                  |
| `src/data/`                            | `profile.ts` (emails, links, CV paths, portrait), `technologies.ts` (logo wall, from `simple-icons`) and `features.ts` (flags of later phases: Blue)                                                                                         |
| `src/lib/`                             | Pure, tested helpers: `i18n-paths.ts`, `works.ts`, the spring solver and `linear()` generator (`spring.ts`, `spring-to-linear.ts`), `motion-policy.ts`, and the logic of the pill nav, theme cord, star field, hero objects and footer scene |
| `src/assets/`                          | Fonts (with their OFL licences), the portrait and the project captures                                                                                                                                                                       |
| `public/cv/{es,en}/`                   | The CV, one PDF per language                                                                                                                                                                                                                 |
| `scripts/`                             | `preview.mjs` (serves the build) and `gen-wordmarks.mjs` (regenerates the outlined wordmarks of the technology wall)                                                                                                                         |

## Content

- **Copy**: every visible string lives in `src/i18n/messages/es/<namespace>.ts` (the typed reference) and its English twin `en/<namespace>.ts`, which `satisfies` it. Namespaces: `common`, `nav`, `hero`, `logos`, `works`, `footer`, `theme`, `notFound`, `blue`, `case`. `t.test.ts` checks that both languages have the same keys and placeholders.
- **Projects**: `src/content/works/<locale>/<slug>.mdx`. The frontmatter holds the card and case metadata (`title`, `kicker`, `summary`, `role`, `service`, `tools`, `year`, `url`, `order`, `cover`, optional `zones` for the three hover images, `sections`, `demos`, `draft`); the body is the case study. A new project needs both languages with the same `order` (`works.test.ts` enforces it). Images go in `src/assets/works/<slug>/` and are referenced by relative path.
- **Profile**: emails, LinkedIn, GitHub and the CV paths in `src/data/profile.ts`; replace the PDFs in `public/cv/` keeping their names.
- **Hero objects**: own SVG illustrations in `src/assets/hero-objects/*.svg`, loaded with `?url` imports in `HeroObjects.astro`; swap them for PNGs by changing those imports. The click-swap pool is those nine ids, and each id has its shadow tint in the component CSS (`[data-object]`).
- **Technology wall**: `src/data/technologies.ts` (icons from `simple-icons`, CC0). Five of them are wordmarks, the icon plus the name in Geist (OFL) converted to outlines in `metal-marks/wordmarks.ts`; regenerate it with `scripts/gen-wordmarks.mjs` (instructions at the top of the file). A new technology also needs its entry in `MARK_STYLES` (`marks.test.ts` checks it). The grid is laid out for 11 marks (rows of 4/3/4).

## Theme and fonts

- The theme is stored under the `localStorage` key `pf-theme` (`light` or `dark`; absent follows the system). `theme.inline.ts` runs render-blocking in `<head>`, sets `data-theme` and swaps `no-js` for `js` before the first paint, stamps the incoming document on `astro:before-swap` (and again after the swap). Without JavaScript, dark follows `prefers-color-scheme`. If no page module marks `<html>` with `pf-ready` (`@/lib/scripts-ready`, done by the appear engine) within 4 s, it puts `no-js` back, so a failed module load shows the no-JS render instead of hidden content.
- Fonts are self-hosted with manual `@font-face` rules in `src/styles/fonts.css`, because the Astro Fonts API does not take `size-adjust` or `*-override` per face: Geist variable (npm `geist`, keeps the `ss03`/`ss08` sets) and "Serif Text", Noto Serif variable pinned to `wdth` 97.5 with the metrics of the reference serif. Their metric fallbacks (Arial, Georgia) are width-matched; the numbers are in the file.

## Motion

- **Page appears** (`src/components/motion/`): wrap a block in `<AppearMotion appear={HOME_APPEAR.bio}>` (or `preset` + `delay` in seconds). It renders `data-appear`, `data-appear-delay` (seconds) and `data-appear-from`; `data-appear-stagger="section"` on an ancestor makes the delays relative to that group instead of the page. `appear.client.ts` (started by `BaseLayout` on every page) plays each block once when it enters the viewport (IntersectionObserver, threshold 0), ends it at once on `focusin`, and with reduced motion fades everything in 150 ms. The element's own CSS must be the preset's **end** state: that is what shows without JavaScript and with reduced motion; the start state only applies under `html.js`. Put the appear on a wrapper when the content animates `scale`/`translate`/`rotate` itself, because the end values stay inline. React islands use `useAppear()` with the same presets. Slots: `HOME_APPEAR`, `CASE_APPEAR`, `BLUE_LAUNCHER_APPEAR`; the `html.js` start-state rules live in `AppearMotion.astro`, so a page that only uses `useAppear()` must also render one `AppearMotion`.
- **Timings**: every duration, easing and spring lives in `src/components/motion/presets.ts` (appear presets, `CHROME_SPRINGS`, `HERO_SCENE`, `HERO_MENU`, `HERO_OBJECT_BUMP`/`SWAP`, `AQUA_SPRINGS`/`AQUA_MAGNETIC`, `FOOTER_SCENE`) or in the `--pf-*` tokens for CSS. Each value cites its row of the animation inventory (`SH-`, `HE-`, `HO-`, `TE-`, `EF-`, `RT-`…).
- **Route transitions**: `<ClientRouter/>`; `src/components/motion/route-transitions.client.ts` plays `ROUTE_TRANSITIONS` (presets) with WAAPI on the view-transition pseudo-elements (RT-01 root, RT-02 `pf-work-cover` card → case cover, nothing with reduced motion). Persisted across navigations: pill nav, theme cord, Stellar, footer stage.
- **Hero scene**: plays once per tab and route (`sessionStorage` key `pf-hero-seen:<path>`); `window.__pfHeroSceneStarts` lets an SPA round trip resume it. On a first load it waits for `DOMContentLoaded`, when the appears start, and begins 150 ms later.
- **Technology wall**: the WebGL2 renderer (`metal-marks/field.ts` and the `bevel.worker.ts` module worker) loads with a dynamic import once the page has loaded, the main thread is idle and the wall is in view. Without JavaScript, WebGL2 or a worker, or after a lost context, the DOM logos stay in grey. Every value is in `metal-marks/tuning.ts`.
- **Stellar** (dark star field): drawn in a module worker with `OffscreenCanvas` (`stellar.worker.ts`), falling back to the main thread; mounted only in dark. It paints at `z-index: -1` from the root, so it is a direct child of `<body>` and `body` paints no background.

## Events and data attributes

| Name                                             | Where                                                            | What                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `themeChange` (`window`, `detail.theme`)         | `theme-toggle.client.ts` (`THEME_CHANGE_EVENT`, `applyTheme`)    | The theme changed; islands and demos can follow it                                                                        |
| `pf:mobile-chrome` (`window`, `detail.hidden`)   | `pill-nav.client.ts` (`MOBILE_CHROME_EVENT` in `@/lib/pill-nav`) | The phone chrome hid or showed                                                                                            |
| `pf:nav-sync` (`window`)                         | `@/lib/pill-nav` (`NAV_SYNC_EVENT`)                              | Ask the pill nav to re-read the location after a `pushState` without `hashchange`                                         |
| `pf:blue-open` (`window`, cancelable)            | `hero-selection.client.ts` (`BLUE_OPEN_EVENT`)                   | "Ask Blue" was pressed; the Blue launcher calls `preventDefault()` to take it                                             |
| `pf:email-fallback` (`window`, `detail.email`)   | `@/lib/pill-nav` (`EMAIL_FALLBACK_EVENT`)                        | A copy of the email failed elsewhere (hero Copy); the pill nav shows its "write to" toast                                 |
| `pf:footer-enter` (`window`, `detail.startedAt`) | `footer-portrait.client.ts` (`FOOTER_ENTER_EVENT`)               | The footer scene started                                                                                                  |
| `data-copy-email="<address>"`                    | any `<a href="mailto:">`                                         | With the async clipboard, a click copies the address and shows the nav toast (decision 22); otherwise the `mailto:` opens |
| `data-mobile-chrome`                             | any focusable holder                                             | Its focus shows and keeps the phone chrome (D-15)                                                                         |
| `data-footer-scene`                              | `.site-footer__stage`                                            | `pending` → `playing` → `done`                                                                                            |
| `data-footer-text-link`                          | footer text links                                                | Opts into the SH-18 underline                                                                                             |

`AquaButton` (React island, `client:idle` or `client:visible`) takes `href`, `label`, `variant` (`neutral` or `accent`), `external`, `accessibleName`, `icon` (`{ path, viewBox }`, icon variant) and `copyEmail`; `motion/react` only ships on pages that mount one.
