/**
 * Worker host of the star field (EF-09): renders into the transferred OffscreenCanvas so the
 * 24 fps loop never touches the main thread.
 */
import { STARFIELD_FRAME_MS } from '@/lib/starfield';
import { createStarfield, type StarfieldMessage } from './stellar-field';

const scope = self as unknown as {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (id: number) => void;
  onmessage: ((event: MessageEvent<StarfieldMessage>) => void) | null;
};

// Dedicated workers have rAF in Chromium and Firefox; elsewhere a 24 fps timer does the job.
const raf = scope.requestAnimationFrame?.bind(scope);
const caf = scope.cancelAnimationFrame?.bind(scope);
const request = raf ?? ((callback: () => void) => Number(setTimeout(callback, STARFIELD_FRAME_MS)));
const cancel = (raf && caf) || ((id: number) => clearTimeout(id));

const handle = createStarfield(request, cancel);
scope.onmessage = (event) => handle(event.data);
