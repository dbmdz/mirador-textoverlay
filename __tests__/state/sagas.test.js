import fetch from 'isomorphic-unfetch';
import { select, call } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import { describe, expect, it, vi } from 'vitest';
import {
  ActionTypes,
  getCanvases,
  getVisibleCanvases,
  getWindowConfig,
  receiveAnnotation,
  selectInfoResponse,
} from 'mirador';
import { Canvas } from 'manifesto.js';

import {
  annotation as v3Annotation,
  annotationPage as v3AnnotationPage,
  externalTextBody,
  imageCanvas,
  textualBody,
} from '../../__fixtures__/iiifv3';
import {
  discoveredText,
  requestText,
  receiveText,
  receiveTextFailure,
  requestColors,
  receiveColors,
} from '../../src/state/actions';
import {
  discoverExternalOcr,
  fetchAndProcessOcr,
  fetchOcrMarkup,
  fetchExternalAnnotationResources,
  fetchAnnotationResource,
  processTextsFromAnnotations,
  onConfigChange,
  onVisibleCanvasesChange,
  fetchColors,
  loadImageData,
} from '../../src/state/sagas';
import { getTexts, getTextsForVisibleCanvases } from '../../src/state/selectors';
import { parseOcr, parseIiifAnnotations } from '../../src/lib/ocrFormats';
import { getPageColors } from '../../src/lib/color';

vi.mock('isomorphic-unfetch', () => ({ default: vi.fn() }));

const canvasSize = {
  height: 1000,
  width: 500,
};

