# Todos

- Move `BLUE_OPEN_EVENT` from `hero-selection.client.ts` to the Blue module when Blue is built, and import it from there in the hero.
- When the Blue launcher lands, set `FEATURES.blue` to `true` in `src/data/features.ts` (shows "Ask Blue" and the ⌘ + ⌥ + / tip) and call `preventDefault()` on `pf:blue-open` in the launcher, or the hero rail will not play its check.
- If the Blue push (BL-05) animates `--pf-blue-offset`, register it with `@property` so the nav, cord and Stellar follow it.
- Phase 5: swap each `<DemoSlot name="…">` for its `<DemoFrame>`; the names are also in the frontmatter `demos`.
- Contrast (decisiones.md 20): when Sebastian picks the new `--pf-meta-dim`, also change the end opacity of the `fadeUpY20O040SpringB000040` preset (`tokens.test.ts` fails until both match).
- When the first real article is published, delete both `src/content/writings/{es,en}/articulo-de-ejemplo.mdx` (marked example drafts, `draft: true`).
- /about readings: when Sebastian sends his list, fill `src/data/readings.ts` (`{ title, author, meta }`); the neutral books disappear by themselves.
- /about: replace the toolkit sticker stamps (`simple-icons`) if Sebastian prefers his own illustrations; the collections are in `src/data/toolkit.ts`.
