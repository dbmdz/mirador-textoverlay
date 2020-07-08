import { setWindowTextOverlayOptions } from './state/actions';
import { textsReducer, windowTextOverlayOptionsReducer } from './state/reducers';
import textSaga from './state/sagas';
import { getWindowTextOverlayOptions, getTextsForVisibleCanvases } from './state/selectors';
import MiradorTextOverlay from './components/MiradorTextOverlay';
import WindowTextSettings from './components/WindowTextSettings';

export default [
  {
    component: MiradorTextOverlay,
    mapStateToProps: (state, { windowId }) => ({
      pageTexts: getTextsForVisibleCanvases(state, { windowId })
        .filter((canvasText) => !canvasText.isFetching)
        .map((canvasText) => ({
          ...canvasText.text,
          source: canvasText.source,
        })),
      windowId,
      ...getWindowTextOverlayOptions(state, { windowId }),
    }),
    mode: 'add',
    reducers: {
      texts: textsReducer,
      windowTextOverlayOptions: windowTextOverlayOptionsReducer,
    },
    saga: textSaga,
    target: 'OpenSeadragonViewer',
  },
  {
    component: WindowTextSettings,
    mapDispatchToProps: { setWindowTextOverlayOptions },
    mapStateToProps: (state, { windowId }) => ({
      textAvailable: getTextsForVisibleCanvases(state, { windowId }).length > 0,
      windowId,
      windowTextOverlayOptions: getWindowTextOverlayOptions(state, { windowId }),
    }),
    mode: 'add',
    target: 'WindowTopBarPluginMenu',
  },
];