describe('Discovering external OCR resources', () => {
  const windowConfig = {
    textOverlay: {
      enabled: true,
      selectable: false,
      visible: false,
    },
  };
  const canvases = [
    new Canvas({
      '@id': 'canvasA',
      ...canvasSize,
      seeAlso: {
        '@id': 'http://example.com/ocr/canvasA',
        format: 'application/xml+alto',
      },
      images: [
        {
          '@type': 'oa:Annotation',
          motivation: 'sc:painting',
          resource: {
            '@id': 'http://example.com/canvas/canvasA',
            '@type': 'dctypes:Image',
            format: 'image/jpeg',
            ...canvasSize,
            service: {
              '@context': 'http://iiif.io/api/image/2/context.json',
              '@id': 'http://example.com/iiif/image/canvasA',
              profile: 'http://iiif.io/api/image/2/level1.json',
            },
          },
        },
      ],
    }),
    new Canvas({
      ...canvasSize,
      '@id': 'canvasB',
      seeAlso: {
        '@id': 'http://example.com/ocr/canvasB',
        format: 'text/vnd.hocr+html',
      },
      images: [
        {
          '@type': 'oa:Annotation',
          motivation: 'sc:painting',
          resource: {
            '@id': 'http://example.com/canvas/canvasB',
            '@type': 'dctypes:Image',
            format: 'image/jpeg',
            ...canvasSize,
            service: {
              '@context': 'http://iiif.io/api/image/2/context.json',
              '@id': 'http://example.com/iiif/image/canvasB',
              profile: 'http://iiif.io/api/image/2/level1.json',
            },
          },
        },
      ],
    }),
  ];
  const windowId = '31337';

  it('should yield a discovered source for every canvas with OCR', () =>
    expectSaga(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .provide([
        [select(getWindowConfig, { windowId }), windowConfig],
        [select(getCanvases, { windowId }), canvases],
        [select(getTexts), {}],
      ])
      .put(discoveredText('canvasA', 'http://example.com/ocr/canvasA'))
      .put(discoveredText('canvasB', 'http://example.com/ocr/canvasB'))
      .run());

  ['selectable', 'visible'].forEach((setting) => {
    it(`should request the texts if '${setting}' is enabled`, () =>
      expectSaga(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
        .provide([
          [
            select(getWindowConfig, { windowId }),
            { textOverlay: { ...windowConfig.textOverlay, [setting]: true } },
          ],
          [select(getCanvases, { windowId }), canvases],
          [select(getTexts), {}],
        ])
        .put(requestText('canvasA', 'http://example.com/ocr/canvasA', canvasSize))
        .put(requestText('canvasB', 'http://example.com/ocr/canvasB', canvasSize))
        .run());
  });

  it('should not do anything when the sources are already discovered', () =>
    expectSaga(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .provide([
        [
          select(getWindowConfig, { windowId }),
          { textOverlay: { ...windowConfig.textOverlay, selectable: true } },
        ],
        [select(getCanvases, { windowId }), canvases],
        [
          select(getTexts),
          {
            canvasA: { source: 'http://example.com/ocr/canvasA' },
            canvasB: { source: 'http://example.com/ocr/canvasB' },
          },
        ],
      ])
      .run()
      .then(({ effects }) => {
        expect(effects.put).toBeUndefined();
      }));

  it('should not do anything when the plugin is disabled', () =>
    expectSaga(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .provide([[select(getWindowConfig, { windowId }), {}]])
      .run()
      .then(({ effects }) => {
        expect(effects.select).toHaveLength(1);
        expect(effects.put).toBeUndefined();
      }));

  it('should request colors for each canvas with an associated resource', () =>
    expectSaga(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .provide([
        [select(getWindowConfig, { windowId }), windowConfig],
        [select(getCanvases, { windowId }), canvases],
        [select(getTexts), {}],
      ])
      .put(discoveredText('canvasA', 'http://example.com/ocr/canvasA'))
      .put(discoveredText('canvasB', 'http://example.com/ocr/canvasB'))
      .put(requestColors('canvasA', 'http://example.com/iiif/image/canvasA'))
      .put(requestColors('canvasB', 'http://example.com/iiif/image/canvasB'))
      .run());
});

describe('Fetching and processing external OCR', () => {
  const targetId = 'canvasA';
  const textUri = 'http://example.com/ocr/canvasA';
  const textStub = 'some dummy text';
  const parsedStub = { lines: [] };
  const err = new Error('could not fetch');

  it('should update store after successfull fetch and parse', () =>
    expectSaga(fetchAndProcessOcr, { canvasSize, targetId, textUri })
      .provide([
        [call(fetchOcrMarkup, textUri), textStub],
        [call(parseOcr, textStub, canvasSize), parsedStub],
      ])
      .put(receiveText(targetId, textUri, 'ocr', parsedStub))
      .run());

  it('should update store after failed fetch and parse', () =>
    expectSaga(fetchAndProcessOcr, { canvasSize, targetId, textUri })
      .provide([[call(fetchOcrMarkup, textUri), throwError(err)]])
      .put(receiveTextFailure(targetId, textUri, err))
      .run());
});

describe('Fetching external annotation bodies', () => {
  it('should preserve a plain-text response as a textual body', async () => {
    fetch.mockResolvedValueOnce({
      headers: { get: () => 'text/plain; charset=utf-8' },
      ok: true,
      text: () => Promise.resolve('External transcription'),
    });

    await expect(fetchAnnotationResource('http://example.com/transcription.txt')).resolves.toEqual({
      format: 'text/plain',
      id: 'http://example.com/transcription.txt',
      type: 'Text',
      value: 'External transcription',
    });
  });
});

describe('Fetching external annotation sources', () => {
  const targetId = 'canvasA';
  const annotationId = 'http://example.com/annos/withext.json';
  const simpleResourceId = 'http://example.com/resources/ext.json';
  const mockAnno = {
    resources: [{ resource: { '@id': simpleResourceId } }],
  };
  const simpleExternalContent = {
    '@id': simpleResourceId,
    content: 'Dummy content',
  };
  const pointerResourceId = 'http://example.com/resources/full.json';
  const pointerExternalContent = {
    id: pointerResourceId,
    value: 'Some content that is supposed to be longer',
  };

  it('should incorporate simple external content resources into annotations', () =>
    expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: mockAnno,
      targetId,
    })
      .provide([[call(fetchAnnotationResource, simpleResourceId), simpleExternalContent]])
      .put(
        receiveAnnotation(targetId, annotationId, {
          resources: [{ resource: simpleExternalContent }],
        }),
      )
      .run());

  it('should resolve pointers to parts of external resources into annotations', () =>
    expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: {
        resources: [{ resource: { '@id': `${pointerResourceId}#char=5,12` } }],
      },
      targetId,
    })
      .provide([[call(fetchAnnotationResource, pointerResourceId), pointerExternalContent]])
      .put(
        receiveAnnotation(targetId, annotationId, {
          resources: [
            {
              resource: {
                '@id': `${pointerResourceId}#char=5,12`,
                value: 'content',
              },
            },
          ],
        }),
      )
      .run());

  it('should not do anything if there are no external resources', () =>
    expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: {
        resources: [{ resource: { '@id': 'foo', chars: 'baz' } }],
      },
      targetId,
    })
      .run()
      .then(({ effects }) => {
        expect(effects.put).toBeUndefined();
      }));

  it('should ignore non-text resources in IIIF v2 annotation lists', () => {
    const imageResourceId = 'http://example.com/images/page.jpg';

    return expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: {
        resources: [
          {
            motivation: 'painting',
            resource: { '@id': imageResourceId, '@type': 'dctypes:Image' },
          },
        ],
      },
      targetId,
    })
      .provide([[call(fetchAnnotationResource, imageResourceId), {}]])
      .run()
      .then(({ effects }) => {
        expect(effects.call).toBeUndefined();
        expect(effects.put).toBeUndefined();
      });
  });

  it('should not crash on IIIF v3 annotation pages without external resources', () =>
    expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: {
        items: [{ body: { value: 'a comment' }, motivation: 'commenting' }],
        type: 'AnnotationPage',
      },
      targetId,
    })
      .run()
      .then(({ effects }) => {
        expect(effects.put).toBeUndefined();
      }));

  it('should incorporate conformant external IIIF v3 text bodies in mixed pages', () => {
    const v3ExternalResourceId = 'http://example.com/v3/ext.json';
    const externalBody = externalTextBody(v3ExternalResourceId);
    const v3ExternalContent = { ...externalBody, value: 'V3 external content' };
    const embeddedAnnotation = v3Annotation({ body: textualBody('Embedded content') });
    const bodylessAnnotation = {
      motivation: 'commenting',
      target: 'http://example.com/canvas',
      type: 'Annotation',
    };
    const v3AnnotationJson = v3AnnotationPage([
      v3Annotation({ body: externalBody, motivation: ['supplementing'] }),
        embeddedAnnotation,
        bodylessAnnotation,
    ]);

    return expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: v3AnnotationJson,
      targetId,
    })
      .provide([
        [call(fetchAnnotationResource, v3ExternalResourceId, 'text/plain'), v3ExternalContent],
      ])
      .put(
        receiveAnnotation(targetId, annotationId, {
          ...v3AnnotationJson,
          items: [
            { ...v3AnnotationJson.items[0], body: v3ExternalContent },
            embeddedAnnotation,
            bodylessAnnotation,
          ],
        }),
      )
      .run();
  });

  it('should resolve external bodies nested in a Choice and preserve other choices', () => {
    const externalId = 'http://example.com/v3/choice.txt';
    const annotationJson = {
      ...v3AnnotationPage([
        v3Annotation({
          body: {
            items: [
              externalId,
              { language: 'de', type: 'TextualBody', value: 'Eingebetteter Text' },
            ],
            type: 'Choice',
          },
        }),
      ]),
    };
    const externalContent = externalTextBody(externalId, { value: 'External text' });

    return expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson,
      targetId,
    })
      .provide([[call(fetchAnnotationResource, externalId), externalContent]])
      .put(
        receiveAnnotation(targetId, annotationId, {
          ...annotationJson,
          items: [
            {
              ...annotationJson.items[0],
              body: {
                ...annotationJson.items[0].body,
                items: [externalContent, annotationJson.items[0].body.items[1]],
              },
            },
          ],
        }),
      )
      .run();
  });

  it('should resolve character fragments in IIIF v3 external text bodies', () => {
    const body = externalTextBody(`${pointerResourceId}#char=5,12`);
    const annotationJson = v3AnnotationPage([v3Annotation({ body })]);

    return expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson,
      targetId,
    })
      .provide([
        [call(fetchAnnotationResource, pointerResourceId, 'text/plain'), pointerExternalContent],
      ])
      .put(
        receiveAnnotation(targetId, annotationId, {
          ...annotationJson,
          items: [
            {
              ...annotationJson.items[0],
              body: { ...body, value: 'content' },
            },
          ],
        }),
      )
      .run();
  });
});

