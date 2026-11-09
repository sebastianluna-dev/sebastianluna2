# Improvements

## Dependencies

- **`npm audit` reports 3 high and 3 moderate advisories** (priority: low). All come from build-time dependencies of `@astrojs/vercel@11.0.20` (`@vercel/routing-utils` → `path-to-regexp`, `@vercel/nft` → `glob`, `minimatch`); nothing reaches the browser or the chat function. The suggested `npm audit fix --force` downgrades the adapter to 8.x, which does not support Astro 7. Approach: update the adapter when a release bumps those packages.

## Accessibility

- **Interface sounds have no mute control** (priority: low). Like the reference, Blue and the theme cord play short sounds (`src/lib/sound/`) with no way to turn them off besides the system volume. They are under 0.65 s and always answer a gesture, so WCAG 1.4.2 does not apply, but a visitor in a quiet room may want silence. Approach: a sound toggle in the Blue panel header, stored in `localStorage`, read by `playInterfaceSound`.
- **Contrast of the secondary text is 4.29:1** (priority: high, pending decisiones.md 20). `--pf-text-secondary` (.52 of black, the reference value) fails AA for 14 px text: the footer © and the current language of the locale switch are the only Lighthouse/axe findings (accessibility 96). Approach: set it to `.55` in `tokens.css` (≈4.7:1) once Sebastian decides; the other three contrast knobs are next to it.
- **The new pages repeat the contrast of decision 20** (priority: high, same decision). On `/about` the hero paragraphs and the empty writings state use `--pf-text-secondary`; the article meta (date and reading time) and "Escrito por" are `--pf-text-secondary` with `opacity: var(--pf-meta-dim)` on top, so both alphas multiply (.208 of black, 1.64:1 in light; .24 of white on #0a0a0a, 2.06:1 in dark); the Experience dates are `--pf-text` at .4 (2.85:1 light, 3.77:1 dark); the grey body links are below AA too. All as in the reference. Lighthouse mobile gives accessibility 96 on `/about` and `/writings` only for this. Approach: the same token change as above, and one lever for the meta: apply `--pf-meta-dim` over `--pf-text` instead of `--pf-text-secondary` (2.85:1), or raise `--pf-meta-dim`.
- **Code line numbers are at about 3:1** (priority: low, decision 20). `--pf-code-gutter` is #8a8a93 on #f7f7f8 (3.2:1) and #71717a on #101012 (3.93:1): readable, but under the 4.5:1 of body text, to keep the faint numbers of the reference. Approach: #71717a in light and #7d7d86 in dark reach 4.5:1 if Sebastian prefers it.
- **The 404 glyphs come from the system monospace** (priority: low). The Fragment Mono subset (Google Fonts latin) has no ✓, ✕ or █, so the prefixes and the caret fall back to the system font and their width may change outside macOS (on macOS "✓ " measures 17.09 px, about 2ch). Approach: a subset of the full Fragment Mono with `unicode-range: U+2713` (it has ✓, not ✕ or █), or draw the three glyphs as inline SVG of 1ch.

## Motion

- **After a router navigation the focus on the `h1` ends the appear of the hero and the title** (priority: low). RT-06 moves the focus to the page `h1` (cases and articles), and `appear.client.ts` ends a block on `focusin`, so the hero and the h1 of an article land at once while its meta and body still animate. The reference does not move the focus. Approach: ignore the programmatic focus of RT-06 in the `focusin` handler (a flag set by `route-transitions.client.ts` just before `focus()`).
- **The /about books have no sounds** (priority: low). The reference plays a short sound when a book opens and closes. Approach: two recipes in `src/lib/sound/recipes.ts` (shared with Blue and the theme cord) once there are real books.

- **The cord tug peaks 1–2 px lower than the reference with a mouse** (priority: low). Both cut the tug when the handle slides out from under a still cursor (`pointerleave` → release spring, as the reference does); Chromium delivers that synthetic leave later on the reference's busier main thread, so it peaks at 27.3–28.4 px at ≈143 ms against our 26.3 px at ≈105 ms. Approach: none planned; replicating it would mean delaying the leave on purpose.
- **Timing constants still outside `presets.ts`** (priority: low): `MOBILE_CHROME` in `src/lib/pill-nav.ts` (SH-08 thresholds and the 160 ms show delay) and `CORD` in `src/lib/theme-cord.ts` (with the 325 ms fling of decision 17). Approach: move the times to `presets.ts` and keep the geometry in lib.
- **Reload position** (priority: low): the appear engine binds on `DOMContentLoaded`; check on a deployed build that the scroll restored by the browser on reload (RT-14, decision 26) lands before the IntersectionObserver evaluates.

## Shell

- **The Blue eyes intercepted a click on the article back pill once** (priority: low). In Playwright, right after jumping back to the top from the footer, `[data-blue-eyes]` received the click meant for the back pill; it could not be reproduced. Approach: check that the launcher's eyes layer has `pointer-events: none` outside the launcher box while it floats.
- **Short pages load React and motion at once** (priority: low). On `/writings` (empty state) the footer's four `AquaButton` islands (`client:visible`) are in the first viewport, so React and motion load on first paint; `/about` also hydrates its Email button (`client:idle`) and the toolkit folder (`client:visible`, in view at 1440). The folder is the one island the reference design needs here. Approach: hueco-6's plan (a vanilla Aqua button) would remove the footer's share.

- **A cold load of `/#works` paints "Inicio" active for a frame** (priority: low): the SSR marks Home and the nav script corrects it. Approach: a tiny inline script, or mark the active link before the first paint from `location.hash`.

## SEO

- **The empty writings index is indexable** (priority: low, decisiones.md «Índice /writings en el sitemap aunque esté vacío»). Until an article is published, `/writings` and `/en/writings` are in the sitemap with only the empty state, thin content for a search engine. Approach: `noindex={writingsForLocale(all, locale).length === 0}` in WritingsIndexView plus a sitemap `filter` in astro.config, if Sebastian prefers it.

## Effects and WebGL

- **LCP of the writings index is the footer name** (priority: low). With the empty state the page is one viewport tall, so the footer scene's name, which appears with its reveal (SH-09…SH-13), becomes the LCP: Lighthouse mobile gives `/writings` performance 95 and a simulated LCP of 2.9 s (element render delay 705 ms), against 100 on `/about`. Approach: start the footer scene at its end state when the footer is already in the first viewport at load, or accept it until there are articles and the list is taller.

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
