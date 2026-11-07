/**
 * WebGL2 renderer of the technology wall (EF-06…EF-08): one canvas over the whole wall, one RG8
 * texture per mark, one draw per mark clipped with viewport + scissor. Bevel fields come from a
 * worker; until a mark's field arrives its DOM logo stays visible, then both cross-fade (EF-07).
 *
 * Loaded on demand by `metal-marks.client.ts` once the wall is near the viewport.
 */
import { followFactor, markQuad, minFrameMs, smoothstep01, type Rect } from './layout';
import { rasterizeMark } from './raster';
import { METAL_FRAGMENT, METAL_VERTEX } from './shader';
import {
  METAL_FADE_MS,
  METAL_RASTER,
  METAL_RUNTIME,
  METAL_TUNING,
  type MetalTuning,
} from './tuning';
import type { BevelRequest, BevelResponse } from './bevel.worker';
import type { ThemeName } from '@/components/portfolio/theme/theme.inline';

export interface FieldMarkSource {
  /** The DOM mark box (its parent is the grid cell). */
  element: HTMLElement;
  svg: SVGSVGElement;
  ratio: number;
}

export interface MetalFieldOptions {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  marks: readonly FieldMarkSource[];
  theme: ThemeName;
  reduced: boolean;
  onMarkReady(index: number): void;
  onFailure(): void;
}

interface Mark extends FieldMarkSource {
  quad: Rect;
  texture: WebGLTexture | null;
  texel: [number, number];
  ready: boolean;
  fade: number;
  /** Target and current offsets (px). */
  tx: number;
  ty: number;
  ox: number;
  oy: number;
  seed: number;
}

const UNIFORMS = [
  'u_field',
  'u_texel',
  'u_ratio',
  'u_time',
  'u_seed',
  'u_alpha',
  'u_scale',
  'u_dispersion',
  'u_edge',
  'u_blur',
  'u_liquid',
  'u_contrast',
  'u_lift',
  'u_high',
  'u_low',
] as const;

type Uniform = (typeof UNIFORMS)[number];

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('shader allocation failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`metal shader: ${log ?? 'compile error'}`);
  }
  return shader;
}

export class MetalField {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly onMarkReady: (index: number) => void;
  private readonly onFailure: () => void;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private loc = {} as Record<Uniform, WebGLUniformLocation | null>;
  private worker: Worker | null = null;
  private marks: Mark[] = [];
  private tuning: MetalTuning;
  private reduced: boolean;
  private time = 0;
  private dpr = 1;
  private visible = false;
  private pageVisible = true;
  private running = false;
  private destroyed = false;
  private failed = false;
  private frame = 0;
  private queued = 0;
  private last = 0;
  private readonly minFrame: number;

  constructor(options: MetalFieldOptions) {
    this.root = options.root;
    this.canvas = options.canvas;
    this.onMarkReady = options.onMarkReady;
    this.onFailure = options.onFailure;
    this.tuning = METAL_TUNING[options.theme];
    this.reduced = options.reduced;
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.minFrame = minFrameMs(
      coarse,
      navigator.hardwareConcurrency || 8,
      METAL_RUNTIME.lowEndFps,
      METAL_RUNTIME.lowEndCores,
    );
    this.marks = options.marks.map((source, index) => ({
      ...source,
      quad: { x: 0, y: 0, width: 0, height: 0 },
      texture: null,
      texel: [0, 0],
      ready: false,
      fade: 0,
      tx: 0,
      ty: 0,
      ox: 0,
      oy: 0,
      // Golden-ratio phases: neighbours never flow in step.
      seed: ((index * 0.618034) % 1) * 10,
    }));
    this.canvas.addEventListener('webglcontextlost', this.handleLost);
    try {
      this.init();
    } catch {
      this.fail();
    }
  }

