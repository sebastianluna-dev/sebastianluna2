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

Copy `.env.example` to `.env.local` to try the chat locally. Without `ANTHROPIC_API_KEY`, `npm run dev` answers in a marked demo mode over the same protocol, enough to work on the panel.

`@astrojs/vercel` has no preview entrypoint, so `npm run preview` runs `scripts/preview.mjs`: a small server for `.vercel/output/static` that mirrors the Vercel routes (308 to the URL without a trailing slash, immutable `/_astro`, brotli/gzip). It does not serve `/api/chat`: there the Blue panel opens and shows its "not available" message. Pass `--port <n>` to change the port (default 4321).

## Routes

| Spanish         | English            | Source                                                            |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| `/`             | `/en`              | `src/pages/index.astro`, `src/pages/en/index.astro`               |
| `/works/<slug>` | `/en/works/<slug>` | `src/pages/works/[slug].astro`, `src/pages/en/works/[slug].astro` |
| `/api/chat`     |                    | `src/pages/api/chat.ts`, the only on-demand route                 |

A case page exists for every published (`draft: false`) work of each language (`workStaticPaths` in `src/lib/works.ts`) and renders `WorkView`. Its twin in the other language must exist: the canonical, the `hreflang` alternates and the footer language switch point to the same slug in the other language.

## Structure

See `AGENTS.md` for the conventions, in particular the split between portfolio components (`src/components/portfolio`) and project demos (`src/demos`).

| Path                                   | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                           | Thin routes: they pick the locale and render a view                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/views/HomeView.astro`             | The home of either language: hero, technology wall, works                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/views/WorkView.astro`             | A case study of either language: back pill, Works Map, hero, the MDX body, previous/next, lightbox                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/layouts/BaseLayout.astro`         | `<html>`, head (canonical, hreflang, Open Graph, font preloads), theme bootstrap, `<ClientRouter/>`, header, footer                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/components/portfolio/`            | The site: `shell/`, `home/`, `case/`, `theme/`, `ui/`, `blue/` (launcher and chat panel)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/components/motion/`               | Page appear engine (WAAPI with springs precomputed to `linear()`) and `presets.ts`, the home of every timing and spring                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/styles/`                          | `layers.css` (layer order, inlined first), `reset.css`, `fonts.css`, `tokens.css` (`--pf-*`, light and dark), `portfolio.css`, `prose.css` (case body), `view-transitions.css`                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/i18n/`                            | `locales.ts`, `t.ts` (`getMessages`, `createT`, `format`) and `messages/{es,en}/<namespace>.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/content/works/{es,en}/<slug>.mdx` | One case study per project and language (schema in `src/content.config.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/data/`                            | `profile.ts` (emails, links, CV paths, avatar photo), `technologies.ts` (logo wall, from `simple-icons`) and `features.ts` (flags of later phases: Blue)                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/`                             | Pure, tested helpers: `i18n-paths.ts`, `works.ts` (case routes, prev/next, body split), `works-map.ts` (Works Map spy), `case-nav.ts` (plain clicks, back pill), `lightbox.ts` (gallery `sizes`, enlarged source, FLIP keyframes), `chat-sequence.ts` (chat aside calendar, its pausable clock, rain and avatar sizes), `route-transitions.ts` (RT plan), `case-outline.ts` (MDX structure checks), the spring solver and `linear()` generator (`spring.ts`, `spring-to-linear.ts`), `motion-policy.ts`, and the logic of the pill nav, theme cord, star field, hero objects and footer scene |
| `src/assets/`                          | Fonts (with their OFL licences), the avatar photo and the project captures                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `public/cv/{es,en}/`                   | The CV, one PDF per language                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `scripts/`                             | `preview.mjs` (serves the build) and `gen-wordmarks.mjs` (regenerates the outlined wordmarks of the technology wall)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Content

