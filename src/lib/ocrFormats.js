/** Functions to parse OCR boxes from various formats and render them as SVG. */
import max from 'lodash/max';

const parser = new DOMParser();

/** Parse hOCR attributes from a node's title attribute */
function parseHocrAttribs(titleAttrib) {
  const vals = titleAttrib.split(';').map((x) => x.trim());
  return vals.reduce((acc, val) => {
    const key = val.split(' ')[0];
    // Special handling for bounding boxes, convert them to a number[4]
    if (key === 'bbox') {
      acc[key] = val
        .split(' ')
        .slice(1, 5)
        .map((x) => Number.parseInt(x, 10));
    } else {
      acc[key] = val.split(' ').slice(1, 5).join(' ');
    }
    return acc;
  }, {});
}

/** Parse an hOCR node */
function parseHocrNode(node, endOfLine = false, scaleFactor = 1) {
  const [ulx, uly, lrx, lry] = parseHocrAttribs(node.title).bbox.map((dim) => dim * scaleFactor);
  let style = node.getAttribute('style');
  if (style) {
    style = style.replace(/font-size:.+;/, '');
  }
  const spans = [
    {
      height: lry - uly,
      style,
      text: node.textContent,
      width: lrx - ulx,
      x: ulx,
      y: uly,
      isExtra: false,
    },
  ];

  // Add an extra space span if the following text node contains something
  if (node.nextSibling instanceof Text) {
    let extraText = node.nextSibling.wholeText.replace(/\s+/, ' ');
    if (endOfLine) {
      // We don't need trailing whitespace
      extraText = extraText.trimEnd();
    }
    if (extraText.length > 0) {
      spans.push({
        height: lry - uly,
        text: extraText,
        x: lrx,
        y: uly,
        // NOTE: This span has no width initially, will be set when we encounter
        //       the next word. (extra spans always fill the area between two words)
        isExtra: true,
      });
    }
  }
  const lastSpan = spans.slice(-1)[0];
  if (endOfLine && lastSpan.text.slice(-1) !== '\u00AD') {
    // Add newline if the line does not end on a hyphenation (a soft hyphen)
    lastSpan.text += '\n';
  }
  return spans;
}

/** Parse an hOCR document */
export function parseHocr(hocrText, referenceSize) {
  const doc = parser.parseFromString(hocrText, 'text/html');
  const pageNode = doc.querySelector('div.ocr_page');
  const pageSize = parseHocrAttribs(pageNode.title).bbox;
  let scaleFactor = 1;
  if (pageSize[2] !== referenceSize.width || pageSize[3] !== referenceSize.height) {
    const scaleFactorX = referenceSize.width / pageSize[2];
    const scaleFactorY = referenceSize.height / pageSize[3];
    const scaledWidth = Math.round(scaleFactorY * pageSize[2]);
    const scaledHeight = Math.round(scaleFactorX * pageSize[3]);
    if (scaledWidth !== referenceSize.width || scaledHeight !== referenceSize.height) {
      console.warn(
        `Differing scale factors for x and y axis: x=${scaleFactorX}, y=${scaleFactorY}`
      );
    }
    scaleFactor = scaleFactorX;
  }
  const lines = [];
  // FIXME: Seems to be an eslint bug: https://github.com/eslint/eslint/issues/12117
  // eslint-disable-next-line no-unused-vars
  for (const lineNode of pageNode.querySelectorAll('span.ocr_line, span.ocrx_line')) {
    const wordNodes = lineNode.querySelectorAll('span.ocrx_word');
    if (wordNodes.length === 0) {
      lines.push(parseHocrNode(lineNode, true, scaleFactor));
    } else {
      const line = parseHocrNode(lineNode, true, scaleFactor)[0];
      const spans = [];
      // eslint-disable-next-line no-unused-vars
      for (const [i, wordNode] of wordNodes.entries()) {
        const textSpans = parseHocrNode(wordNode, i === wordNodes.length - 1, scaleFactor);

        // Calculate width of previous extra span
        const previousExtraSpan = spans.slice(-1).filter((s) => s.isExtra)?.[0];
        if (previousExtraSpan) {
          let extraWidth = textSpans[0].x - previousExtraSpan.x;
          if (extraWidth === 0) {
            extraWidth = 0.0001;
            previousExtraSpan.x -= extraWidth;
          }
          previousExtraSpan.width = extraWidth;
        }
        spans.push(...textSpans);
      }

      // Update with of extra span at end of line
      const endExtraSpan = spans.slice(-1).filter((s) => s.isExtra)?.[0];
      if (endExtraSpan) {
        let extraWidth = line.x + line.width - endExtraSpan.x;
        if (extraWidth === 0) {
          extraWidth = 0.0001;
          endExtraSpan.x -= extraWidth;
        }
        endExtraSpan.width = extraWidth;
      }

      line.spans = spans;
      line.text = spans
        .map((w) => w.text)
        .join('')
        .trim();
      lines.push(line);
    }
  }
  return {
    height: pageSize[3] * scaleFactor,
    lines,
    width: pageSize[2] * scaleFactor,
  };
}

