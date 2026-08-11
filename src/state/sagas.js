import fetch from 'isomorphic-unfetch';
import uniq from 'lodash/uniq';
import {
  ActionTypes,
  getCanvases,
  getVisibleCanvases,
  getWindowConfig,
  MiradorCanvas,
  receiveAnnotation,
  selectInfoResponse,
  updateConfig,
} from 'mirador';
import { all, call, put, race, select, take, takeEvery } from 'redux-saga/effects';

import { getPageColors } from '../lib/color';
import {
  asArray,
  flattenBodies,
  getAnnotationModel,
  getBodyId,
  getBodyValue,
  hasMotivation,
  mapBodies,
} from '../lib/iiifAnnotations';
import { parseIiifAnnotations, parseOcr } from '../lib/ocrFormats';
import translations from '../locales';
import {
  discoveredText,
  PluginActionTypes,
  receiveColors,
  receiveText,
  receiveTextFailure,
  requestColors,
  requestText,
} from './actions';
import { getTexts, getTextsForVisibleCanvases } from './selectors';

const charFragmentPattern = /^(.+)#char=(\d+),(\d+)$/;

/** External text bodies which this plugin can dereference. */
function externalBodies(annotation, { bodyKey, isV3 }) {
  if (isV3 && !hasMotivation(annotation, 'supplementing')) {
    return [];
  }
  return flattenBodies(annotation[bodyKey]).filter((body) => {
    const type =
      typeof body === 'object' && body !== null ? (body.type ?? body['@type']) : undefined;
    const types = asArray(type)
      .filter((value) => typeof value === 'string')
      .map((value) => value.toLowerCase());
    const textTypes = isV3
      ? ['text', 'textualbody']
      : ['text', 'textualbody', 'cnt:contentastext', 'dctypes:text'];
    const format = typeof body === 'object' && body !== null ? body.format : undefined;
    const hasTextFormat = typeof format === 'string' && format.toLowerCase().startsWith('text/');
    const isText =
      types.some((value) => textTypes.includes(value)) ||
      (types.length === 0 && (format === undefined || hasTextFormat));
    return isText && getBodyId(body) !== undefined && getBodyValue(body) === undefined;
  });
}

/** Checks if a given resource points to an ALTO OCR document */
const isAlto = (resource) =>
  resource &&
  (resource.format === 'application/xml+alto' ||
    resource.format === 'application/alto+xml' ||
    resource.profile?.startsWith('http://www.loc.gov/standards/alto/'));

