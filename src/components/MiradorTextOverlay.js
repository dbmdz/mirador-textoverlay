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
  componentDidUpdate({ viewer: oldViewer }) {
    const { enabled, viewer } = this.props;
    if (enabled && viewer && viewer !== oldViewer) {
      this.registerOsdCallback();
    }
  }

  /** Update container dimensions and page scale/offset every time the OSD viewport changes. */
  registerOsdCallback() {
    const { containerHeight, containerWidth } = this.state;
    const { viewer } = this.props;

    viewer.addHandler('update-viewport', () => {
      // Update container and SVG width/height
      const newState = {};
      if (containerWidth !== viewer.container.clientWidth) {
        newState.containerWidth = viewer.container.clientWidth;
      }
      if (containerHeight !== viewer.container.clientHeight) {
        newState.containerHeight = viewer.container.clientHeight;
      }

      // Update SVG page transforms and x-offsets
      // FIXME: The calculations are way off when canvas #0 is smaller than canvas #1
      // and canvas #1 gets scaled down because of this. Not a problem if it's the other
      // way round (i.e. #0 gets downscaled) or there's no scaling involved, how do we fix this?
      newState.pageTransforms = [];
      newState.xOffsets = [];
      const vpBounds = viewer.viewport.getBounds(true);
      const viewportZoom = viewer.viewport.getZoom(true);
      for (let itemNo = 0; itemNo < viewer.world.getItemCount(); itemNo += 1) {
        const img = viewer.world.getItemAt(itemNo);
        newState.pageTransforms.push({
          scaleFactor: img.viewportToImageZoom(viewportZoom),
          translateX: -1 * vpBounds.x,
          translateY: -1 * vpBounds.y,
        });
        // TODO: Use this.props.canvasWorrld.canvasDimensions instead
        if (itemNo === 0) {
          newState.xOffsets = [0, img.source.dimensions.x];
        }
      }
      this.setState(newState);
    });
  }

  /** Render the text overlay SVG */
  render() {
    const {
      enabled, pageTexts, selectable, opacity, visible, viewer,
    } = this.props;
    if (!enabled || !viewer) {
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
            && (
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
  enabled: PropTypes.bool,
  opacity: PropTypes.number,
  pageTexts: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  selectable: PropTypes.bool,
  viewer: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  visible: PropTypes.bool,
};

MiradorTextOverlay.defaultProps = {
  enabled: true,
  opacity: 0.75,
  pageTexts: undefined,
  selectable: true,
  viewer: undefined,
  visible: false,
};

export default MiradorTextOverlay;
