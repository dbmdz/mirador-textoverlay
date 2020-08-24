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
  // NOTE: We should really test with actual images here, but unfortunately our current algorithm
  //       relies on the way Gecko and WebKit render images, which seems to drastically differ from
  //       the way the Cairo canvas that we have available in the test env renders them ¯\_(ツ)_/¯
  it('should be able to determine foreground and background from 4-pixel mock image', () => {
    const mockData = [255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255];
    const { textColor, bgColor } = getPageColors(mockData);
    expect(textColor).toEqual('rgb(0,0,0)');
    expect(bgColor).toEqual('rgb(255,255,255)');
  });
});
