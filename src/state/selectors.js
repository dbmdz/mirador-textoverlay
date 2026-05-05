import { getVisibleCanvases, getWindowConfig, miradorSlice } from 'mirador';
import { createSelector } from 'reselect';

const defaultConfig = {
  // Enable the text selection and display feature
  enabled: true,
  // Default opacity of text overlay
  opacity: 1.0,
  // Make text selectable by default
  selectable: false,
  // Overlay text overlay by default
  visible: false,
  // Try to automatically determine the text and background color
  useAutoColors: true,
  // Color of rendered text, used as a fallback if auto-detection is enabled and fails
  textColor: '#000000',
  // Color of line background, used as a fallback if auto-detection is enabled and fails
  bgColor: '#ffffff',
};

/** Selector to get text display options for a given window */
export const getWindowTextOverlayOptions = createSelector([getWindowConfig], ({ textOverlay }) => ({
  ...defaultConfig,
  ...(textOverlay ?? {}),
}));

/** Selector to get all loaded texts */
export const getTexts = (state) => miradorSlice(state).texts;

/** Selector for text on all visible canvases */
export const getTextsForVisibleCanvases = createSelector(
  [getVisibleCanvases, getTexts],
  (canvases, allTexts) => {
    if (!allTexts || !canvases) return [];
    const texts = canvases.map((canvas) => allTexts[canvas.id]);
    if (texts.every((t) => t === undefined)) {
      return [];
    }
    return texts;
  },
);

function toPageText(canvasText) {
  if (canvasText === undefined || canvasText.isFetching) {
    return undefined;
  }

  return {
    ...canvasText.text,
    source: canvasText.source,
    textColor: canvasText.textColor,
    bgColor: canvasText.bgColor,
  };
}

/** Selector for overlay-ready text props on all visible canvases */
export const getPageTexts = createSelector([getTextsForVisibleCanvases], (texts) =>
  texts.map(toPageText),
);
