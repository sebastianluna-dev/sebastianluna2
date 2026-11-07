/**
 * The page motion engine. Only WAAPI: `engine.motion.ts` was dropped by the hybrid decision
 * (animation-inventory.md §3.3); `motion/react` lives inside on-demand islands only.
 */
export { waapiEngine as engine, supportsLinearEasing } from './engine.waapi';
