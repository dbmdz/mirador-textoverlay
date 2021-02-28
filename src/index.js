import { updateWindow } from 'mirador/dist/es/src/state/actions';
import { getWindowConfig, getContainerId } from 'mirador/dist/es/src/state/selectors';

import { textsReducer } from './state/reducers';
import textSaga from './state/sagas';
import { getTextsForVisibleCanvases, getWindowTextOverlayOptions } from './state/selectors';
import MiradorTextOverlay from './components/MiradorTextOverlay';
import OverlaySettings from './components/settings/OverlaySettings';

export default [
  {
    component: MiradorTextOverlay,
    mapStateToProps: (state, { windowId }) => ({
      pageTexts: getTextsForVisibleCanvases(state, { windowId }).map((canvasText) => {
        if (canvasText === undefined || canvasText.isFetching) {
          return undefined;
        }
        return {
          ...canvasText.text,
          source: canvasText.source,
          textColor: canvasText.textColor,
          bgColor: canvasText.bgColor,
        };
      }),
      windowId,
      ...getWindowTextOverlayOptions(state, { windowId }),
    }),
    mode: 'add',
    reducers: {
      texts: textsReducer,
    },
    saga: textSaga,
    target: 'OpenSeadragonViewer',
  },
  {
    component: OverlaySettings,
    mapDispatchToProps: (dispatch, { windowId }) => ({
      updateWindowTextOverlayOptions: (options) =>
        dispatch(updateWindow(windowId, { textOverlay: options })),
    }),
    mapStateToProps: (state, { windowId }) => {
      const { imageToolsEnabled = false } = getWindowConfig(state, { windowId });
      return {
        containerId: getContainerId(state),
        imageToolsEnabled,
        textsAvailable: getTextsForVisibleCanvases(state, { windowId }).length > 0,
        textsFetching: getTextsForVisibleCanvases(state, { windowId }).some((t) => t?.isFetching),
        pageColors: getTextsForVisibleCanvases(state, { windowId })
          .filter((p) => p !== undefined)
          .map(({ textColor, bgColor }) => ({ textColor, bgColor })),
        windowTextOverlayOptions: getWindowTextOverlayOptions(state, { windowId }),
      };
    },
    mode: 'add',
    target: 'OpenSeadragonViewer',
  },
];
