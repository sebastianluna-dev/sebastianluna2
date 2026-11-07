/**
 * Bevel field of a rasterised mark (EF-06, our own technique): exact Euclidean distance to the
 * outline (Felzenszwalb–Huttenlocher), normalised per connected shape so a thin letter gets the same
 * relief as a heavy glyph, smoothed to soften the medial ridges and shaped into a rounded shoulder.
 *
 * Output: RG8 texels, R = coverage (the raster alpha) and G = height 0 (outline) … 255 (ridge).
 * Pure and synchronous: the worker calls it, and so do the tests.
 */

const INF = 1e20;

/** Squared 1D distance transform of `f` (0 at sources, INF elsewhere), written into `out`. */
function edt1d(f: Float64Array, n: number, out: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const d = q - v[k];
    out[q] = d * d + f[v[k]];
  }
}

/** Euclidean distance (px) from every inside pixel to the nearest outside one; outside = 0. */
export function distanceToOutline(inside: Uint8Array, width: number, height: number): Float32Array {
  const size = Math.max(width, height) + 1;
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  const grid = new Float64Array(width * height);
  // The image border counts as outside: pad each run with a virtual outside pixel at both ends.
  for (let x = 0; x < width; x++) {
    f[0] = 0;
    for (let y = 0; y < height; y++) f[y + 1] = inside[y * width + x] ? INF : 0;
    f[height + 1] = 0;
    edt1d(f, height + 2, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y + 1];
  }
  for (let y = 0; y < height; y++) {
    f[0] = 0;
    for (let x = 0; x < width; x++) f[x + 1] = grid[y * width + x];
    f[width + 1] = 0;
    edt1d(f, width + 2, d, v, z);
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x + 1];
  }
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = inside[i] ? Math.sqrt(grid[i]) : 0;
  return out;
}

/** 4-connected labels of the inside pixels (0 = outside) and the number of shapes. */
export function labelShapes(inside: Uint8Array, width: number, height: number) {
  const labels = new Int32Array(width * height);
  const stack = new Int32Array(width * height);
  let count = 0;
  for (let start = 0; start < labels.length; start++) {
    if (!inside[start] || labels[start]) continue;
    count++;
    let top = 0;
    stack[top++] = start;
    labels[start] = count;
    while (top) {
      const i = stack[--top];
      const x = i % width;
      const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width];
      for (const j of neighbours) {
        if (j < 0 || j >= labels.length || !inside[j] || labels[j]) continue;
        labels[j] = count;
        stack[top++] = j;
      }
    }
  }
  return { labels, count };
}

/** Separable box blur with clamped edges, in place over `values` (radius in px). */
function boxBlur(values: Float32Array, width: number, height: number, radius: number) {
  if (radius < 1) return;
  const r = Math.round(radius);
  const tmp = new Float32Array(values.length);
  const pass = (
    src: Float32Array,
    dst: Float32Array,
    len: number,
    lines: number,
    step: number,
    stride: number,
  ) => {
    for (let line = 0; line < lines; line++) {
      const base = line * stride;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[base + Math.min(len - 1, Math.max(0, k)) * step];
      for (let i = 0; i < len; i++) {
        dst[base + i * step] = acc / (2 * r + 1);
        const add = Math.min(len - 1, i + r + 1);
        const drop = Math.max(0, i - r);
        acc += src[base + add * step] - src[base + drop * step];
      }
    }
  };
  pass(values, tmp, width, height, 1, width);
  pass(tmp, values, height, width, width, 1);
}

export interface BevelOptions {
  /** Alpha (0–255) from which a pixel counts as inside. */
  insideAlpha: number;
  /** Ridge smoothing radius, px. */
  smoothRadius: number;
}

/** RG8 bevel texels for an RGBA raster's alpha channel (`alpha`, one byte per pixel). */
export function bevelField(
  alpha: Uint8Array,
  width: number,
  height: number,
  options: BevelOptions,
): Uint8Array {
  const n = width * height;
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) inside[i] = alpha[i] >= options.insideAlpha ? 1 : 0;

  const distance = distanceToOutline(inside, width, height);
  const { labels, count } = labelShapes(inside, width, height);
  const peak = new Float32Array(count + 1);
  for (let i = 0; i < n; i++)
    if (labels[i] && distance[i] > peak[labels[i]]) peak[labels[i]] = distance[i];
  const field = new Float32Array(n);
  for (let i = 0; i < n; i++) field[i] = labels[i] ? distance[i] / peak[labels[i]] : 0;

  boxBlur(field, width, height, options.smoothRadius);

  const out = new Uint8Array(n * 2);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, field[i]));
    const shoulder = 1 - (1 - t) * (1 - t);
    out[i * 2] = alpha[i];
    out[i * 2 + 1] = alpha[i] ? Math.round(shoulder * 255) : 0;
  }
  return out;
}