/** Checks if a given resource points to an hOCR document */
const isHocr = (resource) =>
  resource &&
  (resource.format === 'text/vnd.hocr+html' ||
    (resource.profile &&
      (resource.profile === 'https://github.com/kba/hocr-spec/blob/master/hocr-spec.md' ||
        resource.profile.startsWith('http://kba.cloud/hocr-spec/') ||
        resource.profile.startsWith('http://kba.github.io/hocr-spec/'))));

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
    const ocrResource = [canvas.__jsonld.seeAlso, canvas.__jsonld.rendering]
      .flatMap(asArray)
      .find((resource) => isAlto(resource) || isHocr(resource));
    if (ocrResource !== undefined) {
      const ocrSource = ocrResource.id ?? ocrResource['@id'];
      const alreadyHasText = texts[canvas.id]?.source === ocrSource;
      if (alreadyHasText) {
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
        continue;
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

/** Fetch an external annotation body, preserving plain text as a body object. */
export async function fetchAnnotationResource(url, declaredFormat) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Unable to fetch annotation body ${url}: ${resp.status} ${resp.statusText}`);
  }
  const responseFormat = resp.headers?.get('content-type')?.split(';')[0];
  const format = declaredFormat ?? responseFormat;
  if (format?.startsWith('text/')) {
    return { format, id: url, type: 'Text', value: await resp.text() };
  }
  return resp.json();
}

/** Saga for fetching external annotation resources */
/** @returns {Generator} */
export function* fetchExternalAnnotationResources({ targetId, annotationId, annotationJson }) {
  const model = getAnnotationModel(annotationJson);
  const external = model.annotations.flatMap((annotation) => externalBodies(annotation, model));
  if (external.length === 0) {
    return;
  }

  const resourceUris = uniq(external.map((body) => getBodyId(body).split('#')[0]));
  const contents = yield all(
    resourceUris.map((uri) => {
      const body = external.find((candidate) => getBodyId(candidate).split('#')[0] === uri);
      return body?.format
        ? call(fetchAnnotationResource, uri, body.format)
        : call(fetchAnnotationResource, uri);
    }),
  );
  const contentMap = Object.fromEntries(contents.map((c) => [c.id ?? c['@id'], c]));
  const completedAnnos = model.annotations.map((annotation) => {
    const externalForAnnotation = externalBodies(annotation, model);
    if (externalForAnnotation.length === 0) {
      return annotation;
    }
    const completedBody = mapBodies(annotation[model.bodyKey], (body) => {
      if (!externalForAnnotation.includes(body)) {
        return body;
      }
      const id = getBodyId(body);
      const match = id.match(charFragmentPattern);
      if (!match) {
        return contentMap[id] ?? body;
      }
      const wholeResource = contentMap[match[1]];
      const startIdx = Number.parseInt(match[2], 10);
      const endIdx = Number.parseInt(match[3], 10);
      const value = getBodyValue(wholeResource)?.substring(startIdx, endIdx);
      if (value === undefined) {
        return body;
      }
      return typeof body === 'object' ? { ...body, value } : { ...wholeResource, id, value };
    });
    return { ...annotation, [model.bodyKey]: completedBody };
  });
  const annotationsKey = model.isV3 ? 'items' : 'resources';
  yield put(
    receiveAnnotation(targetId, annotationId, {
      ...annotationJson,
      [annotationsKey]: completedAnnos,
    }),
  );
}

/** Saga for processing texts from IIIF annotations */
export function* processTextsFromAnnotations({ targetId, annotationId, annotationJson }) {
  const model = getAnnotationModel(annotationJson);
  const contentAsTextAnnos = model.annotations.filter((annotation) => {
    const bodies = flattenBodies(annotation[model.bodyKey]);
    const hasText = bodies.some((body) => getBodyValue(body) !== undefined);
    if (model.isV3) {
      return hasMotivation(annotation, 'supplementing') && hasText;
    }
    return (
      hasMotivation(annotation, 'supplementing') ||
      bodies.some((body) => body?.['@type']?.toLowerCase() === 'cnt:contentastext') ||
      ['Line', 'Word'].includes(annotation.dcType) ||
      ['line', 'word'].includes(annotation.textGranularity)
    );
  });

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
    ({ sourceType, text }) => sourceType === 'ocr' && text === undefined,
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
    }),
  );
  if (needsDiscovery) {
    const canvasIds = visibleCanvases.map((c) => c.id);
    yield call(discoverExternalOcr, { visibleCanvases: canvasIds, windowId });
  }
}

/** Discover OCR for canvases that become visible through view changes like book mode */
export function* onVisibleCanvasesChange({ payload, id: windowId }) {
  if (!payload.visibleCanvases?.length) {
    return;
  }

  yield call(discoverExternalOcr, { visibleCanvases: payload.visibleCanvases, windowId });
}

/** Inject translation keys for this plugin into thte config */
/** @returns {Generator} */
export function* injectTranslations() {
  yield put(
    updateConfig({
      translations,
    }),
  );
}

/** Load image data for image */
export async function loadImageData(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
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
        (a) => a.type === ActionTypes.RECEIVE_INFO_RESPONSE_FAILURE && a.infoId === infoId,
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
    const imgUrl = `${serviceId}/full/256,/0/default.jpg`;
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
    takeEvery(ActionTypes.UPDATE_WINDOW, onVisibleCanvasesChange),
    takeEvery(PluginActionTypes.REQUEST_TEXT, fetchAndProcessOcr),
    takeEvery(PluginActionTypes.REQUEST_COLORS, fetchColors),
  ]);
}
