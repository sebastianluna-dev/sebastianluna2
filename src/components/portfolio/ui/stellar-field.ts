/**
 * Canvas renderer of the star field (EF-09). Runs inside `stellar.worker.ts` with an
 * OffscreenCanvas, or on the main thread when workers or OffscreenCanvas are missing.
 * It only speaks messages, so both hosts drive it the same way.
 *
 * Every star is a sprite drawn once into an atlas (size bucket × brightness level); a frame is a
 * sky fill plus one `drawImage` per star, at 24 fps.
 */
import {
  STARFIELD,
  createStars,
  frameDue,
  starAlpha,
  starLevel,
  starPosition,
  twinkle,
  type Star,
} from '@/lib/starfield';

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type StarfieldMessage =
  | {
      type: 'init';
      canvas: AnyCanvas | null;
      width: number;
      height: number;
      dpr: number;
      /** Opaque sky colour behind the stars. */
      sky: string;
      /** `performance.timeOrigin` of the page, so worker and page share one clock. */
      origin: number;
    }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'run'; on: boolean; still: boolean };

type FrameRequest = (callback: () => void) => number;
type FrameCancel = (id: number) => void;

const TAU = Math.PI * 2;
/** Ray stroke width of the big stars (CSS px). */
const RAY_WIDTH = 0.5;
/** Cell padding (px) around each sprite. */
const CELL_PAD = 4;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: AnyCanvas, opaque: boolean): Context2D | null {
  return canvas.getContext('2d', { alpha: !opaque }) as Context2D | null;
}

interface Atlas {
  image: AnyCanvas;
  smallCell: number;
  bigCell: number;
  scale: number;
}

/** Draws one sprite centred on (cx, cy) in device px. `level` goes from −1 (trough) to 1 (crest). */
function drawSprite(
  ctx: Context2D,
  radius: number,
  big: boolean,
  level: number,
  cx: number,
  cy: number,
  scale: number,
) {
  const crest = (level + 1) / 2;
  const glow = radius * (STARFIELD.glowBase + crest * STARFIELD.glowGrowth) * scale;
  const glowAlpha = 0.4 * (0.5 + crest * 0.5);
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.2 * scale, cx, cy, glow);
  halo.addColorStop(0, `rgba(255,255,255,${glowAlpha * 0.8})`);
  halo.addColorStop(0.6, `rgba(255,255,255,${glowAlpha * 0.3})`);
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - glow, cy - glow, glow * 2, glow * 2);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.5 * scale, 0, TAU);
  ctx.fill();

  if (!big) return;
  const strength = Math.min(
    STARFIELD.alphaMax,
    Math.max(STARFIELD.alphaMinBig, 0.85 + level * 0.35),
  );
  const reach = radius * STARFIELD.rayLength * scale;
  ctx.lineWidth = RAY_WIDTH * scale;
  for (let i = 0; i < 4; i++) {
    const angle = (i * TAU) / 4;
    const ex = cx + Math.cos(angle) * reach;
    const ey = cy + Math.sin(angle) * reach;
    const ray = ctx.createLinearGradient(cx, cy, ex, ey);
    ray.addColorStop(0, `rgba(255,255,255,${0.55 * strength})`);
    ray.addColorStop(0.35, `rgba(255,255,255,${0.18 * strength})`);
    ray.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = ray;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
}

function buildAtlas(scale: number): Atlas | null {
  const { smallSizes, bigSizes, levels } = STARFIELD;
  const maxBig = bigSizes[bigSizes.length - 1];
  // Small sprites have no rays: the widest glow (at the crest) of a unit radius fits every bucket.
  const smallCell = Math.ceil(2 * (STARFIELD.glowBase + STARFIELD.glowGrowth) * scale) + CELL_PAD;
  const bigCell = Math.ceil(2 * maxBig * STARFIELD.rayLength * scale) + CELL_PAD;
  const image = makeCanvas(
    levels * Math.max(smallCell, bigCell),
    smallSizes.length * smallCell + bigSizes.length * bigCell,
  );
  const ctx = context(image, false);
  if (!ctx) return null;
  for (let l = 0; l < levels; l++) {
    const level = -1 + (2 * l) / (levels - 1);
    smallSizes.forEach((size, row) =>
      drawSprite(
        ctx,
        size,
        false,
        level,
        l * smallCell + smallCell / 2,
        row * smallCell + smallCell / 2,
        scale,
      ),
    );
    bigSizes.forEach((size, row) =>
      drawSprite(
        ctx,
        size,
        true,
        level,
        l * bigCell + bigCell / 2,
        smallSizes.length * smallCell + row * bigCell + bigCell / 2,
        scale,
      ),
    );
  }
  return { image, smallCell, bigCell, scale };
}

/** Creates the renderer; feed it messages. `request`/`cancel` are the host's frame clock. */
export function createStarfield(request: FrameRequest, cancel: FrameCancel) {
  const stars: Star[] = createStars();
  let canvas: AnyCanvas | null = null;
  let ctx: Context2D | null = null;
  let atlas: Atlas | null = null;
  let width = 1;
  let height = 1;
  let scale = 1;
  let sky = '#000';
  let origin = 0;
  let running = false;
  let still = false;
  let frame = 0;
  let lastFrame = 0;

  const now = () => performance.timeOrigin + performance.now() - origin;

  const draw = (time: number) => {
    if (!ctx || !canvas) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!atlas) return;
    const smallRows = STARFIELD.smallSizes.length * atlas.smallCell;
    for (const star of stars) {
      const phase = twinkle(star, time, still);
      const [x, y] = starPosition(star, time, width, height, still);
      const cell = star.big ? atlas.bigCell : atlas.smallCell;
      const row = star.big
        ? smallRows + star.bucket * atlas.bigCell
        : star.bucket * atlas.smallCell;
      ctx.globalAlpha = starAlpha(star, phase);
      ctx.drawImage(
        atlas.image,
        starLevel(phase) * cell,
        row,
        cell,
        cell,
        Math.round(x * scale - cell / 2),
        Math.round(y * scale - cell / 2),
        cell,
        cell,
      );
    }
    ctx.globalAlpha = 1;
  };

  const loop = () => {
    frame = request(loop);
    const time = now();
    if (!frameDue(time, lastFrame)) return;
    lastFrame = time;
    draw(time);
  };

  const resize = (w: number, h: number, dpr: number) => {
    if (!canvas) return;
    width = Math.max(1, w);
    height = Math.max(1, h);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!atlas || atlas.scale !== dpr) atlas = buildAtlas(dpr);
    scale = dpr;
    draw(still ? 0 : now());
  };

  return (message: StarfieldMessage) => {
    if (message.type === 'init') {
      canvas = message.canvas;
      if (!canvas) return;
      ctx = context(canvas, true);
      sky = message.sky;
      origin = message.origin;
      resize(message.width, message.height, message.dpr);
    } else if (message.type === 'resize') {
      resize(message.width, message.height, message.dpr);
    } else {
      still = message.still;
      const on = message.on && !message.still;
      if (on && !running) {
        running = true;
        lastFrame = 0;
        frame = request(loop);
      } else if (!on && running) {
        running = false;
        cancel(frame);
      }
      if (still) draw(0);
    }
  };
}
