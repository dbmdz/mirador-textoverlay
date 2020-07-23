// This is OK since we're only ever doing shallow compares
/* eslint-disable react/no-array-index-key */

import React from 'react';
import PropTypes from 'prop-types';


/** Page Text Display component that is optimized for fast panning/zooming
 *
 * NOTE: This component is doing stuff that is NOT RECOMMENDED GENERALLY, like
 *       hacking shouldComponentUpdate to not-rerender on every prop change,
 *       setting styles manually via DOM refs, etc. This was all done to reach
 *       higher frame rates on low-end devices.
*/
class PageTextDisplay extends React.Component {
  /** Set up refs for direct transforms and pointer callback registration */
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.svgContainerRef = React.createRef();
  }

  /** Register pointerdown handler on SVG container */
  componentDidMount() {
    // FIXME: We should be able to use React for this, but it somehow doesn't work
    this.svgContainerRef.current.onpointerdown = this.onPointerDown;
  }

  /** Only update the component when some of the props changed.
   *
   * Yes, this is a horrible, horrible, hack, that will bite us in the behind at
   * some point, and is going to trip someone up terribly while debugging in the future,
   * but this way we can more precisely control when we re-render.
   */
  shouldComponentUpdate(nextProps) {
    const { source, selectable, visible } = this.props;
    return (
      nextProps.source !== source
      || nextProps.selectable !== selectable
      || nextProps.visible !== visible
    );
  }

  /** Swallow pointer events if selection is enabled */
  onPointerDown = (evt) => {
    const { selectable } = this.props;
    if (selectable) {
      evt.stopPropagation();
    }
  };

  /** Update the CSS transforms for the SVG container, i.e. scale and move the text overlay
   *
   * Intended to be called by the parent component. We use direct DOM access for this instead
   * of props since it is *significantly* faster (30fps vs 60fps on my machine).
  */
  updateTransforms(scaleFactor, x, y) {
    if (!this.containerRef.current) {
      return;
    }
    const { width, height } = this.props;
    const translateX = ((scaleFactor - 1) * width / 2) + (x * scaleFactor * -1);
    const translateY = ((scaleFactor - 1) * height / 2) + (y * scaleFactor * -1);
    const containerTransforms = [
      `translate(${translateX}px, ${translateY}px)`,
      `scale(${scaleFactor})`,
    ];
    this.containerRef.current.style.transform = containerTransforms.join(' ');
  }

  /** Update the opacity of the text and rects in the SVG.
   *
   * Again, intended to be called from the parent, again for performance reasons.
   */
  updateOpacity(opacity) {
    if (!this.svgContainerRef.current) {
      return;
    }
    // We need to apply the opacity to the individual rects and texts instead of
    // one of the containers, since otherwise the user's selection highlight would
    // become transparent as well or disappear entirely.
    for (const rect of this.svgContainerRef.current.querySelectorAll('rect')) {
      rect.style.fill = `rgba(255, 255, 255, ${opacity})`;
    }
    for (const text of this.svgContainerRef.current.querySelectorAll('text')) {
      text.style.fill = `rgba(0, 0, 0, ${opacity})`;
    }
  }

  /** Render the page overlay */
  render() {
    const {
      selectable, visible, lines, width: pageWidth, height: pageHeight, opacity,
    } = this.props;

    const containerStyle = {
      // This attribute seems to be the key to enable GPU-accelerated scaling and translation
      // (without using translate3d) and achieve 60fps on a regular laptop even with huge objects.
      willChange: 'transform',
      position: 'absolute',
    };
    const svgStyle = {
      width: pageWidth,
      height: pageHeight,
      cursor: selectable ? undefined : 'default',
    };
    const renderOpacity = (!visible && selectable) ? 0 : opacity;
    const boxStyle = { fill: `rgba(255, 255, 255, ${renderOpacity})` };
    const textStyle = { fill: `rgba(0, 0, 0, ${renderOpacity})` };
    return (
      <div
        ref={this.containerRef}
        style={containerStyle}
      >
        <svg style={svgStyle}>
          <g ref={this.svgContainerRef}>
            {lines.filter((l) => l.width > 0 && l.height > 0).map((line, lineIdx) => (
              <React.Fragment key={`${line.x}.${line.y}`}>
                <rect
                  x={line.x}
                  y={line.y}
                  width={line.width}
                  height={line.height}
                  style={boxStyle}
                />
                {line.words
                  ? (
                    <text style={textStyle}>
                      {line.words.filter((w) => w.width > 0 && w.height > 0).map(({
                        x, y, width, height, text,
                      }, wordIdx) => (
                        <tspan
                          key={`${lineIdx}-${wordIdx}`}
                          x={x}
                          y={line.y + line.height * 0.75}
                          textLength={width}
                          fontSize={`${line.height}px`}
                          lengthAdjust="spacingAndGlyphs"
                        >
                          {text}
                        </tspan>
                      ))}
                    </text>
                  )
                  : (
                    <text
                      x={line.x}
                      y={line.y + line.height * 0.75}
                      textLength={line.width}
                      fontSize={`${line.height}px`}
                      lengthAdjust="spacingAndGlyphs"
                      style={textStyle}
                    >
                      {line.text}
                    </text>
                  )}
              </React.Fragment>
            ))}
          </g>
        </svg>
      </div>
    );
  }
}

PageTextDisplay.propTypes = {
  selectable: PropTypes.bool.isRequired,
  visible: PropTypes.bool.isRequired,
  opacity: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  lines: PropTypes.array.isRequired,
  source: PropTypes.string.isRequired,
};

export default PageTextDisplay;