/** Create CSS directives from an ALTO TextStyle node */
function altoStyleNodeToCSS(styleNode) {
  // NOTE: We don't map super/subscript, since it would change the font size
  const fontStyleMap = {
    bold: 'font-weight: bold',
    italics: 'font-style: italic',
    smallcaps: 'font-variant: small-caps',
    underline: 'text-decoration: underline',
  };
  const styles = [];
  if (styleNode.hasAttribute('FONTFAMILY')) {
    styles.push(`font-family: ${styleNode.getAttribute('FONTFAMILY')}`);
  }
  if (styleNode.hasAttribute('FONTTYPE')) {
    styles.push(`font-type: ${styleNode.getAttribute('FONTTYPE')}`);
  }
  if (styleNode.hasAttribute('FONTCOLOR')) {
    styles.push(`color: #${styleNode.getAttribute('FONTCOLOR')}`);
  }
  if (styleNode.hasAttribute('FONTSTYLE')) {
    const altoStyle = styleNode.getAttribute('FONTSTYLE');
    if (altoStyle in fontStyleMap) {
      styles.push(fontStyleMap[altoStyle]);
    }
  }
  return styles.join(';');
}

/**
 * Parse an ALTO document.
 *
 * Needs access to the (unscaled) target image size since it ALTO uses 10ths of
 * millimeters for units by default and we need pixels.
 */
export function parseAlto(altoText, imgSize) {
  const doc = parser.parseFromString(altoText, 'text/xml');
  // We assume ALTO is set as the default namespace
  /** Namespace resolver that forrces the ALTO namespace */
  const measurementUnit = doc.querySelector('alto > Description > MeasurementUnit')?.textContent;
  const pageElem = doc.querySelector('alto > Layout > Page, alto > Layout > Page > PrintSpace');
  let pageWidth = Number.parseInt(pageElem.getAttribute('WIDTH'), 10);
  let pageHeight = Number.parseInt(pageElem.getAttribute('HEIGHT'), 10);
  let scaleFactorX = 1.0;
  let scaleFactorY = 1.0;

  if (measurementUnit !== 'pixel') {
    scaleFactorX = imgSize.width / pageWidth;
    scaleFactorY = imgSize.height / pageHeight;
    pageWidth *= scaleFactorX;
    pageHeight *= scaleFactorY;
  }

  const styles = {};
  const styleElems = doc.querySelectorAll('alto > Styles > TextStyle');
  for (const styleNode of styleElems) {
    styles[styleNode.getAttribute('ID')] = altoStyleNodeToCSS(styleNode);
  }

  const hasSpaces = doc.querySelector('SP') !== null;
  const lines = [];
  let lineEndsHyphenated = false;
  for (const lineNode of doc.querySelectorAll('TextLine')) {
    const line = {
      height: Number.parseInt(lineNode.getAttribute('HEIGHT'), 10) * scaleFactorY,
      text: '',
      width: Number.parseInt(lineNode.getAttribute('WIDTH'), 10) * scaleFactorX,
      spans: [],
      x: Number.parseInt(lineNode.getAttribute('HPOS'), 10) * scaleFactorX,
      y: Number.parseInt(lineNode.getAttribute('VPOS'), 10) * scaleFactorY,
    };
    const textNodes = lineNode.querySelectorAll('String, SP, HYP');
    for (const [textIdx, textNode] of textNodes.entries()) {
      const endOfLine = textIdx === textNodes.length - 1;
      const styleRefs = textNode.getAttribute('STYLEREFS');
      let style = null;
      if (styleRefs !== null) {
        style = styleRefs
          .split(' ')
          .map((refId) => styles[refId])
          .filter((s) => s !== undefined)
          .join('');
      }

      let width = Number.parseInt(textNode.getAttribute('WIDTH'), 10) * scaleFactorX;
      let height = Number.parseInt(textNode.getAttribute('HEIGHT'), 10) * scaleFactorY;
      if (Number.isNaN(height)) {
        height = line.height;
      }
      let x = Number.parseInt(textNode.getAttribute('HPOS'), 10) * scaleFactorX;
      let y = Number.parseInt(textNode.getAttribute('VPOS'), 10) * scaleFactorY;
      if (Number.isNaN(y)) {
        y = line.y;
      }

      if (textNode.tagName === 'String' || textNode.tagName === 'HYP') {
        const text = textNode.getAttribute('CONTENT');

        // Update the width of a preceding extra space span to fill the area
        // between the previous word and this one.
        const previousExtraSpan = line.spans.slice(-1).filter((s) => s.isExtra)?.[0];
        if (previousExtraSpan) {
          let extraWidth = x - previousExtraSpan.x;
          // Needed to force browsers to render the whitespace
          if (extraWidth === 0) {
            extraWidth = 0.0001;
            previousExtraSpan.x -= extraWidth;
          }
          previousExtraSpan.width = extraWidth;
        }

        line.spans.push({
          isExtra: false,
          x,
          y,
          width,
          height,
          text,
          style,
        });

        // Add extra space span if ALTO does not encode spaces itself
        if (!hasSpaces && !endOfLine) {
          line.spans.push({
            isExtra: true,
            x: x + width,
            y,
            height,
            text: ' ',
            // NOTE: Does not have width initially, will be set when we encounter
            //       the next proper word span
          });
        }
        lineEndsHyphenated = textNode.tagName === 'HYP';
      } else if (textNode.tagName === 'SP') {
        // Needed to force browsers to render the whitespace
        if (width === 0) {
          width = 0.0001;
          x -= width;
        }
        line.spans.push({
          isExtra: false,
          x,
          y,
          width,
          height,
          text: ' ',
        });
      }
    }
    if (line.spans.length === 0) {
      continue;
    }
    if (!lineEndsHyphenated) {
      line.spans.slice(-1)[0].text += '\n';
    }
    lineEndsHyphenated = false;
    line.text = line.spans.map(({ text }) => text).join('');
    lines.push(line);
  }
  return {
    height: pageHeight,
    lines,
    width: pageWidth,
  };
}