  private init() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    });
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl;
    const program = gl.createProgram();
    if (!program) throw new Error('program allocation failed');
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, METAL_VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, METAL_FRAGMENT));
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('metal program link error');
    this.program = program;
    gl.useProgram(program);
    for (const name of UNIFORMS) this.loc[name] = gl.getUniformLocation(program, name);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.SCISSOR_TEST);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.uniform1i(this.loc.u_field, 0);
    this.applyTuning();

    this.worker = new Worker(new URL('./bevel.worker.ts', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', this.handleWorker);
    this.worker.addEventListener('error', () => this.fail());
    this.layout();
    void this.rasterizeAll();
  }

  private async rasterizeAll() {
    for (const [id, mark] of this.marks.entries()) {
      if (this.destroyed || this.failed) return;
      try {
        const raster = await rasterizeMark(mark.svg, mark.ratio);
        if (this.destroyed || this.failed || !this.worker) return;
        const request: BevelRequest = {
          id,
          width: raster.width,
          height: raster.height,
          alpha: raster.alpha,
          options: {
            insideAlpha: METAL_RASTER.insideAlpha,
            smoothRadius: METAL_RASTER.smoothing * Math.max(raster.width, raster.height),
          },
        };
        this.worker.postMessage(request, [raster.alpha.buffer]);
      } catch {
        // A mark that cannot be rasterised keeps its DOM logo.
      }
    }
  }

  private readonly handleWorker = (event: MessageEvent<BevelResponse>) => {
    const gl = this.gl;
    const { id, width, height, texels } = event.data;
    const mark = this.marks[id];
    if (!gl || !mark || this.destroyed) return;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, width, height, 0, gl.RG, gl.UNSIGNED_BYTE, texels);
    mark.texture = texture;
    mark.texel = [1 / width, 1 / height];
    mark.ready = true;
    mark.fade = this.reduced ? 1 : 0;
    this.onMarkReady(id);
    this.requestDraw();
  };

  private readonly handleLost = (event: Event) => {
    event.preventDefault();
    this.fail();
  };

  private fail() {
    if (this.failed) return;
    this.failed = true;
    this.destroy();
    this.onFailure();
  }

  /** Re-reads the canvas size and every mark's cell (call on resize). */
  layout() {
    const gl = this.gl;
    if (!gl) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, METAL_RUNTIME.maxDpr);
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const pixelW = Math.max(1, Math.round(width * this.dpr));
    const pixelH = Math.max(1, Math.round(height * this.dpr));
    if (this.canvas.width !== pixelW) this.canvas.width = pixelW;
    if (this.canvas.height !== pixelH) this.canvas.height = pixelH;
    const origin = this.root.getBoundingClientRect();
    for (const mark of this.marks) {
      const cell = mark.element.parentElement?.getBoundingClientRect();
      const box = { width: mark.element.offsetWidth, height: mark.element.offsetHeight };
      if (!cell || !box.width || !box.height) {
        mark.quad = { x: 0, y: 0, width: 0, height: 0 };
        continue;
      }
      const center = {
        x: cell.left - origin.left + cell.width / 2,
        y: cell.top - origin.top + cell.height / 2,
      };
      mark.quad = markQuad(center, box, mark.ratio);
    }
    this.requestDraw();
  }

  setOffset(index: number, x: number, y: number) {
    const mark = this.marks[index];
    if (!mark) return;
    mark.tx = x;
    mark.ty = y;
    if (this.reduced) {
      mark.ox = x;
      mark.oy = y;
    }
    this.requestDraw();
  }

  setTheme(theme: ThemeName) {
    this.tuning = METAL_TUNING[theme];
    this.applyTuning();
    this.requestDraw();
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) for (const mark of this.marks) if (mark.ready) mark.fade = 1;
    this.syncLoop();
    this.requestDraw();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.syncLoop();
  }

  setPageVisible(visible: boolean) {
    this.pageVisible = visible;
    this.syncLoop();
  }

  private applyTuning() {
    const gl = this.gl;
    if (!gl) return;
    const { loc, tuning } = this;
    gl.uniform1f(loc.u_scale, tuning.scale);
    gl.uniform1f(loc.u_dispersion, tuning.dispersion);
    gl.uniform1f(loc.u_edge, tuning.edge);
    gl.uniform1f(loc.u_blur, tuning.blur);
    gl.uniform1f(loc.u_liquid, tuning.liquid);
    gl.uniform1f(loc.u_contrast, tuning.contrast);
    gl.uniform1f(loc.u_lift, tuning.lift);
    gl.uniform3fv(loc.u_high, tuning.high);
    gl.uniform3fv(loc.u_low, tuning.low);
  }

  /** The autonomous loop runs only in view, with the tab visible and without reduced motion. */
  private syncLoop() {
    const run = !!this.gl && this.visible && this.pageVisible && !this.reduced && !this.destroyed;
    if (run && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    } else if (!run && this.running) {
      this.running = false;
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }

  private readonly tick = (now: number) => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.tick);
    const elapsed = now - this.last;
    if (elapsed < this.minFrame) return;
    this.last = now;
    this.draw(Math.min(elapsed, METAL_RUNTIME.maxFrameMs));
  };

  private requestDraw() {
    if (this.running || this.queued || !this.gl) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.draw(0);
    });
  }

  private draw(dt: number) {
    const gl = this.gl;
    if (!gl) return;
    const animate = this.running && !this.reduced;
    if (animate) this.time += (dt / 1000) * this.tuning.speed;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    gl.scissor(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.loc.u_time, this.time);
    const follow = followFactor(dt);
    for (const mark of this.marks) {
      if (!mark.ready || !mark.texture || mark.quad.width <= 0) continue;
      if (animate) {
        mark.fade = Math.min(1, mark.fade + dt / METAL_FADE_MS);
        mark.ox += (mark.tx - mark.ox) * follow;
        mark.oy += (mark.ty - mark.oy) * follow;
      } else {
        mark.fade = 1;
        mark.ox = mark.tx;
        mark.oy = mark.ty;
      }
      const w = Math.round(mark.quad.width * this.dpr);
      const h = Math.round(mark.quad.height * this.dpr);
      const x = Math.round((mark.quad.x + mark.ox) * this.dpr);
      const top = Math.round((mark.quad.y + mark.oy) * this.dpr);
      const y = height - top - h;
      if (x > width || y > height || x + w < 0 || y + h < 0) continue;
      gl.viewport(x, y, w, h);
      gl.scissor(Math.max(0, x), Math.max(0, y), w, h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mark.texture);
      gl.uniform2f(this.loc.u_texel, mark.texel[0], mark.texel[1]);
      gl.uniform1f(this.loc.u_ratio, mark.quad.width / mark.quad.height);
      gl.uniform1f(this.loc.u_seed, mark.seed);
      gl.uniform1f(this.loc.u_alpha, this.tuning.alpha * smoothstep01(mark.fade));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.queued);
    this.canvas.removeEventListener('webglcontextlost', this.handleLost);
    this.worker?.terminate();
    this.worker = null;
    const gl = this.gl;
    if (gl) {
      for (const mark of this.marks) if (mark.texture) gl.deleteTexture(mark.texture);
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.vao) gl.deleteVertexArray(this.vao);
      if (this.program) gl.deleteProgram(this.program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.gl = null;
    this.marks = [];
  }
}
