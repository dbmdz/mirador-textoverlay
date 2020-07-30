import { updateWindow } from 'mirador/dist/es/src/state/actions';
import { getWindowConfig } from 'mirador/dist/es/src/state/selectors';

import { textsReducer } from './state/reducers';
import textSaga from './state/sagas';
import { getTextsForVisibleCanvases, getWindowTextOverlayOptions } from './state/selectors';
import MiradorTextOverlay from './components/MiradorTextOverlay';
import TextOverlaySettingsBubble from './components/TextOverlaySettingsBubble';

export default [
  {
    component: MiradorTextOverlay,
    mapStateToProps: (state, { windowId }) => ({
      pageTexts: getTextsForVisibleCanvases(state, { windowId })
        .filter((canvasText) => !canvasText.isFetching)
        .map((canvasText) => ({
          ...canvasText.text,
          source: canvasText.source,
          textColor: canvasText.textColor,
          bgColor: canvasText.bgColor,
        })),
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
    component: TextOverlaySettingsBubble,
    mapDispatchToProps: (dispatch, { windowId }) => ({
      updateWindowTextOverlayOptions: (options) => dispatch(
        updateWindow(windowId, { textOverlay: options }),
      ),
    }),
    mapStateToProps: (state, { windowId, PluginComponents }) => {
      // Check if mirador-image-tools plugin is available. We can't rely on the presence of
      // the `imageToolsEnabled` window option, since the plugin is currently enabled by default,
      // even in the absence of the option.
      // FIXME: This should be removed once ProjectMirador/mirador-image-tools#23 is merged
      const imageToolsPresent = PluginComponents
        .filter(({ WrappedComponent: { name } }) => name === 'MiradorImageTools')
        .length > 0;
      const { imageToolsEnabled } = getWindowConfig(state, { windowId });
      return {
        imageToolsEnabled: imageToolsEnabled ?? imageToolsPresent,
        textsAvailable: getTextsForVisibleCanvases(state, { windowId }).length > 0,
        textsFetching: getTextsForVisibleCanvases(state, { windowId }).some((t) => t.isFetching),
        pageColors: getTextsForVisibleCanvases(state, { windowId })
          .map(({ textColor, bgColor }) => ({ textColor, bgColor })),
        windowTextOverlayOptions: getWindowTextOverlayOptions(state, { windowId }),
      };
    },
    mode: 'add',
    target: 'OpenSeadragonViewer',
  },
];