/** Helper to calculate a rough fallback image size from the line coordinates */
function getFallbackImageSize(lines) {
  return {
    width: max(lines.map(({ x, width }) => x + width)),
    height: max(lines.map(({ y, height }) => y + height)),
  };
}

/**
 * Parse an OCR document (currently hOCR or ALTO)
 *
 * @param {string} ocrText  ALTO or hOCR markup
 * @param {object} referenceSize Reference size to scale coordinates to
 */
export function parseOcr(ocrText, referenceSize) {
  let parse;
  if (ocrText.indexOf('<alto') >= 0) {
    parse = parseAlto(ocrText, referenceSize);
  } else {
    parse = parseHocr(ocrText, referenceSize);
  }
  if (!parse.width || !parse.height) {
    parse = { ...parse, ...getFallbackImageSize(parse.lines) };
  }
  return parse;
}

/** Parse OCR data from IIIF annotations.
 *
 * Annotations should be pre-filtered so that they all refer to a single canvas/page.
 * Annotations should only contain a single text granularity, that is either line or word.
 *
 * @param annos IIIF annotations with a plaintext body and line or word granularity
 * @param renderedWidth Reference width of the rendered target image
 * @param renderedHeight Reference height of the rendered target image
 * @param scaleFactor Factor to apply to coordinates to convert from canvas size to rendered size
 * @returns parsed OCR boxes
 */
export function parseIiifAnnotations(annos, imgSize) {
  const fragmentPat = /.+#xywh=(\d+),(\d+),(\d+),(\d+)/g;

  // TODO: Handle word-level annotations
  // See if we can tell from the annotations themselves if it targets a line
  const lineAnnos = annos.filter(
    (anno) =>
      anno.textGranularity === 'line' || // IIIF Text Granularity
      anno.dcType === 'Line' // Europeana
  );
  const targetAnnos = lineAnnos.length > 0 ? lineAnnos : annos;
  const boxes = targetAnnos.map((anno) => {
    let text;
    if (anno.resource) {
      text = anno.resource.chars ?? anno.resource.value;
    } else {
      text = anno.body.value;
    }
    let target = anno.target || anno.on;
    target = Array.isArray(target) ? target[0] : target;
    const [x, y, width, height] = target.matchAll(fragmentPat).next().value.slice(1, 5);
    return {
      height: parseInt(height, 10),
      text,
      width: parseInt(width, 10),
      x: parseInt(x, 10),
      y: parseInt(y, 10),
    };
  });

  return {
    ...(imgSize ?? getFallbackImageSize(boxes)),
    lines: boxes,
  };
}
