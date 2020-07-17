import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import PageTextDisplay from './PageTextDisplay';
import PerformanceMonitor from '../lib/perf';

/** Overlay that renders OCR or transcription text in a SVG.
 *
 * Synchronizes the text position to the underlying OpenSeadragon viewer viewport so that
 * every line or word (depending on the granularity of the text/transcription) is rendered
 * at the correct position.
 */
class MiradorTextOverlay extends Component {
  /** Set up initial state */
  constructor(props) {
    super(props);

    this.perfMon = new PerformanceMonitor(350);

    this.state = {
      animating: false,
      containerHeight: undefined,
      containerWidth: undefined,
      hideDuringAnimation: false,
      pageTransforms: [],
      showPerformanceNotification: false,
    };
  }

  /** Register OpenSeadragon callback on initial mount */
  componentDidMount() {
    const { enabled, viewer } = this.props;
    if (enabled && viewer) {
      this.registerOsdCallbacks();
    }
  }

  /** Register OpenSeadragon callback when viewer changes */
  componentDidUpdate(prevProps) {
    const { enabled, viewer } = this.props;
    // OSD instance becomes available, register callback
    if (enabled && viewer && viewer !== prevProps.viewer) {
      this.registerOsdCallbacks();
    }
    // Newly enabled, force initial setting of state from OSD
    if (this.shouldRender() && !this.shouldRender(prevProps)) {
      this.onUpdateViewport();
    }
  }

  /** OpenSeadragon viewport update callback */
  onUpdateViewport() {
    // Do nothing if the overlay is not currently rendered
    if (!this.shouldRender) {
      return;
    }

    // Update container and SVG width/height
    const {
      animating, containerHeight, containerWidth, hideDuringAnimation,
    } = this.state;
    const { viewer, canvasWorld, visible } = this.props;
    if (animating && (!visible || hideDuringAnimation)) {
      // If the text is not visible, we can delay the expensive updating
      // until we've finished animating, since the user cannot interact
      // with the text during animation anyway.
      return;
    }
    const newState = {};
    if (containerWidth !== viewer.container.clientWidth) {
      newState.containerWidth = viewer.container.clientWidth;
    }
    if (containerHeight !== viewer.container.clientHeight) {
      newState.containerHeight = viewer.container.clientHeight;
    }

    // Update SVG page transforms and x-offsets
    newState.pageTransforms = [];
    newState.xOffsets = [0];
    const vpBounds = viewer.viewport.getBounds(true);
    const viewportZoom = viewer.viewport.getZoom(true);
    for (let itemNo = 0; itemNo < viewer.world.getItemCount(); itemNo += 1) {
      const img = viewer.world.getItemAt(itemNo);
      const canvasDims = canvasWorld.canvasDimensions[itemNo];
      // Mirador canvas world scale factor
      const canvasWorldScale = (img.source.dimensions.x / canvasDims.width);
      // Absolute difference between unscaled width and width in canvas world, only relevant
      // for canvases other than the first one
      const canvasWorldOffset = itemNo > 0 ? img.source.dimensions.x - canvasDims.width : 0;
      newState.pageTransforms.push({
        scaleFactor: img.viewportToImageZoom(viewportZoom),
        translateX: -1 * vpBounds.x * canvasWorldScale + canvasWorldOffset,
        translateY: -1 * vpBounds.y * canvasWorldScale,
      });
      newState.xOffsets.push(canvasDims.width);
    }
    this.setState(newState);
  }

  /** If the overlay should be rendered at all */
  shouldRender(props) {
    const {
      enabled, visible, selectable, pageTexts,
    } = props ?? this.props;
    return (enabled && (visible || selectable) && pageTexts.length > 0);
  }

  /** Update container dimensions and page scale/offset every time the OSD viewport changes. */
  registerOsdCallbacks() {
    const { viewer } = this.props;
    viewer.addHandler('animation-start', () => {
      const { hideDuringAnimation } = this.state;
      if (!hideDuringAnimation) {
        this.perfMon.start();
      }
      this.setState({ animating: true });
    });
    viewer.addHandler('update-viewport', this.onUpdateViewport.bind(this));
    viewer.addHandler('animation-finish', () => {
      const { hideDuringAnimation } = this.state;
      const newState = { animating: false };
      if (!hideDuringAnimation) {
        this.perfMon.stop();
        if (this.perfMon.isPerformanceDegraded) {
          newState.hideDuringAnimation = true;
          newState.showPerformanceNotification = true;
        }
      }
      this.setState(newState);
      this.onUpdateViewport();
    });
  }

  /** Render the text overlay SVG */
  render() {
    const {
      pageTexts, selectable, opacity, t, visible, viewer,
    } = this.props;
    if (!this.shouldRender() || !viewer || !pageTexts) {
      return null;
    }
    const {
      containerWidth: width, containerHeight: height, pageTransforms, xOffsets,
      animating, showPerformanceNotification, hideDuringAnimation,
    } = this.state;
    const containerStyles = {
      height,
      left: 0,
      position: 'relative',
      top: 0,
      width,
    };
    const svgStyles = {
      // Hide the SVG and don't remove it, since we don't want to destroy
      // a user's selection
      display: (animating && (!visible || hideDuringAnimation)) ? 'none' : undefined,
      height,
      width,
    };
    // eslint-disable-next-line require-jsdoc
    const closeNotification = () => this.setState({ showPerformanceNotification: false });
    return ReactDOM.createPortal(
      <div style={containerStyles}>
        {showPerformanceNotification
          && (
          <Snackbar
            anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
            autoHideDuration={30000}
            open
            onClose={closeNotification}
            message={t('performanceDegradationDetected')}
            action={(
              // The 'dismiss' label comes from M3 itself
              <IconButton size="small" aria-label={t('dismiss')} color="inherit" onClick={closeNotification}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          />
          )}
        <svg xmlns="http://www.w3.org/2000/svg" style={svgStyles}>
          {pageTexts.map(({ lines, source }, idx) => (
            pageTransforms[idx]
            && lines && lines.length > 0 && (
            <PageTextDisplay
              key={source}
              lines={lines}
              selectable={selectable}
              source={source}
              displayText={visible}
              opacity={opacity}
              scaleFactor={pageTransforms[idx].scaleFactor}
              translateX={pageTransforms[idx].translateX}
              translateY={pageTransforms[idx].translateY}
              xOffset={xOffsets?.[idx] ?? 0}
            />
            )
          ))}
        </svg>
      </div>,
      viewer.canvas,
    );
  }
}

MiradorTextOverlay.propTypes = {
  canvasWorld: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  enabled: PropTypes.bool,
  opacity: PropTypes.number,
  pageTexts: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  selectable: PropTypes.bool,
  t: PropTypes.func,
  viewer: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  visible: PropTypes.bool,
};

MiradorTextOverlay.defaultProps = {
  canvasWorld: undefined,
  enabled: true,
  opacity: 0.75,
  pageTexts: undefined,
  selectable: true,
  t: (key) => key,
  viewer: undefined,
  visible: false,
};

export default MiradorTextOverlay;
