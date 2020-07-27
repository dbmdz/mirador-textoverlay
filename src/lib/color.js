/**
 * Change alpha/opacity of a color.
 *
 * Input can be an RGB color as a hex string or in `rgba(...)` form.
 *
 * Based on https://gist.github.com/danieliser/b4b24c9f772066bcf0a6
 */
export const changeAlpha = (color, opacity) => {
  if (color[0] === '#') {
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex += hex;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  if (color.startsWith('rgba')) {
    return color.replace(/[^,]+(?=\))/, opacity);
  }
  console.error(`Unsupported color: ${color}`);
  return color;
};
