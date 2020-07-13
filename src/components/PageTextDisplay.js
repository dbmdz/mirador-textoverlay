// This is OK since we're only ever doing shallow compares
/* eslint-disable react/no-array-index-key */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

/** Render page text with word- or line-level coordinates into an SVG */
class PageTextDisplay extends PureComponent {
  /** */
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
  }

  /** Bind pointer handler to container */
  componentDidMount() {
    this.containerRef.current.onpointerdown = this.onPointerDown.bind(this);
  }

  /** Swallow pointer events if selection is enabled */
  onPointerDown(evt) {
    const { selectable } = this.props;
    if (selectable) {
      evt.stopPropagation();
    }
  }

  /** Render the SVG */
  render() {
    const {
      lines, opacity, source, selectable, displayText, translateX, translateY, scaleFactor, xOffset,
    } = this.props;
    const lineStyle = { fill: `rgba(0, 0, 0, ${displayText ? opacity : 0})` };
    const lineRectStyle = { fill: `rgba(255, 255, 255, ${displayText ? opacity : 0})` };
    return (
      <g
        data-source={source}
        transform={`scale(${scaleFactor}, ${scaleFactor}) translate(${translateX}, ${translateY})`}
        style={{ cursor: selectable ? 'text' : 'default' }}
        // FIXME: Somehow React does not set the event handler, maybe a bug witht SVG in React?
        //        Workaround is to use a ref and do it manually, but this should be fixed
        // onPointerDown={this.onPointerDown.bind(this)}
        ref={this.containerRef}
      >
        {lines.filter((l) => l.width > 0 && l.height > 0).map((line, lineIdx) => (
          <React.Fragment key={`${line.x}.${line.y}`}>
            <rect
              x={line.x + xOffset}
              y={line.y}
              width={line.width}
              height={line.height}
              style={lineRectStyle}
            />
            {line.words
              ? (
                <text style={lineStyle} key={lineIdx}>
                  {line.words.filter((w) => w.width > 0 && w.height > 0).map(({
                    x, y, width, height, text,
                  }, wordIdx) => (
                    <tspan
                      key={`${lineIdx}-${wordIdx}`}
                      x={x + xOffset}
                      y={y + height * 0.75}
                      textLength={width}
                      fontSize={`${height}px`}
                      lengthAdjust="spacingAndGlyphs"
                    >
                      {text}
                    </tspan>
                  ))}
                </text>
              )
              : (
                <text
                  x={line.x + xOffset}
                  y={line.y + line.height * 0.75}
                  textLength={line.width}
                  fontSize={`${line.height}px`}
                  lengthAdjust="spacingAndGlyphs"
                  style={lineStyle}
                >
                  {line.text}
                </text>
              )}
          </React.Fragment>
        ))}
      </g>
    );
  }
}


PageTextDisplay.propTypes = {
  displayText: PropTypes.bool,
  lines: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  opacity: PropTypes.number,
  scaleFactor: PropTypes.number.isRequired,
  selectable: PropTypes.bool,
  source: PropTypes.string.isRequired,
  translateX: PropTypes.number.isRequired,
  translateY: PropTypes.number.isRequired,
  xOffset: PropTypes.number.isRequired,
};

PageTextDisplay.defaultProps = {
  displayText: false,
  opacity: 0.75,
  selectable: true,
};

export default PageTextDisplay;
