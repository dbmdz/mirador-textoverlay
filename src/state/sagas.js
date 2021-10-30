/* eslint-disable no-underscore-dangle */
import uniq from 'lodash/uniq';
import { all, call, put, select, take, takeEvery, race } from 'redux-saga/effects';
import fetch from 'isomorphic-unfetch';

import ActionTypes from 'mirador/dist/es/src/state/actions/action-types';
import { receiveAnnotation, updateConfig } from 'mirador/dist/es/src/state/actions';
import {
  getCanvases,
  getWindowConfig,
  getVisibleCanvases,
  selectInfoResponse,
} from 'mirador/dist/es/src/state/selectors';
import MiradorCanvas from 'mirador/dist/es/src/lib/MiradorCanvas';

import {
  PluginActionTypes,
  requestText,
  receiveText,
  receiveTextFailure,
  discoveredText,
  requestColors,
  receiveColors,
} from './actions';
import { getTexts, getTextsForVisibleCanvases } from './selectors';
import translations from '../locales';
import { parseIiifAnnotations, parseOcr } from '../lib/ocrFormats';
import { getPageColors } from '../lib/color';

const charFragmentPattern = /^(.+)#char=(\d+),(\d+)$/;

/** Check if an annotation has external resources that need to be loaded */
function hasExternalResource(anno) {
  return (
    anno.resource?.chars === undefined &&
    anno.body?.value === undefined &&
    Object.keys(anno.resource).length === 1 &&
    anno.resource['@id'] !== undefined
  );
}

/** Checks if a given resource points to an ALTO OCR document */
const isAlto = (resource) =>
  resource &&
  (resource.format === 'application/xml+alto' ||
    (resource.profile && resource.profile.startsWith('http://www.loc.gov/standards/alto/')));

/** Checks if a given resource points to an hOCR document */
const isHocr = (resource) =>
  resource &&
  (resource.format === 'text/vnd.hocr+html' ||
    (resource.profile &&
      (resource.profile === 'https://github.com/kba/hocr-spec/blob/master/hocr-spec.md' ||
        resource.profile.startsWith('http://kba.cloud/hocr-spec/') ||
        resource.profile.startsWith('http://kba.github.io/hocr-spec/'))));

/** Checks if a given annotationJson has the type "AnnotationPage", introduced
 * in IIIF v3 (and therefore assumes IIIF 3.0).
 * @param annotationJson Annotation-like json sturct
 */
const naiveIIIFv3Check = (annotationJson) =>
  annotationJson && annotationJson.type && annotationJson.type === 'AnnotationPage';

/** Wrapper around fetch() that returns the content as text */
export async function fetchOcrMarkup(url) {
  const resp = await fetch(url);
  return resp.text();
}

/** Saga for discovering external OCR on visible canvases and requesting it if not yet loaded */
export function* discoverExternalOcr({ visibleCanvases: visibleCanvasIds, windowId }) {
  const { enabled, selectable, visible } = (yield select(getWindowConfig, { windowId }))
    .textOverlay ?? { enabled: false };
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
    const seeAlso = (Array.isArray(canvas.__jsonld.seeAlso)
      ? canvas.__jsonld.seeAlso
      : [canvas.__jsonld.seeAlso]
    ).filter((res) => isAlto(res) || isHocr(res))[0];
    if (seeAlso !== undefined) {
      const ocrSource = seeAlso.id ?? seeAlso['@id']; // IIIF 3.0 compat (id vs @id)
      const alreadyHasText = texts[canvas.id]?.source === ocrSource;
      if (alreadyHasText) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (selectable || visible) {
        yield put(requestText(canvas.id, ocrSource, { height, width }));
      } else {
        yield put(discoveredText(canvas.id, ocrSource));
      }
      // Get the IIIF Image Service from the canvas to determine text/background colors
      // NOTE: We don't do this in the `fetchColors` saga, since it's kind of a pain to get
      // a canvas object from an id, and we have one already here, so it's just simpler.
      const miradorCanvas = new MiradorCanvas(canvas);
      const image = miradorCanvas.iiifImageResources[0];
      const infoId = image?.getServices()[0].id;
      if (!infoId) {
        return;
      }
      yield put(requestColors(canvas.id, infoId));
    }
  }
}