describe('Processing text from regular annotations', () => {
  it('should parse text from annotations and forward it to the store', () => {
    const annos = [
      { motivation: 'supplementing', resource: {} },
      { resource: { '@type': 'cnt:contentAsText' } },
      { dcType: 'Line', resource: {} },
      { dcType: 'Word', resource: {} },
      { motivation: 'painting', resource: {} },
    ];
    const mockParse = { lines: [] };
    return expectSaga(processTextsFromAnnotations, {
      annotationId: 'annoList',
      annotationJson: { resources: annos },
      targetId: 'canvasA',
    })
      .provide([[call(parseIiifAnnotations, annos.slice(0, 4)), mockParse]])
      .put(receiveText('canvasA', 'annoList', 'annos', mockParse))
      .run();
  });

  it('should parse Europeana v2 annotations identified by textGranularity', () => {
    const anno = {
      '@type': 'oa:Annotation',
      motivation: 'sc:painting',
      on: ['https://example.org/canvas#xywh=10,20,100,50'],
      resource: {
        '@id': 'https://api.europeana.eu/fulltext/example#char=0,12',
      },
      textGranularity: 'line',
    };
    const mockParse = { lines: [] };

    return expectSaga(processTextsFromAnnotations, {
      annotationId: 'europeanaAnnoList',
      annotationJson: { resources: [anno] },
      targetId: 'canvasA',
    })
      .provide([[call(parseIiifAnnotations, [anno]), mockParse]])
      .put(receiveText('canvasA', 'europeanaAnnoList', 'annos', mockParse))
      .run();
  });

  it('should not crash on IIIF v3 annotation pages with non-supplementing annotations', () =>
    expectSaga(processTextsFromAnnotations, {
      annotationId: 'annoPage',
      annotationJson: {
        items: [{ body: { value: 'a comment' }, motivation: 'commenting' }],
        type: 'AnnotationPage',
      },
      targetId: 'canvasA',
    })
      .run()
      .then(({ effects }) => {
        expect(effects.put).toBeUndefined();
      }));

  it('should parse IIIF v3 annotations end-to-end with array-valued fields', () => {
    const v3Annos = [
      v3Annotation({
        body: [
          textualBody('ignored choice', { purpose: 'tagging' }),
          textualBody('Some text', { purpose: 'supplementing' }),
        ],
        motivation: ['supplementing', 'reviewing'],
      }),
      v3Annotation({
        body: textualBody('Not supplementing'),
        motivation: 'commenting',
        target: 'http://example.com/canvas#xywh=10,80,100,50',
      }),
    ];
    return expectSaga(processTextsFromAnnotations, {
      annotationId: 'annoPage',
      annotationJson: { items: v3Annos, type: 'AnnotationPage' },
      targetId: 'canvasA',
    })
      .put(
        receiveText('canvasA', 'annoPage', 'annos', {
          height: 70,
          lines: [{ height: 50, text: 'Some text', width: 100, x: 10, y: 20 }],
          width: 110,
        }),
      )
      .run();
  });
});

