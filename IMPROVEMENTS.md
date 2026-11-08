# Improvements

## Dependencies

- **`npm audit` reports 3 high and 3 moderate advisories** (priority: low). All come from build-time dependencies of `@astrojs/vercel@11.0.20` (`@vercel/routing-utils` → `path-to-regexp`, `@vercel/nft` → `glob`, `minimatch`); nothing reaches the browser or the chat function. The suggested `npm audit fix --force` downgrades the adapter to 8.x, which does not support Astro 7. Approach: update the adapter when a release bumps those packages.

## Accessibility

- **Contrast of the secondary text is 4.29:1** (priority: high, pending decisiones.md 20). `--pf-text-secondary` (.52 of black, the reference value) fails AA for 14 px text: the footer © and the current language of the locale switch are the only Lighthouse/axe findings (accessibility 96). Approach: set it to `.55` in `tokens.css` (≈4.7:1) once Sebastian decides; the other three contrast knobs are next to it.

## Motion

- **The cord tug peaks 1–2 px lower than the reference with a mouse** (priority: low). Both cut the tug when the handle slides out from under a still cursor (`pointerleave` → release spring, as the reference does); Chromium delivers that synthetic leave later on the reference's busier main thread, so it peaks at 27.3–28.4 px at ≈143 ms against our 26.3 px at ≈105 ms. Approach: none planned; replicating it would mean delaying the leave on purpose.
- **Timing constants still outside `presets.ts`** (priority: low): `MOBILE_CHROME` in `src/lib/pill-nav.ts` (SH-08 thresholds and the 160 ms show delay) and `CORD` in `src/lib/theme-cord.ts` (with the 325 ms fling of decision 17). Approach: move the times to `presets.ts` and keep the geometry in lib.
- **Reload position** (priority: low): the appear engine binds on `DOMContentLoaded`; check on a deployed build that the scroll restored by the browser on reload (RT-14, decision 26) lands before the IntersectionObserver evaluates.

## Shell

- **A cold load of `/#works` paints "Inicio" active for a frame** (priority: low): the SSR marks Home and the nav script corrects it. Approach: a tiny inline script, or mark the active link before the first paint from `location.hash`.

## Effects and WebGL

- **The metal shader is expensive on a software GPU** (priority: medium). In headless Chrome (SwiftShader) with 4× CPU throttling, mounting it during the load cost ~5 s of main thread (Lighthouse mobile 48). It now mounts after `load` and when idle: at once with a hardware GPU and more than 4 cores (EF-07 as in the reference), only with the wall in view on a software renderer (`WEBGL_debug_renderer_info`). Scrolling to it on a GPU-less device still costs frames. Approach: stay on the grey DOM marks there, or rasterise the marks in the worker with `OffscreenCanvas` + `createImageBitmap` instead of the main thread.
- **Pure helpers of the wall live next to the component** (priority: low): `metal-marks/layout.ts`, `bevel.ts` and `marks.ts` are pure and tested but outside `src/lib`. Approach: move them (mechanical).

## Code

- **Literal art colours in two components** (priority: low): the per-object shadow tints of `HeroObjects.astro` and the stops of the envelope gradient in `PillNav.astro` stay inline. They belong to one illustration each (like the SVGs in `src/assets/hero-objects/`), not to the theme. Approach: move them next to the art (an `objects.ts` table, an SVG asset) if the art becomes swappable.

## Blue chat

- **Configure Upstash in production** (priority: high). Without `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` the per-visitor window and the daily budget of 500 requests are counted per function instance, so concurrent or recycled instances each allow their own. Approach: create an Upstash Redis database (the Vercel integration sets both variables) and check the log no longer shows the "rate limits are per instance" warning.
- **Check the prompt cache on the deployed function** (priority: medium). The `[blue] answer` log line carries `cacheReadTokens`; it should be above 0 from the second request in a locale within five minutes. Approach: two requests after the first deploy with a key; if it stays at 0, diff the `system` bytes between requests (`prompt-caching.md` in the claude-api skill lists the usual invalidators).
- **Effort level not evaluated** (priority: medium). `BLUE_EFFORT` is `high` with `max_tokens` 2048, the documented setting for a chat that must keep to its rules; it was never run with a real key. Approach: a small set of real questions (projects, a pasted job ad, availability, salary, off-topic, role-change and forged-turn attempts) at `high` and `medium`, compared on answers, time to first token and output tokens; step down if `medium` holds the rules.
- **No browser tests for the launcher controller and `useChat`** (priority: low). The pure parts are tested (`src/lib/blue/client/`, including `page-inert.ts` and `guide-rect.ts`), but the controller (open/close and focus return, Escape, the shortcut in outside fields, closing while `import()` loads, `astro:before-swap`, the sheet's inert page) and `useChat` (stop on close, retry, abort on unmount, a throwing `sessionStorage`) only run in the dev-server checks. Approach: add `happy-dom` as a dev dependency, a fake `mountBluePanel` for the controller and `renderHook` with a fake `streamChat` for `useChat`.
- **A foreign origin answers `400 bad_request`** (priority: low). The contract has no 403 code. Approach: add `forbidden` (403) to `protocol.ts` together with the panel and its tests.
- **Muted text of the panel is darker than the reference** (priority: medium). `--pf-blue-text-muted` is .55 (4.7:1, AA) instead of the reference's .4 (2.85:1). Approach: settle it together with decision 20 (contrast).
- **A failed question without retry has no mark of its own** (priority: low). Only the last error shows the block with "Retry"; an earlier failed question stays in the log like any other. Approach: a small failed note on the user message, like the "stopped" note on answers.
- **The panel stylesheet ships with every page** (priority: low). `blue-panel.css` (about 11 KB raw, 3 KB gzip) is imported by `BlueLauncher.astro` because the router's head swap drops styles that a dynamic import adds. Approach: split it if it grows, or load it with a `<link>` the launcher keeps in `<head>` across swaps.
- **The panel chunk carries the full `motion` component** (priority: low). `BluePanel` is about 50 KB gzip on top of React because `motion.li` brings every feature. Approach: `LazyMotion` with `domAnimation` and `m.li`, then measure the chunk again.
- **The Vercel function also serves `/_image` and the 404** (priority: low). `@astrojs/vercel` routes on-demand image resizing and unknown paths to the same `_render` function, which bundles `sharp` (about 19 MB of the 28 MB). Every image is prerendered, so `/_image` is unused. Approach: check `imageService`/`imagesConfig` of the adapter once the 404 exists (Phase 7) and keep only `/api/chat` in the function.
- **The sheet hides the suggestions on short screens** (priority: low). Under 560 px of height the four suggestion cards go, so the conversation keeps ~150 px or more (decision 15's landscape phone). Approach: if they are missed, move them inside the scrolling log as its first block instead.

## Content and media

- **Project covers are 16:9 captures cropped to 4:3** (priority: low), and only Reto MD has hover-zone images. Approach: own 4:3 crops and 2–3 views per project in each MDX `zones`.
