import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  arc() {},
  beginPath() {},
  clearRect() {},
  clip() {},
  closePath() {},
  createImageData() {
    return [];
  },
  drawImage() {},
  fill() {},
  fillRect() {},
  fillText() {},
  getImageData() {
    return { data: [] };
  },
  lineTo() {},
  measureText() {
    return { width: 0 };
  },
  moveTo() {},
  putImageData() {},
  rect() {},
  restore() {},
  rotate() {},
  save() {},
  scale() {},
  setTransform() {},
  stroke() {},
  transform() {},
  translate() {},
}));

afterEach(() => {
  cleanup();
  document.querySelectorAll('.openseadragon-canvas').forEach((el) => el.remove());
});
