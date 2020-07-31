// This is OK since we're only ever doing shallow compares
/* eslint-disable react/no-array-index-key */

import React from 'react';
import PropTypes from 'prop-types';

import { changeAlpha } from '../lib/color';

/** Check if we're running in Gecko */
function runningInGecko() {
  return navigator.userAgent.indexOf('Gecko/') >= 0;
}

/** Check if we're running on a touch screen */
function runningOnTouchScreen() {
  return (
    'ontouchstart' in window
    || (window.DocumentTouch && document instanceof window.DocumentTouch)
    || navigator.maxTouchPoints > 0
    || window.navigator.msMaxTouchPoints > 0
  );
}


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
    this.svgContainerRef.current.addEventListener('pointerdown', this.onPointerDown);
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
    // Let pointerdown events propagate on touch screens. Text selection is initiated by a long
    // press gesture there, and disabling pointer down events make text selection very difficult,
    // without having a lot of advantages.
    if (!runningOnTouchScreen() && selectable) {
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
    // Scaling is done from the center of the container, so we have to update the
    // horizontal and vertical offsets we got from OSD.
    const translateX = ((scaleFactor - 1) * width / 2) + (x * scaleFactor * -1);
    const translateY = ((scaleFactor - 1) * height / 2) + (y * scaleFactor * -1);
    const containerTransforms = [
      `translate(${translateX}px, ${translateY}px)`,
      `scale(${scaleFactor})`,
    ];
    this.containerRef.current.style.display = null;
    this.containerRef.current.style.transform = containerTransforms.join(' ');
  }

  /** Update the opacity of the text and rects in the SVG.
   *
   * Again, intended to be called from the parent, again for performance reasons.
   */
  updateColors(textColor, bgColor, opacity) {
    if (!this.svgContainerRef.current) {
      return;
    }
    // We need to apply the colors to the individual rects and texts instead of
    // one of the containers, since otherwise the user's selection highlight would
    // become transparent as well or disappear entirely.
    for (const rect of this.svgContainerRef.current.querySelectorAll('rect')) {
      rect.style.fill = changeAlpha(bgColor, opacity);
    }
    for (const text of this.svgContainerRef.current.querySelectorAll('text')) {
      text.style.fill = changeAlpha(textColor, opacity);
    }
  }

  /** Render the page overlay */
  render() {
    const {
      selectable, visible, lines, width: pageWidth, height: pageHeight, opacity, textColor, bgColor,
      useAutoColors, pageColors,
    } = this.props;

    const containerStyle = {
      // This attribute seems to be the key to enable GPU-accelerated scaling and translation
      // (without using translate3d) and achieve 60fps on a regular laptop even with huge objects.
      willChange: 'transform',
      position: 'absolute',
      display: 'none', // will be cleared by first update
    };
    const svgStyle = {
      width: pageWidth,
      height: pageHeight,
      userSelect: selectable ? 'text' : 'none',
    };
    let fg = textColor;
    let bg = bgColor;
    if (useAutoColors && pageColors) {
      fg = pageColors.textColor;
      bg = pageColors.bgColor;
    }

    const renderOpacity = (!visible && selectable) ? 0 : opacity;
    const boxStyle = { fill: changeAlpha(bg, renderOpacity) };
    const textStyle = { fill: changeAlpha(fg, renderOpacity) };
    const renderLines = lines.filter((l) => l.width > 0 && l.height > 0);

    /* Firefox/Gecko does not currently support the lengthAdjust parameter on
     * <tspan> Elements, only on <text> (https://bugzilla.mozilla.org/show_bug.cgi?id=890692).
     *
     * Using <text> elements for words (and skipping the line-grouping) works fine
     * in Firefox, but breaks selection behavior in Chrome (the selected text contains
     * a newline after every word).
     *
     * So we have to go against best practices and use user agent sniffing to determine dynamically
     * how to render lines and words, sorry :-/ */
    const isGecko = runningInGecko();
    // eslint-disable-next-line require-jsdoc
    let LineWrapper = ({ children }) => <text style={textStyle}>{children}</text>;
    // eslint-disable-next-line react/jsx-props-no-spreading, require-jsdoc
    let WordElem = (props) => <tspan {...props} />;
    if (isGecko) {
      LineWrapper = React.Fragment;
      // eslint-disable-next-line react/jsx-props-no-spreading, require-jsdoc
      WordElem = (props) => <text style={textStyle} {...props} />;
    }
    return (
      <div
        ref={this.containerRef}
        style={containerStyle}
      >
        <svg style={svgStyle}>
          <g ref={this.svgContainerRef}>
            {renderLines.map((line) => (
              <rect
                key={`rect-${line.x}.${line.y}`}
                x={line.x}
                y={line.y}
                width={line.width}
                height={line.height}
                style={boxStyle}
              />
            ))}

            {renderLines.map((line) => (
              line.words
                ? (
                  <LineWrapper key={`line-${line.x}-${line.y}`}>
                    {line.words.filter((w) => w.width > 0 && w.height > 0).map(({
                      x, y, width, text,
                    }) => {
                      // Another ugly user agent sniffing hack:
                      // In Gecko, whitespace is not stretched, unlike in Chrome.
                      // Thus. we have to exclude the space's width from the rendered word's width.
                      let renderWidth = width;
                      if (isGecko && text.slice(-1) === ' ') {
                        renderWidth -= (renderWidth / text.length);
                      }
                      return (
                        <WordElem
                          key={`text-${x}-${y}`}
                          x={x}
                          y={line.y + line.height * 0.75}
                          textLength={renderWidth}
                          fontSize={`${line.height * 0.75}px`}
                          lengthAdjust="spacingAndGlyphs"
                        >
                          {text}
                        </WordElem>
                      );
                    })}
                  </LineWrapper>
                )
                : (
                  <text
                    key={`line-${line.x}-${line.y}`}
                    x={line.x}
                    y={line.y + line.height * 0.75}
                    textLength={line.width}
                    fontSize={`${line.height}px`}
                    lengthAdjust="spacingAndGlyphs"
                    style={textStyle}
                  >
                    {line.text}
                  </text>
                )))}
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
  textColor: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  useAutoColors: PropTypes.bool.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  lines: PropTypes.array.isRequired,
  source: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  pageColors: PropTypes.object,
};
PageTextDisplay.defaultProps = {
  pageColors: undefined,
};

export default PageTextDisplay;
