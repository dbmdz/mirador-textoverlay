/** Convert a rgb(...) or rgba(...) string to its hexadecimal representation. */
export function toHexRgb(rgbColor) {
  if (!rgbColor?.startsWith('rgb')) {
    return rgbColor;
  }

  return `#${rgbColor
    .replace(/rgba?\((.+)\)/, '$1')
    .split(',')
    .slice(0, 3)
    .map((x) => x.trim())
    .map((x) => Number.parseInt(x, 10))
    .map((x) => x.toString(16))
    .join('')}`;
}

/** Parse RGB(A) channels from a rgb(...) or rgba(...) string */
function parseRgb(rgbColor) {
  return rgbColor
    .replace(/rgba?\((.+)\)/, '$1')
    .split(',')
    .map((x) => Number.parseInt(x.trim(), 10));
}

/** Calculate the luminance for a given RGB color.
 *
 * Algorithm and all constants taken from
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
 */
function luminance([r, g, b]) {
  const colors = [r, g, b].map((v) => {
    const vSrgb = v / 255;
    if (vSrgb <= 0.03928) {
      return vSrgb / 12.92;
    }
    return Math.pow((vSrgb + 0.055) / 1.055, 2.4);
  });
  return colors[0] * 0.2126 + colors[1] * 0.7152 + colors[2] * 0.0722;
}

/** Calculate the contrast between two RGB colors.
 *
 * Returned value is the contrast ratio, which is a number between 1 and 21.
 *
 * Algorithm and all constants taken from
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
 */
function contrast(colorA, colorB) {
  if (!Array.isArray(colorA)) {
    colorA = parseRgb(colorA);
  }
  if (!Array.isArray(colorB)) {
    colorB = parseRgb(colorB);
  }
  const luminanceA = luminance(colorA);
  const luminanceB = luminance(colorB);
  const brightest = Math.max(luminanceA, luminanceB);
  const darkest = Math.min(luminanceA, luminanceB);
  return (brightest + 0.05) / (darkest + 0.05);
}

/** Determine foreground and background color from text image. */
export function getPageColors({ data, width, height }, pageText) {
  const colors = new Map();
  const sampleMask = getTextSampleMask(width, height, pageText);
  // Group nearby colors so textured paper is treated as one dominant color
  // instead of many infrequent exact RGB values.
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (sampleMask && sampleMask[pixel] === 0) {
      continue;
    }
    const offset = pixel * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const color = colors.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    color.count += 1;
    color.r += r;
    color.g += g;
    color.b += b;
    colors.set(key, color);
  }

  const sorted = Array.from(colors.values()).sort((colorA, colorB) => colorB.count - colorA.count);
  const asRgb = ({ count, r, g, b }) =>
    `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
  const bgColor = asRgb(sorted[0]);
  const textColor =
    sorted
      .slice(1)
      .map(asRgb)
      .find((color) => contrast(bgColor, color) >= 7) ?? 'rgb(0,0,0)';
  return { textColor, bgColor };
}

/** Build a thumbnail-sized mask covering the union of all OCR line boxes. */
function getTextSampleMask(width, height, pageText) {
  if (!pageText?.width || !pageText?.height || !pageText.lines?.length) {
    return undefined;
  }

  const mask = new Uint8Array(width * height);
  const scaleX = width / pageText.width;
  const scaleY = height / pageText.height;
  for (const line of pageText.lines) {
    if (
      ![line.x, line.y, line.width, line.height].every(Number.isFinite) ||
      line.width <= 0 ||
      line.height <= 0
    ) {
      continue;
    }
    const left = Math.max(0, Math.floor(line.x * scaleX));
    const top = Math.max(0, Math.floor(line.y * scaleY));
    const right = Math.min(width, Math.ceil((line.x + line.width) * scaleX));
    const bottom = Math.min(height, Math.ceil((line.y + line.height) * scaleY));
    for (let y = top; y < bottom; y += 1) {
      mask.fill(1, y * width + left, y * width + right);
    }
  }
  return mask.some(Boolean) ? mask : undefined;
}