/** Saga for fetching OCR and parsing it */
export function* fetchAndProcessOcr({ targetId, textUri, canvasSize }) {
  try {
    const text = yield call(fetchOcrMarkup, textUri);
    const parsedText = yield call(parseOcr, text, canvasSize);
    yield put(receiveText(targetId, textUri, 'ocr', parsedText));
  } catch (error) {
    yield put(receiveTextFailure(targetId, textUri, error));
  }
}

/** Fetch external annotation resource JSON */
export async function fetchAnnotationResource(url) {
  const resp = await fetch(url);
  return resp.json();
}

/** Saga for fetching external annotation resources */
export function fetchExternalAnnotationResources({ targetId, annotationId, annotationJson }) {
  if (naiveIIIFv3Check(annotationJson)) {
    // We treat this as IIIF 3.0
    fetchExternalAnnotationResourceIIIFv3({ targetId, annotationId, annotationJson});
  } else {
    // We treat this as IIIF 2.x
    fetchExternalAnnotationResourcesIIIFv2({ targetId, annotationId, annotationJson });
  }
}

/** Fetching external annotation resources IIIF 2.x style */
export function* fetchExternalAnnotationResourcesIIIFv2({
  targetId,
  annotationId,
  annotationJson,
}) {
  if (!annotationJson.resources.some(hasExternalResource)) {
    return;
  }
  const resourceUris = uniq(
    annotationJson.resources.map((anno) => anno.resource['@id'].split('#')[0])
  );
  const contents = yield all(resourceUris.map((uri) => call(fetchAnnotationResource, uri)));
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
    return { ...anno, resource: { ...anno.resource, value: partialContent } };
  });
  yield put(
    receiveAnnotation(targetId, annotationId, { ...annotationJson, resources: completedAnnos })
  );
}

/** Fetching external annotation resources IIIF 3.0 style */
export function* fetchExternalAnnotationResourceIIIFv3({ targetId, annotationId, annotationJson }) {
  if (!annotationJson.items.some(hasExternalResource)) {
    return;
  }
  const resourceUris = uniq(annotationJson.items.map((anno) => anno.body.id.split('#')[0]));
  const contents = yield all(resourceUris.map((uri) => call(fetchAnnotationResource, uri)));
  const contentMap = Object.fromEntries(contents.map((c) => [c.id ?? c['@id'], c]));
  const completedAnnos = annotationJson.items.map((anno) => {
    if (!hasExternalResource(anno)) {
      return anno;
    }
    const match = anno.body.id.match(charFragmentPattern);
    if (!match) {
      return { ...anno, resource: contentMap[anno.body.id] ?? anno.resource };
    }
    const wholeResource = contentMap[match[1]];
    const startIdx = Number.parseInt(match[2], 10);
    const endIdx = Number.parseInt(match[3], 10);
    const partialContent = wholeResource.value.substring(startIdx, endIdx);
    return { ...anno, resource: { ...anno.resource, value: partialContent } };
  });
  yield put(
    receiveAnnotation(targetId, annotationId, { ...annotationJson, resources: completedAnnos })
  );
}

/** Saga for processing texts from IIIF annotations */
export function processTextsFromAnnotations({ targetId, annotationId, annotationJson }) {
  if (naiveIIIFv3Check(annotationJson)) {
    // IIIF v3
    processTextsFromAnnotationsIIIFv3({ targetId, annotationId, annotationJson });
  } else {
    // IIIF v2 and Europeana IIIF 2.0
    processTextsFromAnnotationsIIIFv2({ targetId, annotationId, annotationJson });
  }
}

