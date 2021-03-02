import { createSelector } from 'reselect';

import { getWindowConfig, getVisibleCanvases, getTheme } from 'mirador/dist/es/src/state/selectors';
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
  // Try to automatically determine the text and background color
  useAutoColors: true,
  // Color of rendered text, used as a fallback if auto-detection is enabled and fails
  textColor: '#000000',
  // Color of line background, used as a fallback if auto-detection is enabled and fails
  bgColor: '#ffffff',
};

/** Selector to get text display options for a given window */
export const getWindowTextOverlayOptions = createSelector(
  [getWindowConfig, getTheme],
  ({ textOverlay }, { typography: { fontFamily } }) => ({
    fontFamily,
    ...defaultConfig,
    ...(textOverlay ?? {}),
  })
);

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
  }
);
