# Todos

- Move `BLUE_OPEN_EVENT` from `hero-selection.client.ts` to the Blue module when Blue is built, and import it from there in the hero.
- When the Blue launcher lands, set `FEATURES.blue` to `true` in `src/data/features.ts` (shows "Ask Blue" and the ⌘ + ⌥ + / tip) and call `preventDefault()` on `pf:blue-open` in the launcher, or the hero rail will not play its check.
- Give the case back pill `data-mobile-chrome` and put `data-hero-image` on the case cover (RT-02) when the case study is built.
- If the Blue push (BL-05) animates `--pf-blue-offset`, register it with `@property` so the nav, cord and Stellar follow it.
