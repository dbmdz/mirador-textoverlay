export const canvasId = 'http://example.com/canvas/v3';

export const textualBody = (value, properties = {}) => ({
  type: 'TextualBody',
  value,
  ...properties,
});

export const externalTextBody = (id, properties = {}) => ({
  format: 'text/plain',
  id,
  type: 'Text',
  ...properties,
});

export const annotation = ({
  body = textualBody('Transcription'),
  motivation = 'supplementing',
  target = `${canvasId}#xywh=10,20,100,50`,
  ...properties
} = {}) => ({ body, motivation, target, type: 'Annotation', ...properties });

export const annotationPage = (items, properties = {}) => ({
  items,
  type: 'AnnotationPage',
  ...properties,
});

export const imageCanvas = ({
  height = 2000,
  id = canvasId,
  imageServiceId = 'http://example.com/iiif/image/v3',
  ocr = {
    seeAlso: [
      {
        format: 'application/xml+alto',
        id: 'http://example.com/ocr/v3',
        type: 'Dataset',
      },
    ],
  },
  width = 1000,
} = {}) => ({
  height,
  id,
  items: [
    annotationPage([
      annotation({
        body: {
          format: 'image/jpeg',
          height,
          id: `${id}/image`,
          service: [{ id: imageServiceId, profile: 'level1', type: 'ImageService3' }],
          type: 'Image',
          width,
        },
        motivation: 'painting',
        target: id,
      }),
    ]),
  ],
  type: 'Canvas',
  width,
  ...ocr,
});