describe('Discovering external OCR for IIIF v3', () => {
  const windowId = '31337';
  const windowConfig = {
    textOverlay: {
      enabled: true,
      selectable: false,
      visible: false,
    },
  };

  it('should discover OCR and image services from a genuine v3 Canvas', () => {
    const v3Canvas = new Canvas(
      imageCanvas({
        id: 'canvasV3',
        imageServiceId: 'http://example.com/iiif/image/v3canvas',
      }),
    );

    return expectSaga(discoverExternalOcr, { visibleCanvases: ['canvasV3'], windowId })
      .provide([
        [select(getWindowConfig, { windowId }), windowConfig],
        [select(getCanvases, { windowId }), [v3Canvas]],
        [select(getTexts), {}],
      ])
      .put(discoveredText('canvasV3', 'http://example.com/ocr/v3'))
      .put(requestColors('canvasV3', 'http://example.com/iiif/image/v3canvas'))
      .run();
  });

  it('should discover renderings and continue past canvases without image services', () => {
    const renderingCanvas = new Canvas({
      height: 2000,
      id: 'canvasRendering',
      rendering: [
        {
          format: 'text/vnd.hocr+html',
          id: 'http://example.com/ocr/rendering',
          label: { en: ['OCR'] },
          type: 'Text',
        },
      ],
      type: 'Canvas',
      width: 1000,
    });
    const followingCanvas = new Canvas(imageCanvas({ id: 'canvasAfterRendering' }));

    return expectSaga(discoverExternalOcr, {
      visibleCanvases: ['canvasRendering', 'canvasAfterRendering'],
      windowId,
    })
      .provide([
        [select(getWindowConfig, { windowId }), windowConfig],
        [select(getCanvases, { windowId }), [renderingCanvas, followingCanvas]],
        [select(getTexts), {}],
      ])
      .put(discoveredText('canvasRendering', 'http://example.com/ocr/rendering'))
      .put(discoveredText('canvasAfterRendering', 'http://example.com/ocr/v3'))
      .put(requestColors('canvasAfterRendering', 'http://example.com/iiif/image/v3'))
      .run();
  });
});

