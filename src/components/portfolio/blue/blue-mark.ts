/**
 * Blue's launcher figure: a soft blue speech bubble with two eyes that follow the pointer and blink
 * (BL-01, BL-13; decisiones.md 4). Drawn for this site after the reference mascot's silhouette, size
 * and colours (measured, not copied: the reference renders a three.js model): a superellipse
 * (n = 3, 94 × 78.6 px, centred at 43.85, 43.3) with the tail at the bottom right, in the
 * launcher's own pixels (0 0 is the top left of the 88 px button; the bubble overflows it a little,
 * as the reference's does). Colours are the `--pf-blue-mark-*` tokens.
 */
export const BLUE_MARK = {
  /** Room around the button for the bubble, its tail and the soft rim. */
  viewBox: '-8 -6 104 114',
  body:
    'M24.7 81.7L22.3 81.31L20.06 80.84L17.97 80.3L16 79.69L14.15 79.01L12.4 78.25L10.77 77.42' +
    'L9.22 76.52L7.78 75.54L6.43 74.49L5.17 73.37L3.99 72.16L2.91 70.88L1.92 69.51L1.01 68.06' +
    'L.19 66.51L-.54 64.87L-1.19 63.13L-1.75 61.26L-2.22 59.26L-2.61 57.09L-2.91 54.71' +
    'L-3.13 52.02L-3.26 48.8L-3.3 43.3L-3.26 37.8L-3.13 34.58L-2.91 31.89L-2.61 29.51' +
    'L-2.22 27.34L-1.75 25.34L-1.19 23.47L-.54 21.73L.19 20.09L1.01 18.54L1.92 17.09' +
    'L2.91 15.72L3.99 14.44L5.17 13.23L6.43 12.11L7.78 11.06L9.22 10.08L10.77 9.18L12.4 8.35' +
    'L14.15 7.59L16 6.91L17.97 6.3L20.06 5.76L22.3 5.29L24.7 4.9L27.3 4.57L30.16 4.32' +
    'L33.39 4.14L37.25 4.04L43.85 4L50.45 4.04L54.31 4.14L57.54 4.32L60.4 4.57L63 4.9' +
    'L65.4 5.29L67.64 5.76L69.73 6.3L71.7 6.91L73.55 7.59L75.3 8.35L76.93 9.18L78.48 10.08' +
    'L79.92 11.06L81.27 12.11L82.53 13.23L83.71 14.44L84.79 15.72L85.78 17.09L86.69 18.54' +
    'L87.51 20.09L88.24 21.73L88.89 23.47L89.45 25.34L89.92 27.34L90.31 29.51L90.61 31.89' +
    'L90.83 34.58L90.96 37.8L91 43.3L90.96 48.8L90.83 52.02L90.61 54.71L90.31 57.09' +
    'L89.92 59.26L89.45 61.26L88.89 63.13L88.24 64.87L87.51 66.51L86.69 68.06L85.78 69.51' +
    'L84.79 70.88L83.71 72.16L82.53 73.37L81.27 74.49L79.92 75.54L78.48 76.52L76.93 77.42' +
    'L75.3 78.25L73.85 78.89C71.65 80.49 69.6 83.2 69.7 88L70.2 97.6Q70.4 100.6 67.6 99.4' +
    'C56 93.6 42 86.4 24.7 81.7Z',
  /** Body gradient, top to bottom, in the same pixels. */
  gradient: { y1: 6, y2: 80 },
  /** The tail lightens towards its tip. */
  tail: { x1: 58, y1: 80, x2: 70, y2: 99, rect: { x: 30, y: 76, width: 50, height: 30 } },
  /** Light rim inside the edge: stroke width and blur (px). */
  rim: { width: 4.4, blur: 1.2 },
  /** Softens the whole silhouette (px). */
  soften: 0.4,
} as const;
