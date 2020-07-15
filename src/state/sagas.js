/* eslint-disable no-underscore-dangle */
import uniq from 'lodash/uniq';
import {
  all, call, put, select, takeEvery,
} from 'redux-saga/effects';
import fetch from 'isomorphic-unfetch';

import ActionTypes from 'mirador/dist/es/src/state/actions/action-types';
import { receiveAnnotation, updateConfig } from 'mirador/dist/es/src/state/actions';
import { getCanvases, getWindowConfig, getVisibleCanvases } from 'mirador/dist/es/src/state/selectors';

import {
  PluginActionTypes, requestText, receiveText, receiveTextFailure, discoveredText,
} from './actions';
import { getTexts, getTextsForVisibleCanvases } from './selectors';
import translations from '../locales';
import { parseIiifAnnotations, parseOcr } from '../lib/ocrFormats';

const charFragmentPattern = /^(.+)#char=(\d+),(\d+)$/;

/** Check if an annotation has external resources that need to be loaded */
function hasExternalResource(anno) {
  return anno.resource?.chars === undefined
      && anno.body?.value === undefined
      && Object.keys(anno.resource).length === 1 && anno.resource['@id'] !== undefined;
}

/** Checks if a given resource points to an ALTO OCR document */
const isAlto = (resource) => resource && (
  resource.format === 'application/xml+alto'
    || (resource.profile && resource.profile.startsWith('http://www.loc.gov/standards/alto/')));

/** Checks if a given resource points to an hOCR document */
const isHocr = (resource) => resource && (
  resource.format === 'text/vnd.hocr+html'
    || (resource.profile && (
      resource.profile === 'https://github.com/kba/hocr-spec/blob/master/hocr-spec.md'
      || resource.profile.startsWith('http://kba.cloud/hocr-spec/')
      || resource.profile.startsWith('http://kba.github.io/hocr-spec/'))));

/** Saga for discovering external OCR on visible canvases and requesting it if not yet loaded */
function* discoverExternalOcr({ visibleCanvases: visibleCanvasIds, windowId }) {
  const { enabled, selectable, visible } = (
    yield select(getWindowConfig, { windowId })
  ).textOverlay ?? { enabled: false };
  if (!enabled) {
    return;
  }
  const canvases = yield select(getCanvases, { windowId });
  const visibleCanvases = (canvases || []).filter((c) => visibleCanvasIds.includes(c.id));
  const texts = yield select(getTexts);

  // FIXME: This should be doable with the `all` saga combinator, but it doesn't
  // seem to do anything :-/
  for (const canvas of visibleCanvases) {
    const { width, height } = canvas.__jsonld;
    const seeAlso = (
      Array.isArray(canvas.__jsonld.seeAlso) ? canvas.__jsonld.seeAlso : [canvas.__jsonld.seeAlso])
      .filter((res) => isAlto(res) || isHocr(res))[0];
    if (seeAlso !== undefined) {
      const ocrSource = seeAlso['@id'];
      const alreadyHasText = texts[canvas.id]?.source === ocrSource;
      if (alreadyHasText) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if ((selectable || visible)) {
        yield put(requestText(
          canvas.id, ocrSource, { height, width },
        ));
      } else {
        yield put(discoveredText(canvas.id, ocrSource));
      }
    }
  }
}

/** Saga for fetching OCR and parsing it */
function* fetchAndProcessOcr({ targetId, textUri, canvasSize }) {
  try {
    const text = yield call(() => fetch(textUri).then((resp) => resp.text()));
    const parsedText = parseOcr(text, canvasSize);
    yield put(receiveText(targetId, textUri, 'ocr', parsedText));
  } catch (error) {
    yield put(receiveTextFailure(targetId, textUri, error));
  }
}

/** Saga for fetching external annotation resources */
function* fetchExternalAnnotationResources({ targetId, annotationId, annotationJson }) {
  if (!annotationJson.resources.some(hasExternalResource)) {
    return;
  }
  const resourceUris = uniq(annotationJson.resources.map((anno) => anno.resource['@id'].split('#')[0]));
  const contents = yield all(
    resourceUris.map((uri) => call(() => fetch(uri).then((resp) => resp.json()))),
  );
  const contentMap = Object.fromEntries(contents.map((c) => [c.id ?? c['@id'], c]));
  const completedAnnos = annotationJson.resources.map((anno) => {
    if (!hasExternalResource(anno)) {
      return anno;
    }
    const match = anno.resource['@id'].match(charFragmentPattern);
    if (!match) {
      return { ...anno, resource: contentMap[anno.resource['@id']] ?? anno.resource };
    }
    const wholeResource = contentMap[match[1]];
    const startIdx = Number.parseInt(match[2], 10);
    const endIdx = Number.parseInt(match[3], 10);
    const partialContent = wholeResource.value.substring(startIdx, endIdx);
    return { ...anno, resource: { ...wholeResource, value: partialContent } };
  });
  yield put(
    receiveAnnotation(targetId, annotationId, { ...annotationJson, resources: completedAnnos }),
  );
}

/** Saga for processing texts from IIIF annotations */
function* processTextsFromAnnotations({ targetId, annotationId, annotationJson }) {
  // Check if the annotation contains "content as text" resources that
  // we can extract text with coordinates from
  const contentAsTextAnnos = annotationJson.resources.filter(
    (anno) => anno.motivation === 'supplementing' // IIIF 3.0
  || anno.resource['@type']?.toLowerCase() === 'cnt:contentastext' // IIIF 2.0
  || ['Line', 'Word'].indexOf(anno.dcType) >= 0, // Europeana IIIF 2.0
  );

  if (contentAsTextAnnos.length > 0) {
    yield put(receiveText(targetId, annotationId, 'annos', parseIiifAnnotations(contentAsTextAnnos)));
  }
}

/** Saga for requesting texts when display or selection is newly enabled */
function* onConfigChange({ payload, id: windowId }) {
  const { enabled, selectable, visible } = payload.textOverlay ?? {};
  if (!enabled || (!selectable && !visible)) {
    return;
  }
  const texts = yield select(getTextsForVisibleCanvases, { windowId });
  // Check if we need to discover external OCR
  const needsDiscovery = (
    texts.length === 0
    || texts.filter(({ sourceType }) => sourceType === 'annos').length > 0
  );
  if (needsDiscovery) {
    const visibleCanvases = yield select(getVisibleCanvases, { windowId });
    const canvasIds = visibleCanvases.map((c) => c.id);
    yield call(discoverExternalOcr, { visibleCanvases: canvasIds, windowId });
  }
}

/** Inject translation keys for this plugin into thte config */
function* injectTranslations() {
  yield put(updateConfig({
    translations,
  }));
}

/** Root saga for the plugin */
export default function* textSaga() {
  yield all([
    takeEvery(ActionTypes.IMPORT_CONFIG, injectTranslations),
    takeEvery(ActionTypes.RECEIVE_ANNOTATION, fetchExternalAnnotationResources),
    takeEvery(ActionTypes.RECEIVE_ANNOTATION, processTextsFromAnnotations),
    takeEvery(ActionTypes.SET_CANVAS, discoverExternalOcr),
    takeEvery(ActionTypes.UPDATE_WINDOW, onConfigChange),
    takeEvery(PluginActionTypes.REQUEST_TEXT, fetchAndProcessOcr),
  ]);
}
