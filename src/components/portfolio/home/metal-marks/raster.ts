/**
 * Rasterises the inline SVG of a DOM mark to an alpha mask (EF-06): solid black shape on a clear
 * canvas, centred with the raster margin, at the size `rasterSize` picks for its ratio.
 */
import { rasterSize } from './layout';
import { METAL_RASTER } from './tuning';

export interface MarkRaster {
  width: number;
  height: number;
  /** One byte per pixel: the canvas alpha. */
  alpha: Uint8Array;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('mark raster failed'));
    image.src = url;
  });
}

/** Serialises `svg` as a standalone black shape of `width` × `height` px. */
function standalone(svg: SVGSVGElement, width: number, height: number): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.setAttribute('fill', '#000');
  copy.removeAttribute('class');
  copy.removeAttribute('style');
  for (const node of copy.querySelectorAll('[fill]')) node.setAttribute('fill', '#000');
  return new XMLSerializer().serializeToString(copy);
}

export async function rasterizeMark(svg: SVGSVGElement, ratio: number): Promise<MarkRaster> {
  const { width, height } = rasterSize(ratio);
  const long = Math.max(width, height);
  // Shape box inside the margin: the margin is a share of the shape's long side on every edge.
  const scale = 1 / (1 + 2 * METAL_RASTER.margin);
  const shapeW = ratio >= 1 ? long * scale : long * scale * ratio;
  const shapeH = shapeW / ratio;
  const url = URL.createObjectURL(
    new Blob([standalone(svg, Math.round(shapeW), Math.round(shapeH))], { type: 'image/svg+xml' }),
  );
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('2d context unavailable');
    context.drawImage(image, (width - shapeW) / 2, (height - shapeH) / 2, shapeW, shapeH);
    const rgba = context.getImageData(0, 0, width, height).data;
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    return { width, height, alpha };
  } finally {
    URL.revokeObjectURL(url);
  }
}
