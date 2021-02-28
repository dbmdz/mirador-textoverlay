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
  // the next most frequent color is the background. This can and should probably be tweaked
  // with some heuristics in the future (converting to HSL seems worthwhile), but it's good
  // enough for now.
  // FIXME: Testing with a cairo-backed canvas revelead that this approach relies a lot on
  //        the implementations in Firefox and Chrome, i.e. we got lucky. Needs more work
  //        to be more reliable and testable!
  const [textColor, bgColor] = Object.entries(colors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, v]) => k);
  return { textColor, bgColor };
}
