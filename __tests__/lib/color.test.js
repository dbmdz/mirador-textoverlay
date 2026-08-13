import { describe, expect, it } from 'vitest';

import { toHexRgb, getPageColors } from '../../src/lib/color';

describe('toHexRgb', () => {
  it('Should work with rgb strings', () => {
    expect(toHexRgb('rgb(170, 187, 204)')).toEqual('#aabbcc');
  });
  it('Should work with rgba strings', () => {
    expect(toHexRgb('rgb(170, 187, 204, 0.75)')).toEqual('#aabbcc');
  });
});

describe('getPageColors', () => {
  it('should be able to determine foreground and background from 4-pixel mock image', () => {
    const image = {
      data: [255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255],
      height: 1,
      width: 4,
    };
    const { textColor, bgColor } = getPageColors(image);
    expect(textColor).toEqual('rgb(255,255,255)');
    expect(bgColor).toEqual('rgb(0,0,0)');
  });

  it('should group nearby background colors', () => {
    const image = {
      data: [
        192, 160, 128, 255, 193, 161, 129, 255, 194, 162, 130, 255, 0, 0, 0, 255, 0, 0, 0,
        255,
      ],
      height: 1,
      width: 5,
    };
    const { textColor, bgColor } = getPageColors(image);
    expect(textColor).toEqual('rgb(0,0,0)');
    expect(bgColor).toEqual('rgb(193,161,129)');
  });

  it('should only sample colors inside OCR line boxes', () => {
    const image = {
      data: [
        192, 160, 128, 255, 193, 161, 129, 255, 0, 0, 0, 255, 0, 0, 0, 255, 194, 162,
        130, 255, 16, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
      ],
      height: 2,
      width: 4,
    };
    const pageText = {
      height: 2,
      lines: [{ x: 0, y: 0, width: 2, height: 2 }],
      width: 4,
    };
    const { textColor, bgColor } = getPageColors(image, pageText);
    expect(textColor).toEqual('rgb(16,0,0)');
    expect(bgColor).toEqual('rgb(193,161,129)');
  });
});