/** Saga for processing texts from IIIF annotations IIIF 2.x */
export function* processTextsFromAnnotationsIIIFv2({ targetId, annotationId, annotationJson }) {
  // Check if the annotation contains "content as text" resources that
  // we can extract text with coordinates from
  const contentAsTextAnnos = annotationJson.resources.filter(
    (anno) =>
      anno.motivation === 'supplementing' || // IIIF 3.0
      anno.resource['@type']?.toLowerCase() === 'cnt:contentastext' || // IIIF 2.0
      ['Line', 'Word'].indexOf(anno.dcType) >= 0 // Europeana IIIF 2.0
  );

  if (contentAsTextAnnos.length > 0) {
    const parsed = yield call(parseIiifAnnotations, contentAsTextAnnos);
    yield put(receiveText(targetId, annotationId, 'annos', parsed));
  }
}

/** Saga for processing texts from IIIF annotations IIIF 3.0 */
export function* processTextsFromAnnotationsIIIFv3({ targetId, annotationId, annotationJson }) {
  // Check if the annotation contains "TextualBody" resources that
  // we can extract text with coordinates from
  const contentAsTextAnnos = annotationJson.resources.filter(
    (anno) =>
      anno.motivation === 'supplementing' &&
      anno.type === 'Annotation' &&
      anno.body &&
      anno.body.type === 'TextualBody' // See https://www.w3.org/TR/annotation-model/#embedded-textual-body
  );

  if (contentAsTextAnnos.length > 0) {
    const parsed = yield call(parseIiifAnnotations, contentAsTextAnnos);
    yield put(receiveText(targetId, annotationId, 'annos', parsed));
  }
}

/** Saga for requesting texts when display or selection is newly enabled */
export function* onConfigChange({ payload, id: windowId }) {
  const { enabled, selectable, visible } = payload.textOverlay ?? {};
  if (!enabled || (!selectable && !visible)) {
    return;
  }
  const texts = yield select(getTextsForVisibleCanvases, { windowId });
  // Check if any of the texts need fetching
  const needFetching = texts.filter(
    ({ sourceType, text }) => sourceType === 'ocr' && text === undefined
  );
  // Check if we need to discover external OCR
  const needsDiscovery =
    texts.length === 0 || texts.filter(({ sourceType } = {}) => sourceType === 'annos').length > 0;
  if (needFetching.length === 0 && !needsDiscovery) {
    return;
  }
  const visibleCanvases = yield select(getVisibleCanvases, { windowId });
  yield all(
    needFetching.map(({ canvasId, source }) => {
      const { width, height } = visibleCanvases.find((c) => c.id === canvasId).__jsonld;
      return put(requestText(canvasId, source, { height, width }));
    })
  );
  if (needsDiscovery) {
    const canvasIds = visibleCanvases.map((c) => c.id);
    yield call(discoverExternalOcr, { visibleCanvases: canvasIds, windowId });
  }
}

/** Inject translation keys for this plugin into thte config */
export function* injectTranslations() {
  yield put(
    updateConfig({
      translations,
    })
  );
}

/** Load image data for image */
export async function loadImageData(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height).data);
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

/** Try to determine text and background color for the target */
export function* fetchColors({ targetId, infoId }) {
  const infoResp = yield select(selectInfoResponse, { infoId });
  let serviceId = infoResp?.id;
  if (!serviceId) {
    const { success: infoSuccess, failure: infoFailure } = yield race({
      success: take((a) => a.type === ActionTypes.RECEIVE_INFO_RESPONSE && a.infoId === infoId),
      failure: take(
        (a) => a.type === ActionTypes.RECEIVE_INFO_RESPONSE_FAILURE && a.infoId === infoId
      ),
    });
    if (infoFailure) {
      return;
    }
    serviceId = infoSuccess.infoJson?.['@id'];
  }
  try {
    // FIXME: This assumes a Level 2 endpoint, we should probably use one of the sizes listed
    //        explicitely in the info response instead.
    const imgUrl = `${serviceId}/full/200,/0/default.jpg`;
    const imgData = yield call(loadImageData, imgUrl);
    const { textColor, bgColor } = yield call(getPageColors, imgData);
    yield put(receiveColors(targetId, textColor, bgColor));
  } catch (error) {
    console.error(error);
    // NOP
  }
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
    takeEvery(PluginActionTypes.REQUEST_COLORS, fetchColors),
  ]);
}
