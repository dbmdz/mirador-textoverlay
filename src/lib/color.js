/* eslint-disable no-param-reassign */

/** Convert a rgb(...) or rgba(...) string to its hexadecimal representation. */
export function toHexRgb(rgbColor) {
  if (!rgbColor || !rgbColor.startsWith('rgb')) {
    return rgbColor;
  }
  // eslint-disable-next-line prefer-template
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
export function getPageColors(imgData) {
  const colors = {};
  // Data is a flat array containing the image pixels as uint8 RGBA values in the range [0, 255]
  for (let i = 0; i < imgData.length - 3; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const rgb = `rgb(${r},${g},${b})`;
    colors[rgb] = (colors[rgb] ?? 0) + 1;
  }
  // Really simple algorithm: The most frequent color is always going to be the text color,
  // the next most frequent color that has a contrast of at least 7:1 with the text color is
  // the background. If no background color matches this criterioin, we use black or white,
  // depending on the text color.
  // This can and should probably be tweaked with some additional heuristics in the future
  // (converting to HSL seems worthwhile), but it's good enough for now.
  // FIXME: Testing with a cairo-backed canvas reveled that this approach relies a lot on
  //        the implementations in Firefox and Chrome, i.e. we got lucky. Needs more work
  //        to be more reliable and testable!
  const sorted = Object.entries(colors).sort(([, freqA], [, freqB]) => freqB - freqA);
  const textColor = sorted[0][0];
  // Add fallback colors to list of candidate colors
  sorted.push(['rgba(0, 0, 0)', 0], ['rgb(255, 255, 255)', 0]);
  const bgColor = sorted.slice(1).find(([color]) => contrast(textColor, color) >= 7)[0];
  return { textColor, bgColor };
}
