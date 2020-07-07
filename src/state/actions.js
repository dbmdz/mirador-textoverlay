export const PluginActionTypes = {
  DISCOVERED_TEXT: 'mirador-textoverlay/DISCOVERED_TEXT',
  RECEIVE_TEXT: 'mirador-textoverlay/RECEIVE_TEXT',
  RECEIVE_TEXT_FAILURE: 'mirador-textoverlay/RECEIVE_TEXT_FAILURE',
  REQUEST_TEXT: 'mirador-textoverlay/REQUEST_TEXT',
  SET_WINDOW_TEXTDISPLAY_OPTIONS: 'mirador-textoverlay/SET_WINDOW_TEXTDISPLAY_OPTIONS',
};

/**
 * setWindowTextDisplayOptions - action creator
 *
 * @param {String} windowId
 * @param {Object} textDisplayOptions
 * @param {Boolean} textDisplayOptions.enabled
 * @param {Boolean} textDisplayOptions.selectable
 * @param {Boolean} textDisplayOptions.visible
 * @param {number} textDisplayOptions.opacity
 */
export function setWindowTextDisplayOptions(windowId, textDisplayOptions) {
  return {
    textDisplayOptions,
    type: PluginActionTypes.SET_WINDOW_TEXTDISPLAY_OPTIONS,
    windowId,
  };
}

/**
 * discoveredText: action creator
 *
 * @param {String} targetId
 * @param {String} textUri
 */
export function discoveredText(targetId, textUri) {
  return {
    targetId,
    textUri,
    type: PluginActionTypes.DISCOVERED_TEXT,
  };
}

/**
 * requestText - action creator
 *
 * @param  {String} targetId
 * @param  {String} textUri
 * @param   {object} canvasSize
 * @memberof ActionCreators
 */
export function requestText(targetId, textUri, canvasSize) {
  return {
    canvasSize,
    targetId,
    textUri,
    type: PluginActionTypes.REQUEST_TEXT,
  };
}

/**
 * receiveText - action creator
 *
 * @param  {String} targetId
 * @param  {String} textUri
 * @param  {Object} parsedText
 * @memberof ActionCreators
 */
export function receiveText(targetId, textUri, sourceType, parsedText) {
  return {
    parsedText,
    sourceType,
    targetId,
    textUri,
    type: PluginActionTypes.RECEIVE_TEXT,
  };
}

/**
 * receiveTextFailure - action creator
 *
 * @param  {String} targetId
 * @param  {String} textUri
 * @param  {String} error
 * @memberof ActionCreators
 */
export function receiveTextFailure(targetId, textUri, error) {
  return {
    error,
    targetId,
    textUri,
    type: PluginActionTypes.RECEIVE_TEXT_FAILURE,
  };
}
