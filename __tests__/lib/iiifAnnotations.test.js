import { describe, expect, it } from 'vitest';

import {
  asArray,
  flattenBodies,
  getAnnotationModel,
  getBodyId,
  getBodyValue,
  hasMotivation,
  mapBodies,
} from '../../src/lib/iiifAnnotations';

describe('IIIF annotation normalization', () => {
  it.each([
    [undefined, []],
    ['supplementing', ['supplementing']],
    [['supplementing'], ['supplementing']],
  ])('normalizes array-valued properties', (value, expected) => {
    expect(asArray(value)).toEqual(expected);
  });

  it.each([
    [{ resources: ['v2'] }, { annotations: ['v2'], bodyKey: 'resource', isV3: false }],
    [{ items: ['v3'] }, { annotations: ['v3'], bodyKey: 'body', isV3: true }],
  ])('normalizes annotation page structure', (page, expected) => {
    expect(getAnnotationModel(page)).toEqual(expected);
  });

  it('handles scalar and array motivations', () => {
    expect(hasMotivation({ motivation: 'supplementing' }, 'supplementing')).toBe(true);
    expect(hasMotivation({ motivation: ['reviewing', 'supplementing'] }, 'supplementing')).toBe(true);
  });

  it('reads identifiers and text from v2 and v3 bodies', () => {
    expect(getBodyId('https://example.org/text')).toBe('https://example.org/text');
    expect(getBodyId({ '@id': 'v2' })).toBe('v2');
    expect(getBodyId({ id: 'v3' })).toBe('v3');
    expect(getBodyValue({ chars: 'v2 text' })).toBe('v2 text');
    expect(getBodyValue({ value: 'v3 text' })).toBe('v3 text');
  });

  it('flattens and transforms arrays and Choice bodies', () => {
    const body = {
      items: ['external', { type: 'TextualBody', value: 'embedded' }],
      type: 'Choice',
    };
    expect(flattenBodies([body])).toEqual(body.items);
    expect(mapBodies(body, (item) => (item === 'external' ? 'resolved' : item))).toEqual({
      ...body,
      items: ['resolved', body.items[1]],
    });
  });
});