- **Copy**: every visible string lives in `src/i18n/messages/es/<namespace>.ts` (the typed reference) and its English twin `en/<namespace>.ts`, which `satisfies` it. Namespaces: `common`, `nav`, `hero`, `logos`, `works`, `footer`, `theme`, `notFound`, `blue`, `case`. `t.test.ts` checks that both languages have the same keys and placeholders.
- **Projects**: `src/content/works/<locale>/<slug>.mdx`. The frontmatter holds the card and case metadata (`title`, `kicker`, `summary`, optional `description` when the summary is longer than the 160 characters of a meta description, `role`, `service`, `tools`, `year` (`2021–2023`, or `2020–2021 · 2025` for a later rebuild), `url`, `order`, `cover`, optional `zones` for the three hover images, `demos`, `draft`); the cover is also the share image (`og:image`, 1200 px JPEG) of the case; the body is the case study (see "Writing a case study"). A new project needs both languages with the same `order` (`works.test.ts` enforces it). Images go in `src/assets/works/<slug>/` and are referenced by relative path.
- **Profile**: emails, LinkedIn, GitHub and the CV paths in `src/data/profile.ts`; replace the PDFs in `public/cv/` keeping their names.
- **Avatar**: `src/assets/portrait/avatar-sebastian-luna.jpg`, a square photo with the face centred (384 px; at least 180 for the 3x of the 60 px home avatar). `PROFILE.avatar` is the image and `AVATAR_IMAGE` / `avatarWidths()` in `profile.ts` say how every avatar serves it (home `HeroAvatar` 60 px, `ChatAside` 28 px or 24 on phones, the Blue panel): `getImage` with AVIF in a `<source>` and a WebP `<img>`, only at 1x/2x/3x of the drawn size. A client island cannot call `getImage`, so the Astro side that mounts it passes the URLs down. Replace the file keeping its name.
- **Hero objects**: own SVG illustrations in `src/assets/hero-objects/*.svg`, loaded with `?url` imports in `HeroObjects.astro`; swap them for PNGs by changing those imports. The click-swap pool is those nine ids, and each id has its shadow tint in the component CSS (`[data-object]`).
- **Technology wall**: `src/data/technologies.ts` (icons from `simple-icons`, CC0). Five of them are wordmarks, the icon plus the name in Geist (OFL) converted to outlines in `metal-marks/wordmarks.ts`; regenerate it with `scripts/gen-wordmarks.mjs` (instructions at the top of the file). A new technology also needs its entry in `MARK_STYLES` (`marks.test.ts` checks it). The grid is laid out for 11 marks (rows of 4/3/4).

## Writing a case study

The body of `src/content/works/<locale>/<slug>.mdx` is built from the components of `@/components/portfolio/case` (contracts in `src/components/portfolio/case/types.ts`; `src/content/works/es/reto-md.mdx` is the reference). Copy only: the h1 (frontmatter `title`), the badge (`kicker`), the cover and the Service / Tools / Year meta come from the frontmatter.

```mdx
import {
  CaseSection,
  CaseSubsection,
  ChatAside,
  DemoSlot,
  Figure,
  Gallery,
  SideNote,
  SideNotes,
} from '@/components/portfolio/case';
import shot from '@/assets/works/<slug>/shot.jpg';

<CaseSection id="overview" title="The section h2">

A paragraph of the body. Blank lines around Markdown inside a component.

### An h3 of the body

<ChatAside
  meta="Tue 20:15"
  delivered
  messages={[
    { from: 'visitor', text: 'A question' },
    { from: 'sebastian', text: 'A real fact of the project', fx: 'gentle' },
  ]}
/>

<SideNotes label="What the notes are about" cols={3}>
  <SideNote title="Title" art="board">
    One short sentence.
  </SideNote>
</SideNotes>

<DemoSlot name="demo-key" caption="Caption of the live demo" />

<CaseSubsection kicker="Visual direction" appear>

Prose of the subsection.

<Gallery variant="lead">
  <Figure src={shot} alt="What the image shows" />
</Gallery>
<Gallery variant="pair">
  <Figure alt="Placeholder until the capture exists" />
  <Figure src={shot} alt="…" />
</Gallery>

</CaseSubsection>

</CaseSection>
```

