/**
 * The two closed paths of the CF monogram, exactly as `../assets/logo-cf.svg` holds them (a test
 * checks both stay equal), in the coordinates of its 310 × 345 viewBox.
 */
export const MONOGRAM_VIEW_BOX = { x: 341, y: 63, width: 310, height: 345 } as const;

export type Letter = 'C' | 'F';

export const MONOGRAM_PATHS: Record<Letter, string> = {
  C: 'M634 139 C601 97 561 78 511 78 C419 78 351 144 351 235 C351 326 420 386 511 386 C575 386 621 354 641 306 L633 302 C611 345 571 371 523 371 C448 371 393 316 393 232 C393 149 442 89 509 89 C556 89 591 121 615 164 L623 164 Z',
  F: 'M474 158 H620 L624 208 H616 C601 176 576 170 539 170 H519 V249 H542 C568 249 582 243 590 229 H598 V282 H590 C582 267 568 262 542 262 H519 V364 C519 386 523 393 540 396 V403 H473 V396 C489 393 492 386 492 364 V193 C492 174 488 167 474 165 Z',
};

export const LETTERS: readonly Letter[] = ['C', 'F'];

/**
 * What Fratres Display draws, measured in a headless browser against two fallbacks (a character is
 * the face's own when it measures the same under both): A–Z and 0–9 are all there, so the specimen
 * shows them whole.
 */
export const SPECIMEN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const SPECIMEN_DIGITS = '0123456789';

/** The tester's text as the face sets it: capitals only, at most `TESTER_MAX` characters. */
export const TESTER_MAX = 24;

export function testerText(input: string): string {
  return input.slice(0, TESTER_MAX).toLocaleUpperCase('es');
}
