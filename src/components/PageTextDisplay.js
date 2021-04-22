import React from 'react';
import PropTypes from 'prop-types';
import { fade } from '@material-ui/core/styles/colorManipulator';
import withStyles from '@material-ui/core/styles/withStyles';

/** Styles for the overlay SVG */
const styles = (theme) => ({
  textOverlay: {
    'font-family': theme?.textOverlay?.overlayFont ?? 'sans-serif',
    '& ::selection': {
      fill: theme?.textOverlay?.selectionTextColor ?? 'rgba(255, 255, 255, 1)', // For Chrome
      color: theme?.textOverlay?.selectionTextColor ?? 'rgba(255, 255, 255, 1)', // For Firefox
      'background-color': theme?.textOverlay?.selectionBackgroundColor ?? 'rgba(0, 55, 255, 1)',
    },
  },
});

/** Check if we're running in Gecko */
function runningInGecko() {
  return navigator.userAgent.indexOf('Gecko/') >= 0;
}

/** Page Text Display component that is optimized for fast panning/zooming
 *
 * NOTE: This component is doing stuff that is NOT RECOMMENDED GENERALLY, like
 *       hacking shouldComponentUpdate to not-rerender on every prop change,
 *       setting styles manually via DOM refs, etc. This was all done to reach
 *       higher frame rates.
 */