- **Headings**: `title` of a `CaseSection` is its h2 and the kicker of a `CaseSubsection` is its h3, so a heading written inside a subsection starts at `####` (`case-outline.test.ts`).
- **Sections**: the six ids of `CASE_SECTION_IDS`, always all six and in this order: `overview`, `challenge`, `approach`, `research`, `design`, `outcome` (anchors, never translated). `kicker` defaults to the section label of the catalogue; `title` is the h2.
- **Body, then blocks**: inside a section, everything before the first block (`Figure`, `Gallery`, `DemoSlot`, `CaseSubsection`, which render `data-case-block`) is the body: the 560 text column with one appear. Chat asides and side notes belong to the body. The blocks follow at the section block gap (64, 48 on phones); text that comes after a block goes inside a `CaseSubsection`.
- **Galleries**: `lead`, `pair`, `pair-2col-phone`, `composition`; consecutive `Gallery` elements form one gallery (16 / 12 apart). Each `Gallery` rewrites the `sizes` of its figures for its slot, so a `Figure` stays a direct child of a `Gallery` (or a block of its own). Images go in `src/assets/works/<slug>/` as 4:3 captures of Sebastian's own sites (no identifiable people, no personal data); every `alt` says what the image shows; a `Figure` without `src` is a 4:3 placeholder.
- **Appears** (CA-01): sections, the case hero and `CaseSubsection appear` (first subsection of Approach only) play the reference delays from `CASE_SECTION_APPEAR` / `CASE_BLOCK_APPEAR`; a figure appears only with `appear="researchFirst" | "approachGallery" | "designLead" | "designRowFirst" | "designRowSecond"`.
- **Chats**: a generic visitor asks and Sebastian answers with real facts of the project, never quotes of clients (decisiones.md, phase 4). `fx`: `slam`, `loud`, `gentle`, `rain` (with `rain: '🩺'`, or the emoji of the text); `tapback` reacts on the previous bubble of the other speaker. A message of one to three emoji alone renders large, without a bubble. `delivered` only shows the status when the last message is Sebastian's.
- **Side notes**: 2 or 3 per row (`cols={2}` for two); the slot is one short sentence. Each `art` draws an illustration without text, so the message lives in the title and the sentence; `art` is one of `SIDE_NOTE_ARTS` (`board`, `trophy`, `calendar`, `ticket`, `music`, `stethoscope`, `palette`, `globe`, `roles`, `shield`, `gauge`, `blocks`, `phone`, `compass`).
- **Demos**: `<DemoSlot name>` marks where a live demo goes (phase 5); list the same key in the frontmatter `demos`, once per case.
- **Both languages**: the Spanish and English bodies have the same sections, figures, chats, notes and demos (`works.test.ts` counts them).
- Components used in the MDX read the language from the URL; prev/next and the Works Map need nothing from the MDX.
- No `{/* … */}` comments spanning several lines in MDX: Prettier rewrites them into invalid MDX.

## Blue chat

`POST /api/chat` (`src/pages/api/chat.ts`, the only Vercel function) answers questions about Sebastian with Claude Haiku 5.5 (`claude-haiku-5-5`). The wire contract, shared with the panel, is `src/lib/blue/protocol.ts`: body `{ locale, messages }` (at most 8 KB, 12 turns and 1000 characters per turn, alternating and starting and ending with `user`), a `200 text/event-stream` of `delta` / `done` / `error` events, or a JSON `{ error }` with the status of its code.

