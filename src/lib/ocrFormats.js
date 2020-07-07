/** Functions to parse OCR boxes from various formats and render them as SVG. */
const parser = new DOMParser();
const namespaces = {
  alto2: 'http://www.loc.gov/standards/alto/ns-v2#',
  alto3: 'http://www.loc.gov/standards/alto/ns-v3#',
  alto4: 'http://www.loc.gov/standards/alto/ns-v4#',
};

/** Parse hOCR attributes from a node's title attribute */
function parseHocrAttribs(titleAttrib) {
  const vals = titleAttrib.split(';');
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
function parseHocrNode(node, endOfLine = false) {
  const [ulx, uly, lrx, lry] = parseHocrAttribs(node.title).bbox;
  let width = lrx - ulx;
  const height = lry - uly;
  let text = node.textContent;
  if (node.nextSibling instanceof Text) {
    const charWidth = (lrx - ulx) / text.length;
    const extraText = node.nextSibling.wholeText.replace(/\s+/, ' ');
    text += extraText;
    // Increase the width of the node to compensate for the extra characters
    if (!endOfLine) {
      width += charWidth * extraText.length;
    }
  }
  let style = node.getAttribute('style');
  if (style) {
    style = style.replace(/font-size:.+;/, '');
  }
  return {
    height,
    style,
    text: text.replace('\u00AD', '-'), // Soft hyphens should be visible
    width,
    x: ulx,
    y: uly,
  };
}


/** Parse an hOCR document */
export function parseHocr(hocrText) {
  const doc = parser.parseFromString(hocrText, 'text/html');
  const pageNode = doc.querySelector('div.ocr_page');
  const pageSize = parseHocrAttribs(pageNode.title).bbox;
  const lines = [];
  // FIXME: Seems to be an eslint bug: https://github.com/eslint/eslint/issues/12117
  // eslint-disable-next-line no-unused-vars
  for (const lineNode of pageNode.querySelectorAll(
    'span.ocr_line, span.ocrx_line',
  )) {
    const wordNodes = lineNode.querySelectorAll('span.ocrx_word');
    if (wordNodes.length === 0) {
      lines.push(parseHocrNode(lineNode, true));
    } else {
      const line = parseHocrNode(lineNode, true);
      const words = [];
      // eslint-disable-next-line no-unused-vars
      for (const [i, wordNode] of wordNodes.entries()) {
        words.push(parseHocrNode(wordNode, i === wordNodes.length - 1));
      }
      line.words = words;
      line.text = words.map((w) => w.text).join('');
      lines.push(line);
    }
  }
  return {
    height: pageSize[3],
    lines,
    width: pageSize[2],
  };
}


/** Create CSS directives from an ALTO TextStyle node */
function altoStyleNodeToCSS(styleNode) {
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
    styles.push(`font-style: #${styleNode.getAttribute('FONTSTYLE')}`);
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
  const altoNamespace = doc.firstElementChild.getAttribute('xmlns');
  if (
    altoNamespace !== namespaces.alto2
    && altoNamespace !== namespaces.alto3
    && altoNamespace !== namespaces.alto4
  ) {
    console.error('Unsupported ALTO namespace: ', altoNamespace);
    return null;
  }
  /** Namespace resolver that forrces the ALTO namespace */
  const altoResolver = () => altoNamespace;
  const measurementUnit = doc.evaluate(
    '/alto:alto/alto:Description/alto:MeasurementUnit',
    doc,
    altoResolver,
    XPathResult.STRING_TYPE,
  ).stringValue;
  const pageElem = doc.evaluate(
    '/alto:alto/alto:Layout/alto:Page',
    doc,
    altoResolver,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
  ).singleNodeValue;
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
  const styleIter = doc.evaluate(
    '/alto:alto/alto:Styles/alto:TextStyle',
    doc,
    altoResolver,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
  );
  let styleNode = styleIter.iterateNext();
  while (styleNode) {
    styles[styleNode.getAttribute('ID')] = altoStyleNodeToCSS(styleNode);
    styleNode = styleIter.iterateNext();
  }

  const hasSpaces = doc.evaluate(
    'count(//alto:SP)',
    doc,
    altoResolver,
    XPathResult.NUMBER_TYPE,
  ) > 0;
  const lines = [];
  const lineIter = doc.evaluate(
    './/alto:TextLine',
    doc,
    altoResolver,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
  );
  let lineNode = lineIter.iterateNext();
  let lineEndsHyphenated = false;
  while (lineNode) {
    const line = {
      height: Number.parseInt(lineNode.getAttribute('HEIGHT'), 10) * scaleFactorY,
      text: '',
      width: Number.parseInt(lineNode.getAttribute('WIDTH'), 10) * scaleFactorX,
      words: [],
      x: Number.parseInt(lineNode.getAttribute('HPOS'), 10) * scaleFactorX,
      y: Number.parseInt(lineNode.getAttribute('VPOS'), 10) * scaleFactorY,
    };
    const wordIter = doc.evaluate(
      './/alto:*',
      lineNode,
      altoResolver,
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    );
    let wordNode = wordIter.iterateNext();
    while (wordNode) {
      const styleRefs = wordNode.getAttribute('STYLEREFS');
      let style = null;
      if (styleRefs !== null) {
        style = styleRefs
          .split(' ')
          .map((refId) => styles[refId])
          .filter((s) => s !== undefined)
          .join('');
      }
      let text;
      if (wordNode.tagName === 'String') {
        text = wordNode.getAttribute('CONTENT');
      } else if (wordNode.tagName === 'SP') {
        text = ' ';
      } else if (wordNode.tagName === 'HYP') {
        lineEndsHyphenated = true;
      }
      // NOTE: Hyphenation elements are ignored
      let width = Number.parseInt(wordNode.getAttribute('WIDTH'), 10) * scaleFactorX;
      const height = Number.parseInt(wordNode.getAttribute('HEIGHT'), 10) * scaleFactorY;
      const x = Number.parseInt(wordNode.getAttribute('HPOS'), 10) * scaleFactorX;
      const y = Number.parseInt(wordNode.getAttribute('VPOS'), 10) * scaleFactorY;
      wordNode = wordIter.iterateNext();

      // Not at end of line and doc doesn't encode spaces, add whitespace after word
      if (!hasSpaces && text !== ' ' && wordNode) {
        width += width / text.length;
        text += ' ';
      }
      if (text) {
        line.words.push({
          height, style, text, width, x, y,
        });
      }
      line.text += text;
    }
    if (!lineEndsHyphenated) {
      line.words.slice(-1)[0].text += '\n';
    }
    lineEndsHyphenated = false;
    lines.push(line);
    lineNode = lineIter.iterateNext();
  }
  return {
    height: pageHeight,
    lines,
    width: pageWidth,
  };
}


/**
 * Parse an OCR document (currently hOCR or ALTO)
 *
 * @param {string} ocrText  ALTO or hOCR markup
 * @param {object} referenceSize Reference size to scale coordinates to
 */
export function parseOcr(ocrText, referenceSize) {
  if (ocrText.indexOf('<alto') >= 0) {
    return parseAlto(ocrText, referenceSize);
  }
  return parseHocr(ocrText, referenceSize);
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
    (anno) => anno.textGranularity === 'line' // IIIF Text Granularity
    || anno.dcType === 'Line', // Europeana
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
    const [x, y, width, height] = [...target.matchAll(fragmentPat)][0].slice(1, 5);
    return {
      height: parseInt(height, 10),
      text,
      width: parseInt(width, 10),
      x: parseInt(x, 10),
      y: parseInt(y, 10),
    };
  });
  return {
    height: imgSize?.height,
    lines: boxes,
    width: imgSize?.width,
  };
}
