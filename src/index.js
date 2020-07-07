import { setWindowTextDisplayOptions } from './state/actions';
import { textsReducer, windowTextDisplayOptionsReducer } from './state/reducers';
import textSaga from './state/sagas';
import { getWindowTextDisplayOptions, getTextsForVisibleCanvases } from './state/selectors';
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
      ...getWindowTextDisplayOptions(state, { windowId }),
    }),
    mode: 'add',
    reducers: {
      texts: textsReducer,
      windowTextDisplayOptions: windowTextDisplayOptionsReducer,
    },
    saga: textSaga,
    target: 'OpenSeadragonViewer',
  },
  {
    component: WindowTextSettings,
    mapDispatchToProps: { setWindowTextDisplayOptions },
    mapStateToProps: (state, { windowId }) => ({
      textAvailable: getTextsForVisibleCanvases(state, { windowId }).length > 0,
      windowId,
      windowTextDisplayOptions: getWindowTextDisplayOptions(state, { windowId }),
    }),
    mode: 'add',
    target: 'WindowTopBarPluginMenu',
  },
];