- **Flow** (`src/lib/blue/handler.ts`, the model and limiter injected): methods other than POST → 405 with `Allow: POST`; another site's `Origin` (only the production site, the deployment itself, previews included, and localhost pass), no `Origin` without `Sec-Fetch-Site: same-origin`, or a non-JSON content type → 400; body read with a real byte cap whatever `Content-Length` says → 413; validation (`validate.ts`) → 400 / 413; no API key → 503; rate limits → 429 with `Retry-After`; then the stream. The response waits for the first event, so a model failure before any text is a 502 `upstream`; after that it arrives as an `error` event. A refusal or an empty answer gets the fixed line of the `blue.server` messages before `done`. Every response carries `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. The model call is aborted when the visitor closes the connection and at a 27 s deadline (the function's `maxDuration` is 30 s). Errors are logged with status, type and request id only; every answer logs one `[blue] answer` line with its locale, stop reason and token counts (`cacheReadTokens` above 0 from the second request on means the prompt cache works), never the conversation.
- **Settings** (`src/lib/blue/config.ts`): model, `max_tokens` (2048; adaptive thinking counts toward it), `output_config.effort: 'high'` (the documented level where keeping to the system prompt matters most), SDK timeout and retries, the deadline and the limits. The text the server writes into answers (refusal, empty answer, demo) lives in `src/i18n/messages/*/blue.ts` as `blueServer` (`blue.server` in the catalogue). Haiku 5.5 rejects sampling parameters, `budget_tokens` and assistant prefill, so the request sends none.
- **Knowledge**: `src/data/blue/profile.{es,en}.md`, written from the CV, the case MDX and the previous portfolio's copy, with every case section linked (`/works/<slug>#<id>`, `/en/works/<slug>#<id>`); `knowledge.ts` appends the contact data of `src/data/profile.ts`. Edit the Markdown when a fact changes; `prompt.test.ts` checks the links and keeps out the phone number, salary and the unverified Lighthouse figures. Only add facts with a source.
- **Prompt** (`prompt.ts`): `system` is two cached blocks, the locale's knowledge first and then the behaviour (third person, the page's language, two to five sentences, light Markdown and only the knowledge's links, declines anything else). Nothing variable goes into `system`, or the cache misses on every request.
- **Limits** (`rate-limit.ts`): a sliding window of 10 requests per 10 minutes and a cap of 40 per UTC day per visitor (the IP, IPv6 reduced to its /64, keyed with HMAC-SHA-256 under `BLUE_IP_SALT`, else the Upstash token, so Redis never holds a reversible address) and a fixed daily budget of 500 requests for the whole site, in Upstash Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Without them, or when Redis does not answer within 1.5 s, a per-instance memory limiter decides, with a warning in the log.
- **Locally**: without `ANTHROPIC_API_KEY`, `npm run dev` streams a marked demo text (`createDemoModel`) over the same protocol, rate limits included; a production build answers 503. With a key in `.env.local`, it calls the API. To try it by hand: `curl -N -X POST localhost:4321/api/chat -H 'Origin: http://localhost:4321' -H 'Content-Type: application/json' -d '{"locale":"es","messages":[{"role":"user","content":"hola"}]}'`.
- **Tests**: `npm test` covers validation, the body cap, origins, client keys, both limiters, the system prompt and the whole handler with a scripted model (deltas, refusal, empty answer, errors before and after the first event, cancel, deadline, demo mode), all without network.
- **Launcher** (`src/components/portfolio/blue/BlueLauncher.astro`, rendered by `BaseLayout` as the last element of `<body>` when `FEATURES.blue` is on, so it is last in the Tab order): an 88 px button at the bottom right plus the empty host of the panel, persisted across navigations (`pf-blue`). `blue-launcher.client.ts` is vanilla and opens the panel from the button, ⌘⌥/ (Ctrl+Alt+/ elsewhere; ignored in fields outside the panel), "Ask Blue" in the hero (`pf:blue-open`) and closes it with the same, Escape or the panel's Close; the focus goes back to whoever opened it. Hidden without JS, at ≤809 px (the hero's "Ask Blue" opens a full-screen sheet there) and on touch landscape. The sheet (`BLUE.sheetQuery`: ≤809 px, or `(hover: none) and (max-height: 500px)`) covers the page, so while it is open the panel is `aria-modal`, the rest of `<body>` is `inert` and the page does not scroll; next to the 380 px sidebar the page stays usable.
- **Panel** (`BluePanel.tsx`): loaded with `import()` the first time it opens, so React and motion travel only then (about 50 KB gzip on a case page). Its stylesheet is imported by `BlueLauncher.astro`, because the router's head swap drops styles that a dynamic import adds. Answers are revealed in chunks as they stream (BL-07) and rendered as markdown-lite React elements: internal links navigate with the router and outline their section (BL-09), external ones open a new tab, `mailto:` ones copy the address. The conversation lives in `sessionStorage` (`pf-blue-history`), so it survives navigations and reloads in the tab. The pure logic (SSE parser, request building and trimming, reveal, markdown, shortcut, errors, stream, reducer) is in `src/lib/blue/client/` with tests.

## Theme and fonts

- The theme is stored under the `localStorage` key `pf-theme` (`light` or `dark`; absent follows the system). `theme.inline.ts` runs render-blocking in `<head>`, sets `data-theme` and swaps `no-js` for `js` before the first paint, stamps the incoming document on `astro:before-swap` (and again after the swap). Without JavaScript, dark follows `prefers-color-scheme`. If no page module marks `<html>` with `pf-ready` (`@/lib/scripts-ready`, done by the appear engine) within 4 s, it puts `no-js` back, so a failed module load shows the no-JS render instead of hidden content.
- Fonts are self-hosted with manual `@font-face` rules in `src/styles/fonts.css`, because the Astro Fonts API does not take `size-adjust` or `*-override` per face: Geist variable (npm `geist`, keeps the `ss03`/`ss08` sets) and "Serif Text", Noto Serif variable pinned to `wdth` 97.5 with the metrics of the reference serif. Their metric fallbacks (Arial, Georgia) are width-matched; the numbers are in the file.

## Motion

