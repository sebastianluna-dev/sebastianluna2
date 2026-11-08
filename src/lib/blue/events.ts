/**
 * Window event that asks the Blue launcher to open the panel ("Ask Blue" in the hero, HE-12). It is
 * cancelable: the launcher calls `preventDefault()` when it takes it, so the sender knows the click
 * did something (R-06). Shared here so neither side imports the other's client module.
 */
export const BLUE_OPEN_EVENT = 'pf:blue-open';
