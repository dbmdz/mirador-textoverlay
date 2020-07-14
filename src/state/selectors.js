import { createSelector } from 'reselect';

import { getCanvas, getWindowConfig, getVisibleCanvases } from 'mirador/dist/es/src/state/selectors';
import { miradorSlice } from 'mirador/dist/es/src/state/selectors/utils';

const defaultConfig = {
  // Enable the text selection and display feature
  enabled: true,
  // Default opacity of text overlay
  opacity: 1.0,
  // Make text selectable by default
  selectable: false,
  // Overlay text overlay by default
  visible: false,
};

/** Selector to get text display options for a given window */
export const getWindowTextOverlayOptions = createSelector(
  [getWindowConfig],
  ({ textOverlay }) => ({
    ...defaultConfig,
    ...(textOverlay ?? {}),
  }),
);

/** Selector to get all loaded texts */
export const getTexts = (state) => miradorSlice(state).texts;

/** Selector for a single canvas' text */
export const getTextForCanvas = createSelector(
  [
    getCanvas,
    getTexts,
  ],
  (canvas, texts) => {
    if (!texts || !canvas) return null;
    if (!texts[canvas.id]) return null;

    return texts[canvas.id] && {
      ...texts[canvas.id].text,
      source: texts[canvas.id].source,
    };
  },
);

/** Selector for text on all visible canvases */
export const getTextsForVisibleCanvases = createSelector(
  [
    getVisibleCanvases,
    getTexts,
  ],
  (canvases, texts) => {
    if (!texts || !canvases) return null;
    return canvases.map((c) => c.id)
      .map((targetId) => texts[targetId])
      .filter((canvasText) => canvasText !== undefined);
  },
);
