import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import PageTextDisplay from './PageTextDisplay';

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

    this.state = {
      containerHeight: undefined,
      containerWidth: undefined,
      pageTransforms: [],
    };
  }

  /** Register OpenSeadragon callback on initial mount */
  componentDidMount() {
    const { enabled, viewer } = this.props;
    if (enabled && viewer) {
      this.registerOsdCallback();
    }
  }

  /** Register OpenSeadragon callback when viewer changes */
  componentDidUpdate(prevProps) {
    const { enabled, viewer } = this.props;
    // OSD instance becomes available, register callback
    if (enabled && viewer && viewer !== prevProps.viewer) {
      this.registerOsdCallback();
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
    const { containerHeight, containerWidth } = this.state;

    // Update container and SVG width/height
    const { viewer, canvasWorld } = this.props;
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
  registerOsdCallback() {
    const { viewer } = this.props;
    viewer.addHandler('update-viewport', this.onUpdateViewport.bind(this));
  }

  /** Render the text overlay SVG */
  render() {
    const {
      pageTexts, selectable, opacity, visible, viewer,
    } = this.props;
    if (!this.shouldRender() || !viewer || !pageTexts) {
      return null;
    }
    const {
      containerWidth: width, containerHeight: height, pageTransforms, xOffsets,
    } = this.state;
    const containerStyles = {
      height,
      left: 0,
      position: 'relative',
      top: 0,
      width,
    };
    const svgStyles = {
      height,
      width,
    };
    return ReactDOM.createPortal(
      <div style={containerStyles}>
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
  viewer: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  visible: PropTypes.bool,
};

MiradorTextOverlay.defaultProps = {
  canvasWorld: undefined,
  enabled: true,
  opacity: 0.75,
  pageTexts: undefined,
  selectable: true,
  viewer: undefined,
  visible: false,
};

export default MiradorTextOverlay;
