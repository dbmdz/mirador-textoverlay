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
    this.containerRef = React.createRef();
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
      enabled, viewer, pageTexts, textColor, bgColor, useAutoColors, visible,
    } = this.props;
    let { opacity } = this.props;

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

    // Manually update SVG colors for performance reasons
    // eslint-disable-next-line require-jsdoc
    const hasPageColors = (text) => text.textColor !== undefined;
    if (opacity !== prevProps.opacity
        || bgColor !== prevProps.bgColor
        || textColor !== prevProps.textColor
        || useAutoColors !== prevProps.useAutoColors
        || (pageTexts.filter(hasPageColors).length
            !== prevProps.pageTexts.filter(hasPageColors).length)) {
      if (!visible) {
        opacity = 0;
      }
      this.renderRefs.forEach((ref, idx) => {
        if (!ref.current) {
          return;
        }
        let fg = textColor;
        let bg = bgColor;
        if (useAutoColors) {
          const { textColor: newFg, bgColor: newBg } = pageTexts[idx];
          if (newFg) {
            fg = newFg;
            bg = newBg;
          }
        }
        ref.current.updateColors(fg, bg, opacity);
      });
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
    if (this.containerRef.current) {
      const { clientWidth: containerWidth, clientHeight: containerHeight } = viewer.container;
      const flip = viewer.viewport.getFlip();
      const rotation = viewer.viewport.getRotation();
      const transforms = [];
      if (flip) {
        transforms.push(`translate(${containerWidth}px, 0px)`);
        transforms.push('scale(-1, 1)');
      }
      if (rotation !== 0) {
        switch (rotation) {
          case 90:
            transforms.push(`translate(${containerWidth}px, 0px)`);
            break;
          case 180:
            transforms.push(`translate(${containerWidth}px, ${containerHeight}px)`);
            break;
          case 270:
            transforms.push(`translate(0px, ${containerHeight}px)`);
            break;
          default:
            console.error(`Unsupported rotation: ${rotation}`);
        }
        transforms.push(`rotate(${rotation}deg)`);
      }
      this.containerRef.current.style.transform = transforms.join(' ');
    }
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
      pageTexts, selectable, visible, viewer, opacity, textColor, bgColor, useAutoColors,
    } = this.props;
    if (!this.shouldRender() || !viewer || !pageTexts) {
      return null;
    }
    return ReactDOM.createPortal(
      <div ref={this.containerRef} style={{ position: 'absolute' }}>
        {pageTexts
          .map(({
            lines, source, width: pageWidth, height: pageHeight,
            textColor: pageFg, bgColor: pageBg,
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
                textColor={textColor}
                bgColor={bgColor}
                useAutoColors={useAutoColors}
                pageColors={pageFg ? { textColor: pageFg, bgColor: pageBg } : undefined}
              />
            );
          })}
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
  textColor: PropTypes.string,
  bgColor: PropTypes.string,
  useAutoColors: PropTypes.bool,
};

MiradorTextOverlay.defaultProps = {
  canvasWorld: undefined,
  enabled: true,
  opacity: 0.75,
  pageTexts: undefined,
  selectable: true,
  viewer: undefined,
  visible: false,
  textColor: '#000000',
  bgColor: '#ffffff',
  useAutoColors: true,
};

export default MiradorTextOverlay;
