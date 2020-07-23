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
  /** Register refs that allow us to directly access the actual render components */
  constructor(props) {
    super(props);

    this.renderRefs = [
      React.createRef(),
      React.createRef(),
    ];
  }

  /** Register OpenSeadragon callback on initial mount */
  componentDidMount() {
    const { enabled, viewer } = this.props;
    if (enabled && viewer) {
      this.registerOsdCallback();
    }
  }

  /** Register OpenSeadragon callback when viewport changes */
  componentDidUpdate(prevProps) {
    const {
      enabled, viewer, opacity, pageTexts,
    } = this.props;

    // OSD instance becomes available, register callback
    if (enabled && viewer && viewer !== prevProps.viewer) {
      this.registerOsdCallback();
    }
    // Newly enabled, force initial setting of state from OSD
    const newlyEnabled = (
      (this.shouldRender() && !this.shouldRender(prevProps))
      || (pageTexts.filter(this.shouldRenderPage).length
          !== prevProps.pageTexts.filter(this.shouldRenderPage).length));

    if (newlyEnabled) {
      this.onUpdateViewport();
    }

    // Manually update SVG opacity for performance reasons
    if (opacity !== prevProps.opacity) {
      this.renderRefs
        .filter((ref) => ref.current != null)
        .forEach((ref) => ref.current.updateOpacity(opacity));
    }
  }

  /** OpenSeadragon viewport update callback */
  onUpdateViewport() {
    // Do nothing if the overlay is not currently rendered
    if (!this.shouldRender) {
      return;
    }

    const { viewer, canvasWorld } = this.props;

    // Determine new scale factor and position for each page
    const vpBounds = viewer.viewport.getBounds(true);
    const viewportZoom = viewer.viewport.getZoom(true);
    for (let itemNo = 0; itemNo < viewer.world.getItemCount(); itemNo += 1) {
      // Skip update if we don't have a reference to the PageTextDisplay instance
      if (!this.renderRefs[itemNo].current) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const img = viewer.world.getItemAt(itemNo);
      const canvasDims = canvasWorld.canvasDimensions[itemNo];
      const canvasWorldOffset = itemNo > 0
        ? (img.source.dimensions.x - canvasDims.width)
          + canvasWorld.canvasDimensions[itemNo - 1].width
        : 0;
      const canvasWorldScale = (img.source.dimensions.x / canvasDims.width);
      this.renderRefs[itemNo].current.updateTransforms(
        img.viewportToImageZoom(viewportZoom),
        vpBounds.x * canvasWorldScale - canvasWorldOffset,
        vpBounds.y * canvasWorldScale,
      );
    }
  }

  /** If the page should be rendered */
  shouldRenderPage = ({ lines }) => (
    lines
    && lines.length > 0
    && lines.some(({ text, words }) => text || (words && words.length > 0)))

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
      pageTexts, selectable, visible, viewer, opacity,
    } = this.props;
    if (!this.shouldRender() || !viewer || !pageTexts) {
      return null;
    }
    return ReactDOM.createPortal(
      <>
        {pageTexts
          .map(({
            lines, source, width: pageWidth, height: pageHeight,
          }, idx) => {
            if (!this.shouldRenderPage({ lines })) {
              return null;
            }
            return (
              <PageTextDisplay
                ref={this.renderRefs[idx]}
                key={source}
                lines={lines}
                source={source}
                selectable={selectable}
                visible={visible}
                opacity={opacity}
                width={pageWidth}
                height={pageHeight}
              />
            );
          })}
      </>,
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