- **Page appears** (`src/components/motion/`): wrap a block in `<AppearMotion appear={HOME_APPEAR.bio}>` (or `preset` + `delay` in seconds). It renders `data-appear`, `data-appear-delay` (seconds) and `data-appear-from`; `data-appear-stagger="section"` on an ancestor makes the delays relative to that group instead of the page. `appear.client.ts` (started by `BaseLayout` on every page) plays each block once when it enters the viewport (IntersectionObserver, threshold 0), ends it at once on `focusin`, and with reduced motion fades everything in 150 ms. The element's own CSS must be the preset's **end** state: that is what shows without JavaScript and with reduced motion; the start state only applies under `html.js`. Put the appear on a wrapper when the content animates `scale`/`translate`/`rotate` itself, because the end values stay inline. React islands use `useAppear()` with the same presets. Slots: `HOME_APPEAR`, `CASE_APPEAR` (case hero), `CASE_SECTION_APPEAR` / `CASE_BLOCK_APPEAR` / `CASE_FIGURE_APPEAR` (case body, absolute delays of the reference), `BLUE_LAUNCHER_APPEAR`; the `html.js` start-state rules live in `AppearMotion.astro`, so a page that only uses `useAppear()` must also render one `AppearMotion`.
- **Timings**: every duration, easing and spring lives in `src/components/motion/presets.ts` (appear presets, `CHROME_SPRINGS`, `HERO_SCENE`, `HERO_MENU`, `HERO_OBJECT_BUMP`/`SWAP`, `AQUA_SPRINGS`/`AQUA_MAGNETIC`, `FOOTER_SCENE`, `BLUE` (BL-06, BL-07, BL-09), and for the case `WORKS_MAP`, `LIGHTBOX`, `CHAT_ASIDE`) or in the `--pf-*` tokens for CSS. Each value cites its row of the animation inventory (`SH-`, `HE-`, `HO-`, `TE-`, `EF-`, `RT-`…).
- **Case chrome**: the back pill listens for `pf:mobile-chrome` and hides with the phone chrome (CA-05); the Works Map spy marks the section under 40 % of the viewport (`WORKS_MAP.activeLine`).
- **Route transitions**: `<ClientRouter/>`; `src/components/motion/route-transitions.client.ts` plays `ROUTE_TRANSITIONS` (presets) with WAAPI on the view-transition pseudo-elements (RT-01 root, RT-02 `pf-work-cover` card → case cover, nothing with reduced motion). The cover morph is our own animation from the browser's `from` frame, so it keeps one curve and lands on the live cover. After a navigation the focus stays in the pill nav when it started there, else moves to the hash target's heading or the page's `h1[tabindex=-1]` (RT-06). Persisted across navigations: pill nav, theme cord, Stellar, footer stage, Blue (launcher and panel host).
- **Blue push**: `--pf-blue-offset`, registered with `@property` in `blue-launcher.css` and animated on `<html>` (BL-03, BL-05, `--pf-ease-sheet`), goes to 380 px while the panel is open as a sidebar (≥810, except short touch screens). The body's right padding, the launcher, the pill nav and its toast (centred in the visible area, decision 16), the theme cord and Stellar read it, and the Works Map steps aside at 1200–1259 px, where the case column would run under it; a fixed element that must make room only reads `var(--pf-blue-offset)`, without its own transition.
- **Footer scene**: `FooterStage.astro` (frame, label, name fitted with `cqw`, divider, social links) and `footer-stage.client.ts` play SH-09…SH-13 and SH-16 once per stage with WAAPI (`FOOTER_SCENE`); focus in the footer or reduced motion jumps to the end state, which is also the no-JS render. The reference's head, hands and duck (SH-14, SH-15, SH-17) are left out, so the stage is as tall as its content: frame top 24 + frame (1.04 × name + 8, 16 under 600 px) + 40 to the links + 44 + 32 (28 on phones).
- **Hero scene**: plays once per tab and route (`sessionStorage` key `pf-hero-seen:<path>`); `window.__pfHeroSceneStarts` lets an SPA round trip resume it. On a first load it waits for `DOMContentLoaded`, when the appears start, and begins 150 ms later.
- **Technology wall**: the WebGL2 renderer (`metal-marks/field.ts` and the `bevel.worker.ts` module worker) loads with a dynamic import once the page has loaded, the main thread is idle and the wall is in view. Without JavaScript, WebGL2 or a worker, or after a lost context, the DOM logos stay in grey. Every value is in `metal-marks/tuning.ts`.
- **Stellar** (dark star field): drawn in a module worker with `OffscreenCanvas` (`stellar.worker.ts`), falling back to the main thread; mounted only in dark. It paints at `z-index: -1` from the root, so it is a direct child of `<body>` and `body` paints no background.

