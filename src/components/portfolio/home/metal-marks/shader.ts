/**
 * Liquid-metal shader of the technology wall (EF-06), written for this site.
 *
 * Model: the mark is a bevelled slab (height from `bevel.ts`) mirroring a striped "sky over horizon"
 * environment. The reflected coordinate runs along a slowly turning diagonal, is pushed by the
 * height (bands wrap around the relief), by the slope near the outline (rim refraction) and by a
 * value-noise fbm (liquid flow), and scrolls with time. Each channel samples the chrome ramp at a
 * slightly different coordinate, which splits colours on the band edges (dispersion).
 */

export const METAL_VERTEX = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  // uv (0,0) is the top-left texel row: textures are uploaded top row first.
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const METAL_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_field;   // r: coverage, g: height
uniform vec2 u_texel;        // 1 / texture size
uniform float u_ratio;       // quad width / height
uniform float u_time;
uniform float u_seed;
uniform float u_alpha;
uniform float u_scale;
uniform float u_dispersion;
uniform float u_edge;
uniform float u_blur;
uniform float u_liquid;
uniform float u_contrast;
uniform float u_lift;
uniform vec3 u_high;
uniform vec3 u_low;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float flow(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    sum += amp * valueNoise(p);
    p = mat2(1.6, -1.2, 1.2, 1.6) * p + vec2(3.1, 7.7);
    amp *= 0.5;
  }
  return sum;
}

// Chrome ramp over one band: bright sky fading to a sharp horizon, then dark ground lifting
// towards the next band, with one thin bright line in the ground. w = edge softness in band units;
// once a band gets thinner than a few pixels the ramp fades to its mean, so thin strokes stay calm.
float chrome(float x, float w) {
  float f = fract(x);
  float sky = mix(1.0, 0.6, f / 0.46);
  float ground = mix(0.03, 0.44, (f - 0.46) / 0.54);
  float v = mix(sky, ground, smoothstep(0.46 - w, 0.46 + w, f));
  float seam = 0.5 * (1.0 + 0.44);
  v = mix(v, seam, smoothstep(1.0 - w, 1.0, f) * 0.5);
  v = mix(v, seam, (1.0 - smoothstep(0.0, w, f)) * 0.5);
  v += 0.38 * (1.0 - smoothstep(0.0, 0.012 + w, abs(f - 0.8)));
  return mix(clamp(v, 0.0, 1.0), 0.52, smoothstep(0.12, 0.45, w));
}

void main() {
  vec4 field = texture(u_field, v_uv);
  float coverage = field.r;
  if (coverage < 0.004) discard;
  float h = field.g;

  float hx = texture(u_field, v_uv + vec2(u_texel.x, 0.0)).g - texture(u_field, v_uv - vec2(u_texel.x, 0.0)).g;
  float hy = texture(u_field, v_uv + vec2(0.0, u_texel.y)).g - texture(u_field, v_uv - vec2(0.0, u_texel.y)).g;
  // Slope in height per unit of mark height, softly saturated.
  vec2 slope = vec2(hx / (u_texel.x * u_ratio), hy / u_texel.y) * 0.5;
  slope = slope / (1.0 + length(slope));

  vec2 p = (v_uv - 0.5) * vec2(u_ratio, 1.0);
  // u_time grows by the tuning speed per second (EF-06); the pattern runs a few bands per time unit.
  float t = (u_time + u_seed) * 4.5;
  float rim = (1.0 - h) * (1.0 - h);

  float angle = 0.78 + 0.18 * sin(t * 0.9 + u_seed * 3.0);
  vec2 dir = vec2(cos(angle), sin(angle));
  float n = flow(p * 1.6 + vec2(t * 0.7, -t * 0.5)) - 0.5;

  float x = dot(p, dir) * 0.42;
  x -= h * 0.78;
  x += dot(slope, dir) * u_edge * 0.5;
  x += rim * u_edge * n * 0.3;
  x += u_liquid * 2.0 * n;
  x = x * u_scale * 0.6 - t;

  float w = fwidth(x) * 1.2 + u_blur * u_scale;
  float split = u_dispersion * (1.0 + 3.0 * rim) * 1.5;
  vec3 ramp = vec3(chrome(x + split, w), chrome(x, w), chrome(x - split, w));
  ramp = clamp((ramp - 0.5) * u_contrast + 0.5 + u_lift, 0.0, 1.0);
  vec3 color = mix(u_low, u_high, ramp);

  float a = coverage * u_alpha;
  fragColor = vec4(color * a, a);
}
`;
