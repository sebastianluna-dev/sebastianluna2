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

## Content and media

- **Project covers are 16:9 captures cropped to 4:3** (priority: low), and only Reto MD has hover-zone images. Approach: own 4:3 crops and 2–3 views per project in each MDX `zones`.
- **Footer portrait** (priority: low): the hands are an SVG drawing and the head a crop of the 3:4 portrait (less face than the reference). Approach: a transparent photo of the hands gripping an edge (~2.17:1) and a dedicated head crop.