class PageTextDisplay extends React.Component {
  /** Set up refs for direct transforms and pointer callback registration */
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.textContainerRef = React.createRef();
    this.boxContainerRef = React.createRef();
  }

  /** Register pointerdown handler on SVG container */
  componentDidMount() {
    // FIXME: We should be able to use React for this, but it somehow doesn't work
    this.textContainerRef.current.addEventListener('pointerdown', this.onPointerDown);
    // For mobile Safari <= 12.2
    this.textContainerRef.current.addEventListener('touchstart', this.onPointerDown);
  }

  /** Only update the component when the source changed (i.e. we need to re-render the text).
   *
   * Yes, this is a horrible, horrible, hack, that will bite us in the behind at
   * some point, and is going to trip someone up terribly while debugging in the future,
   * but this *seriously* helps with performance.
   */
  shouldComponentUpdate(nextProps) {
    const { source } = this.props;
    return nextProps.source !== source;
  }

  /** Swallow pointer events if selection is enabled */
  onPointerDown = (evt) => {
    const { selectable } = this.props;
    if (!selectable) {
      return;
    }
    evt.stopPropagation();
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
    const translateX = ((scaleFactor - 1) * width) / 2 + x * scaleFactor * -1;
    const translateY = ((scaleFactor - 1) * height) / 2 + y * scaleFactor * -1;
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
    if (!this.textContainerRef.current || !this.boxContainerRef.current) {
      return;
    }
    // We need to apply the colors to the individual rects and texts instead of
    // one of the containers, since otherwise the user's selection highlight would
    // become transparent as well or disappear entirely.
    for (const rect of this.boxContainerRef.current.querySelectorAll('rect')) {
      rect.style.fill = fade(bgColor, opacity);
    }
    for (const text of this.textContainerRef.current.querySelectorAll('text')) {
      text.style.fill = fade(textColor, opacity);
    }
  }

  /** Update the selectability of the text nodes.
   *
   * Again, intended to be called from the parent, again for performance reasons.
   */
  updateSelectability(selectable) {
    if (!this.textContainerRef.current) {
      return;
    }
    this.textContainerRef.current.parentElement.style.userSelect = selectable ? 'text' : 'none';
  }

  /** Render the page overlay */
  render() {
    const {
      selectable,
      visible,
      lines,
      width: pageWidth,
      height: pageHeight,
      opacity,
      textColor,
      bgColor,
      useAutoColors,
      pageColors,
      classes,
    } = this.props;

    const containerStyle = {
      // This attribute seems to be the key to enable GPU-accelerated scaling and translation
      // (without using translate3d) and achieve 60fps on a regular laptop even with huge objects.
      willChange: 'transform',
      position: 'absolute',
      display: 'none', // will be cleared by first update
    };
    const svgStyle = {
      left: 0,
      top: 0,
      width: pageWidth,
      height: pageHeight,
      userSelect: selectable ? 'text' : 'none',
      whiteSpace: 'pre',
    };
    let fg = textColor;
    let bg = bgColor;
    if (useAutoColors && pageColors) {
      fg = pageColors.textColor;
      bg = pageColors.bgColor;
    }

    const renderOpacity = !visible && selectable ? 0 : opacity;
    const boxStyle = { fill: fade(bg, renderOpacity) };
    const textStyle = {
      fill: fade(fg, renderOpacity),
    };
    const renderLines = lines.filter((l) => l.width > 0 && l.height > 0);

    /* Firefox/Gecko does not currently support the lengthAdjust parameter on
     * <tspan> Elements, only on <text> (https://bugzilla.mozilla.org/show_bug.cgi?id=890692).
     *
     * Using <text> elements for spans (and skipping the line-grouping) works fine
     * in Firefox, but breaks selection behavior in Chrome (the selected text contains
     * a newline after every word).
     *
     * So we have to go against best practices and use user agent sniffing to determine dynamically
     * how to render lines and spans, sorry :-/ */
    const isGecko = runningInGecko();
    // eslint-disable-next-line require-jsdoc
    let LineWrapper = ({ children }) => <text style={textStyle}>{children}</text>;
    // eslint-disable-next-line react/jsx-props-no-spreading, require-jsdoc
    let SpanElem = (props) => <tspan {...props} />;
    if (isGecko) {
      // NOTE: Gecko really works best with a flattened bunch of text nodes. Wrapping the
      //       lines in a <g>, e.g. breaks text selection in similar ways to the below
      //       WebKit-specific note, for some reason ¯\_(ツ)_/¯
      LineWrapper = React.Fragment;
      // eslint-disable-next-line react/jsx-props-no-spreading, require-jsdoc
      SpanElem = (props) => <text style={textStyle} {...props} />;
    }
    return (
      <div ref={this.containerRef} style={containerStyle}>
        {/**
         * NOTE: We have to render the line background rectangles in a separate SVG and can't
         * include them in the same one as the text. Why? Because doing so breaks text selection in
         * WebKit-based browsers :/
         * It seems that if we render the rectangles first (since we don't want rectangles occluding
         * text), very often when a user's selection leaves the current line rectangle and crosses
         * over to the next, the selection will *end* where the user wanted it to start and instead
         * start from the very top of the page.
         * A simpler solution would've been to just render the line rectangles *after* the text to
         * avoid this issue, but unfortunately SVG determines draw order from the element order,
         * i.e. the rectangles would have completely occluded the text.
         * So we have to resort to this, it's a hack, but it works.
         */}
        <svg style={{ ...svgStyle, userSelect: 'none' }}>
          <g ref={this.boxContainerRef}>
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
          </g>
        </svg>
        <svg style={{ ...svgStyle, position: 'absolute' }} className={classes.textOverlay}>
          <g ref={this.textContainerRef}>
            {renderLines.map((line) =>
              line.spans ? (
                <LineWrapper key={`line-${line.x}-${line.y}`}>
                  {line.spans
                    .filter((w) => w.width > 0 && w.height > 0)
                    .map(({ x, y, width, text }) => (
                      <SpanElem
                        key={`text-${x}-${y}`}
                        x={x}
                        y={line.y + line.height * 0.75}
                        textLength={width}
                        fontSize={`${line.height * 0.75}px`}
                        lengthAdjust="spacingAndGlyphs"
                      >
                        {text}
                      </SpanElem>
                    ))}
                </LineWrapper>
              ) : (
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
              )
            )}
          </g>
        </svg>
      </div>
    );
  }
}

PageTextDisplay.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string),
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
  classes: {},
  pageColors: undefined,
};

export default withStyles(styles)(PageTextDisplay);
