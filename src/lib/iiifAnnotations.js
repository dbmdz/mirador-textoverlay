/** Return a JSON value as an array without wrapping nullish values. */
export const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

/** Normalize the structural differences between IIIF Presentation v2 and v3 pages. */
export function getAnnotationModel(annotationJson) {
  const isV3 = Array.isArray(annotationJson.items);
  const annotationsKey = isV3 ? 'items' : 'resources';
  return {
    annotations: annotationJson[annotationsKey] ?? [],
    bodyKey: isV3 ? 'body' : 'resource',
    isV3,
  };
}

export const hasMotivation = (annotation, motivation) =>
  asArray(annotation.motivation).includes(motivation);

export const getBodyId = (body) =>
  typeof body === 'string' ? body : (body?.id ?? body?.['@id'] ?? undefined);

export const getBodyValue = (body) =>
  typeof body === 'object' && body !== null ? (body.value ?? body.chars) : undefined;

/** Flatten Web Annotation body arrays and Choice bodies in preference order. */
export function flattenBodies(body) {
  if (Array.isArray(body)) {
    return body.flatMap(flattenBodies);
  }
  if (body?.type === 'Choice') {
    return (body.items ?? []).flatMap(flattenBodies);
  }
  return body == null ? [] : [body];
}

/** Transform leaf bodies while preserving body arrays and Choice containers. */
export function mapBodies(body, mapper) {
  if (Array.isArray(body)) {
    return body.map((item) => mapBodies(item, mapper));
  }
  if (body?.type === 'Choice' && Array.isArray(body.items)) {
    return { ...body, items: body.items.map((item) => mapBodies(item, mapper)) };
  }
  return mapper(body);
}
