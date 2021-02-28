import fs from 'fs';
import { describe, it, jest, expect } from '@jest/globals';

import { parseOcr, parseAlto, parseHocr, parseIiifAnnotations } from '../../src/lib/ocrFormats';

import contentAsTextAnnos from '../../__fixtures__/anno_iifv2.json';

/** Helper for comparing floats.
 *
 * Taken from an SO answer by Brian Adams:
 * https://stackoverflow.com/a/53464807 (CC-BY-SA)
 */
const closeTo = (expected, precision = 1) => ({
  asymmetricMatch: (actual) => Math.abs(expected - actual) < Math.pow(10, -precision) / 2,
});

describe('parsing ALTO', () => {
  const altoMarkup = fs.readFileSync('__fixtures__/alto.xml', 'utf8');
  const parsed = parseAlto(altoMarkup, { height: 1925, width: 1248 });

  it('should work from the generic parser function', () => {
    expect(parseOcr(altoMarkup, { height: 1925, width: 1248 }).lines).toHaveLength(402);
  });

  it('should work for non-pixel based measurement units', () => {
    expect(parsed.lines).toHaveLength(402);
    expect(parsed.lines[32].text).toEqual('par les agents de police à leur disposition,\n');
    expect(parsed.lines[64]).toMatchObject({
      height: closeTo(12.59),
      text: "seiller d'Etat en mission extraordinaire.\n",
      width: closeTo(244.48),
      x: closeTo(82.28),
      y: closeTo(1236.09),
    });
    expect(parsed.lines[54].spans).toHaveLength(9);
    expect(parsed.lines[64].spans[6]).toMatchObject({
      height: closeTo(10.23),
      text: 'mission',
      width: closeTo(42.91),
      x: closeTo(189.36),
      y: closeTo(1237.27),
    });
  });

  it('should not add newlines at the end of hyphenated lines', () => {
    expect(parsed.lines[94].spans[10].text).toMatch('exa');
    expect(parsed.lines[96].spans[16].text).toMatch('Débats\n');
  });

  it('should convert style nodes to proper CSS', () => {
    expect(parsed.lines[96].spans[16].style).toBe(
      'font-family: Times New Roman;font-style: italic'
    );
  });
});

describe('parsing hOCR', () => {
  const hocrMarkup = fs.readFileSync('__fixtures__/hocr.html', 'utf8');

  it('should work from the generic parser function', () => {
    expect(parseOcr(hocrMarkup, { height: 2389, width: 1600 }).lines).toHaveLength(32);
  });

  it('should correctly parse the lines from the page', () => {
    const parsed = parseHocr(hocrMarkup, { height: 2389, width: 1600 });
    expect(parsed.lines).toHaveLength(32);
    expect(parsed.lines[29]).toMatchObject({
      height: 56,
      text: 'fiel er ihr ſchnell in die Rede, „aber wenn Sie — — —,',
      width: 1304,
      x: 219,
      y: 2097,
    });
    expect(parsed.lines[29].spans).toHaveLength(25);
    expect(parsed.lines[29].spans[14]).toMatchObject({
      height: 56,
      text: '„aber',
      width: 119,
      x: 922,
      y: 2097,
    });
    expect(parsed.lines[29].spans[15]).toMatchObject({
      height: 56,
      text: ' ',
      width: 21,
      x: 1041,
      y: 2097,
    });
    expect(parsed.lines[29].spans[24]).toMatchObject({
      height: 26,
      text: '—,\n',
      width: 70,
      x: 1453,
      y: 2121,
    });
  });

  it('should correctly scale the coordinates if the reference size does not mach', () => {
    const parsed = parseHocr(hocrMarkup, { height: 1792, width: 1200 });
    expect(parsed.lines[29]).toMatchObject({
      height: closeTo(56 * 0.75),
      width: closeTo(1304 * 0.75),
      x: closeTo(219 * 0.75),
      y: closeTo(2097 * 0.75),
    });
  });

  it('should warn when the aspect ratio of the reference dimensions does not match that of the page', () => {
    const origWarn = console.warn;
    const mockWarn = jest.fn();
    console.warn = mockWarn;
    parseHocr(hocrMarkup, { height: 1792, width: 1000 });
    console.warn = origWarn;
    expect(mockWarn).toHaveBeenCalled();
  });

  it('should ensure that whitespace spans have a minimum width', () => {
    const parsed = parseHocr(hocrMarkup, { height: 2389, width: 1600 });
    expect(parsed.lines[14].spans[9]).toMatchObject({
      text: ' ',
      width: 0.0001,
      x: 861.9999,
    });
  });
});

describe('parsing text from IIIF annotations', () => {
  it('should be able to parse IIIFv2 contentAsText annotations', () => {
    const parsed = parseIiifAnnotations(contentAsTextAnnos.resources, {
      height: 3372,
      width: 2411,
    });
    expect(parsed.lines).toHaveLength(29);
    expect(parsed.lines[2]).toMatchObject({
      height: 64,
      text: 'Herr Meerschweinchen, ist ganz schwarz und dunkeläugig wie ein',
      width: 2130,
      x: 116,
      y: 351,
    });
  });

  it('should be able to infer a page size if none is passed', () => {
    const parsed = parseIiifAnnotations(contentAsTextAnnos.resources);
    expect(parsed.width).toEqual(2261);
    expect(parsed.height).toEqual(3309);
  });
});