## Events and data attributes

| Name                                                  | Where                                                            | What                                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `themeChange` (`window`, `detail.theme`)              | `theme-toggle.client.ts` (`THEME_CHANGE_EVENT`, `applyTheme`)    | The theme changed; islands and demos can follow it                                                                        |
| `pf:mobile-chrome` (`window`, `detail.hidden`)        | `pill-nav.client.ts` (`MOBILE_CHROME_EVENT` in `@/lib/pill-nav`) | The phone chrome hid or showed                                                                                            |
| `pf:nav-sync` (`window`)                              | `@/lib/pill-nav` (`NAV_SYNC_EVENT`)                              | Ask the pill nav to re-read the location after a `pushState` without `hashchange`                                         |
| `pf:blue-open` (`window`, cancelable)                 | `@/lib/blue/events` (`BLUE_OPEN_EVENT`)                          | "Ask Blue" was pressed; `blue-launcher.client.ts` calls `preventDefault()` to take it and opens the panel                 |
| `pf:email-fallback` (`window`, `detail.email`)        | `@/lib/pill-nav` (`EMAIL_FALLBACK_EVENT`)                        | A copy of the email failed elsewhere (hero Copy); the pill nav shows its "write to" toast                                 |
| `pf:footer-enter` (`window`, `detail.startedAt`)      | `footer-stage.client.ts` (`FOOTER_ENTER_EVENT`)                  | The footer scene started                                                                                                  |
| `data-copy-email="<address>"`                         | any `<a href="mailto:">`                                         | With the async clipboard, a click copies the address and shows the nav toast (decision 22); otherwise the `mailto:` opens |
| `data-mobile-chrome`                                  | any focusable holder                                             | Its focus shows and keeps the phone chrome (D-15)                                                                         |
| `data-footer-scene`                                   | `.footer-stage` (`FooterStage`)                                  | `pending` → `playing` → `done`                                                                                            |
| `data-footer-text-link`                               | footer text links                                                | Opts into the SH-18 underline                                                                                             |
| `data-case-section="<id>"`                            | `CaseSection` (`section#<id>`)                                   | The six sections of a case; the Works Map spy reads them                                                                  |
| `data-case-block`                                     | root of `Figure`, `Gallery`, `DemoSlot`, `CaseSubsection`        | Ends the body of a section (`splitLeadingProse` in `@/lib/works`)                                                         |
| `data-hero-image`                                     | case cover frame (`Figure variant="hero"`)                       | Destination of the `pf-work-cover` shared element (RT-02)                                                                 |
| `data-lightbox-trigger` / `data-lightbox`             | figure links / the case `<dialog>`                               | `lightbox.client.ts`: opens on click, Enter or Space; closes on Escape, a click anywhere or "Cerrar" (CA-07, CA-08)       |
| `data-works-map` / `data-works-map-link`              | Works Map root and its links                                     | `works-map.client.ts`: scroll-spy (CA-02) and focus to the section h2 after a jump (CA-03)                                |
| `data-back-pill`                                      | `nav.back-pill` (fixed wrapper of the case back link)            | Hides on phones with `pf:mobile-chrome` (CA-05); its inner link carries `data-mobile-chrome`                              |
| `data-chat-aside` / `data-chat-messages`              | `ChatAside` root (messages as JSON)                              | `chat-aside.client.ts` plays the typing sequence once in view (CA-09…CA-12)                                               |
| `data-side-notes`                                     | `SideNotes` root                                                 | A named, focusable `region` while it is the ≤599 carousel (CA-15)                                                         |
| `data-demo-slot="<name>"`                             | `DemoSlot`                                                       | Where a phase 5 demo goes                                                                                                 |
| `data-blue-open`                                      | `<html>` (`blue-launcher.client.ts`)                             | The Blue panel is open; kept across a router swap                                                                         |
| `data-blue` / `data-blue-launcher` / `data-blue-host` | `BlueLauncher` root, its button and the panel host               | The launcher controller binds to them                                                                                     |

`AquaButton` (React island, `client:idle` or `client:visible`) takes `href`, `label`, `variant` (`neutral` or `accent`), `external`, `accessibleName`, `icon` (`{ path, viewBox }`, icon variant) and `copyEmail`; `motion/react` only ships on pages that mount one.