describe('Reacting to configuration changes', () => {
  const windowId = 'window';
  const config = { enabled: true, selectable: false, visible: false };

  it('should trigger discovery if there are no texts', () =>
    expectSaga(onConfigChange, {
      id: windowId,
      payload: { textOverlay: { ...config, selectable: true } },
    })
      .provide([
        [select(getTextsForVisibleCanvases, { windowId }), []],
        [select(getVisibleCanvases, { windowId }), [{ id: 'canvasA' }, { id: 'canvasB' }]],
        [call(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId }), {}],
      ])
      .call(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .run());

  it('should trigger discovery if there are texts that are sourced from annotations', () =>
    expectSaga(onConfigChange, {
      id: windowId,
      payload: { textOverlay: { ...config, selectable: true } },
    })
      .provide([
        [
          select(getTextsForVisibleCanvases, { windowId }),
          [{ sourceType: 'annos' }, { sourceType: 'ocr', text: {} }],
        ],
        [select(getVisibleCanvases, { windowId }), [{ id: 'canvasA' }, { id: 'canvasB' }]],
        [call(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId }), {}],
      ])
      .call(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .run());

  it('should do nothing if the plugin is not enabled', () =>
    expectSaga(onConfigChange, {
      id: windowId,
      payload: { textOverlay: { ...config, enabled: false } },
    })
      .run()
      .then(({ effects }) => {
        expect(effects.select).toBeUndefined();
        expect(effects.call).toBeUndefined();
      }));

  it('should do nothing if neither visibility or selection is enabled', () =>
    expectSaga(onConfigChange, { id: windowId, payload: { textOverlay: config } })
      .run()
      .then(({ effects }) => {
        expect(effects.select).toBeUndefined();
        expect(effects.call).toBeUndefined();
      }));

  it('should fetch texts for the visible canvases that were previously discovered but not yet requesteed', () =>
    expectSaga(onConfigChange, {
      id: windowId,
      payload: { textOverlay: { ...config, visible: true } },
    })
      .provide([
        [
          select(getTextsForVisibleCanvases, { windowId }),
          [
            { sourceType: 'ocr', canvasId: 'canvasA', source: 'sourceA' },
            { sourceType: 'ocr', canvasId: 'canvasB', source: 'sourceB' },
          ],
        ],
        [
          select(getVisibleCanvases, { windowId }),
          [
            { id: 'canvasA', __jsonld: { width: 1000, height: 2000 } },
            { id: 'canvasB', __jsonld: { width: 1500, height: 3000 } },
          ],
        ],
      ])
      .put(requestText('canvasA', 'sourceA', { width: 1000, height: 2000 }))
      .put(requestText('canvasB', 'sourceB', { width: 1500, height: 3000 }))
      .run());
});

describe('Reacting to visible canvas changes', () => {
  const windowId = 'window';

  it('should trigger OCR discovery for newly visible canvases', () =>
    expectSaga(onVisibleCanvasesChange, {
      id: windowId,
      payload: { visibleCanvases: ['canvasA', 'canvasB'] },
    })
      .provide([
        [call(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId }), {}],
      ])
      .call(discoverExternalOcr, { visibleCanvases: ['canvasA', 'canvasB'], windowId })
      .run());

  it('should do nothing when visible canvases are not part of the update payload', () =>
    expectSaga(onVisibleCanvasesChange, { id: windowId, payload: {} })
      .run()
      .then(({ effects }) => {
        expect(effects.call).toBeUndefined();
      }));
});

describe('Fetching page colors', () => {
  const targetId = 'canvasA';
  const infoId = 'http://example.com/iiif/image/canvasA';
  const colors = { textColor: '#abcdef', bgColor: '#fedcba' };
  it('should immediately trigger a fetch if info response is available', () =>
    expectSaga(fetchColors, { targetId, infoId })
      .provide([
        [select(selectInfoResponse, { infoId }), { id: infoId }],
        [call(loadImageData, `${infoId}/full/256,/0/default.jpg`), 'data'],
        [call(getPageColors, 'data'), colors],
      ])
      .put(receiveColors(targetId, colors.textColor, colors.bgColor))
      .run());

  it('should wait for info response reception if it is initially unavailable', () =>
    expectSaga(fetchColors, { targetId, infoId })
      .provide([
        [select(selectInfoResponse, { infoId }), undefined],
        [call(loadImageData, `${infoId}/full/256,/0/default.jpg`), 'data'],
        [call(getPageColors, 'data'), colors],
      ])
      .dispatch({
        type: ActionTypes.RECEIVE_INFO_RESPONSE,
        infoId,
        infoJson: { '@id': infoId },
      })
      .put(receiveColors(targetId, colors.textColor, colors.bgColor))
      .run());

  it('should not do anything if the info response reception has failed', () =>
    expectSaga(fetchColors, { targetId, infoId })
      .provide([[select(selectInfoResponse, { infoId }), undefined]])
      .dispatch({
        type: ActionTypes.RECEIVE_INFO_RESPONSE_FAILURE,
        infoId,
      })
      .run()
      .then(({ effects }) => {
        expect(effects.call).toBeUndefined();
        expect(effects.put).toBeUndefined();
      }));
});
