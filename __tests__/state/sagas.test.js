import { select, call } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { getWindowConfig, getCanvases } from 'mirador/dist/es/src/state/selectors';

import {
  discoveredText, requestText,
} from '../../src/state/actions';
import { discoverExternalOcr } from '../../src/state/sagas';
import { getTexts } from '../../src/state/selectors';

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

  it('should request the texts if selectability is enabled',
    () => expectSaga(
      discoverExternalOcr,
      { visibleCanvases: ['canvasA', 'canvasB'], windowId },
    ).provide([
      [select(getWindowConfig, { windowId }),
        { textOverlay: { ...windowConfig.textOverlay, selectable: true } }],
      [select(getCanvases, { windowId }), canvases],
      [select(getTexts), {}],
    ])
      .put(requestText('canvasA', 'http://example.com/ocr/canvasA', canvasSize))
      .put(requestText('canvasB', 'http://example.com/ocr/canvasB', canvasSize))
      .run());

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
