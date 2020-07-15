import { select, call } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import { getWindowConfig, getCanvases } from 'mirador/dist/es/src/state/selectors';

import {
  discoveredText, requestText, receiveText, receiveTextFailure,
} from '../../src/state/actions';
import { discoverExternalOcr, fetchAndProcessOcr, fetchOcrMarkup } from '../../src/state/sagas';
import { getTexts } from '../../src/state/selectors';
import { parseOcr } from '../../src/lib/ocrFormats';

const windowConfig = {
  textOverlay: {
    enabled: true,
    selectable: false,
    visible: false,
  },
};
const canvasSize = {
  height: 1000,
  width: 500,
};
const canvases = [
  {
    __jsonld: {
      ...canvasSize,
      seeAlso: {
        '@id': 'http://example.com/ocr/canvasA',
        format: 'application/xml+alto',
      },
    },
    id: 'canvasA',
  },
  {
    __jsonld: {
      ...canvasSize,
      seeAlso: {
        '@id': 'http://example.com/ocr/canvasB',
        format: 'text/vnd.hocr+html',
      },
    },
    id: 'canvasB',
  },
];
const windowId = '31337';

describe('Discovering external OCR resources', () => {
  it('should yield a discovered source for every canvas with OCR',
    () => expectSaga(
      discoverExternalOcr,
      { visibleCanvases: ['canvasA', 'canvasB'], windowId },
    ).provide([
      [select(getWindowConfig, { windowId }), windowConfig],
      [select(getCanvases, { windowId }), canvases],
      [select(getTexts), {}],
    ])
      .put(discoveredText('canvasA', 'http://example.com/ocr/canvasA'))
      .put(discoveredText('canvasB', 'http://example.com/ocr/canvasB'))
      .run());

  ['selectable', 'visible'].forEach((setting) => {
    it(`should request the texts if '${setting}' is enabled`,
      () => expectSaga(
        discoverExternalOcr,
        { visibleCanvases: ['canvasA', 'canvasB'], windowId },
      ).provide([
        [select(getWindowConfig, { windowId }),
          { textOverlay: { ...windowConfig.textOverlay, [setting]: true } }],
        [select(getCanvases, { windowId }), canvases],
        [select(getTexts), {}],
      ])
        .put(requestText('canvasA', 'http://example.com/ocr/canvasA', canvasSize))
        .put(requestText('canvasB', 'http://example.com/ocr/canvasB', canvasSize))
        .run());
  });

  it('should not do anything when the sources are already discovered',
    () => expectSaga(
      discoverExternalOcr,
      { visibleCanvases: ['canvasA', 'canvasB'], windowId },
    ).provide([
      [select(getWindowConfig, { windowId }),
        { textOverlay: { ...windowConfig.textOverlay, selectable: true } }],
      [select(getCanvases, { windowId }), canvases],
      [select(getTexts), {
        canvasA: { source: 'http://example.com/ocr/canvasA' },
        canvasB: { source: 'http://example.com/ocr/canvasB' },
      }],
    ])
      .run().then(({ effects }) => {
        expect(effects.put).toBeUndefined();
      }));

  it('should not do anything when the plugin is disabled',
    () => expectSaga(
      discoverExternalOcr,
      { visibleCanvases: ['canvasA', 'canvasB'], windowId },
    ).provide([[select(getWindowConfig, { windowId }), {}]])
      .run().then(({ effects }) => {
        expect(effects.select).toHaveLength(1);
        expect(effects.put).toBeUndefined();
      }));
});

describe('Fetching and processing external OCR', () => {
  const targetId = 'canvasA';
  const textUri = 'http://example.com/ocr/canvasA';
  const textStub = 'some dummy text';
  const parsedStub = { lines: [] };
  const err = new Error('could not fetch');

  it('should update store after successfull fetch and parse',
    () => expectSaga(
      fetchAndProcessOcr,
      { canvasSize, targetId, textUri },
    ).provide([
      [call(fetchOcrMarkup, textUri), textStub],
      [call(parseOcr, textStub, canvasSize), parsedStub],
    ])
      .put(receiveText(targetId, textUri, 'ocr', parsedStub))
      .run());

  it('should update store after failed fetch and parse',
    () => expectSaga(
      fetchAndProcessOcr,
      { canvasSize, targetId, textUri },
    ).provide([
      [call(fetchOcrMarkup, textUri), throwError(err)],
    ])
      .put(receiveTextFailure(targetId, textUri, err))
      .run());
});
