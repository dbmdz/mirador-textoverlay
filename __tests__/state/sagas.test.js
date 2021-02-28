import { select, call } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import {
  getWindowConfig,
  getCanvases,
  getVisibleCanvases,
  selectInfoResponse,
} from 'mirador/dist/es/src/state/selectors';
import { receiveAnnotation } from 'mirador/dist/es/src/state/actions';
import ActionTypes from 'mirador/dist/es/src/state/actions/action-types';
import { Canvas } from 'manifesto.js';

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
  fetchColors,
  loadImageData,
} from '../../src/state/sagas';
import { getTexts, getTextsForVisibleCanvases } from '../../src/state/selectors';
import { parseOcr, parseIiifAnnotations } from '../../src/lib/ocrFormats';
import { getPageColors } from '../../src/lib/color';

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
        })
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
        })
      )
      .run());

  it('should not do anything if there are no external resources', () =>
    expectSaga(fetchExternalAnnotationResources, {
      annotationId,
      annotationJson: {
        resources: [{ resource: { '@id': 'foo', chars: 'baz' } }],
      },
    })
      .run()
      .then(({ effects }) => {
        expect(effects.call).toBeUndefined();
        expect(effects.put).toBeUndefined();
      }));
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

describe('Fetching page colors', () => {
  const targetId = 'canvasA';
  const infoId = 'http://example.com/iiif/image/canvasA';
  const colors = { textColor: '#abcdef', bgColor: '#fedcba' };
  it('should immediately trigger a fetch if info response is available', () =>
    expectSaga(fetchColors, { targetId, infoId })
      .provide([
        [select(selectInfoResponse, { infoId }), { id: infoId }],
        [call(loadImageData, `${infoId}/full/200,/0/default.jpg`), 'data'],
        [call(getPageColors, 'data'), colors],
      ])
      .put(receiveColors(targetId, colors.textColor, colors.bgColor))
      .run());

  it('should wait for info response reception if it is initially unavailable', () =>
    expectSaga(fetchColors, { targetId, infoId })
      .provide([
        [select(selectInfoResponse, { infoId }), undefined],
        [call(loadImageData, `${infoId}/full/200,/0/default.jpg`), 'data'],
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
