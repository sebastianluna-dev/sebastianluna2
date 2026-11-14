export interface Point {
  x: number;
  y: number;
}

/** One anchor of a path, with the control handles that leave and reach it (null on a corner). */
export interface Anchor extends Point {
  in: Point | null;
  out: Point | null;
}

const TOKEN = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?|[a-z]/gi;

/**
 * The anchors of an SVG path made of absolute M, C, L, H, V and Z commands, in drawing order: each
 * cubic gives its first control point to the anchor it leaves and its second to the anchor it
 * reaches. A closing point that repeats the start of its subpath is merged into it, so a closed
 * outline lists every anchor once.
 */
export function pathAnchors(d: string): Anchor[] {
  const tokens = d.match(TOKEN) ?? [];
  const anchors: Anchor[] = [];
  let start = 0;
  let command = '';
  let index = 0;

  const number = (): number => {
    const token = tokens[index++];
    const value = Number(token);
    if (token === undefined || Number.isNaN(value))
      throw new Error(`Bad path data near «${token}»`);
    return value;
  };
  const last = (): Anchor => {
    const anchor = anchors[anchors.length - 1];
    if (!anchor) throw new Error('Path data must start with M');
    return anchor;
  };
  const push = (x: number, y: number, handleIn: Point | null = null) => {
    anchors.push({ x, y, in: handleIn, out: null });
  };

  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    if (/^[a-z]$/i.test(token)) {
      if (token !== token.toUpperCase()) throw new Error(`Relative command «${token}» unsupported`);
      command = token;
      index++;
      if (command === 'Z') {
        closeSubpath(anchors, start);
        start = anchors.length;
        continue;
      }
    }
    if (command !== 'M' && anchors.length === 0) throw new Error('Path data must start with M');
    switch (command) {
      case 'M':
        start = anchors.length;
        push(number(), number());
        command = 'L'; // Extra pairs after M are lines.
        break;
      case 'L':
        push(number(), number());
        break;
      case 'H':
        push(number(), last().y);
        break;
      case 'V':
        push(last().x, number());
        break;
      case 'C': {
        const from = last();
        from.out = { x: number(), y: number() };
        const handleIn = { x: number(), y: number() };
        push(number(), number(), handleIn);
        break;
      }
      default:
        throw new Error(`Unsupported path data «${token}»`);
    }
  }
  return anchors;
}

/** Merges the last anchor of a subpath into its first when the outline ends where it began. */
function closeSubpath(anchors: Anchor[], start: number) {
  const first = anchors[start];
  const end = anchors[anchors.length - 1];
  if (!first || !end || end === first || end.x !== first.x || end.y !== first.y) return;
  first.in = end.in;
  anchors.pop();
}
