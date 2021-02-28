/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@material-ui/core/styles/makeStyles';

import { toHexRgb } from '../../lib/color';

const useStyles = makeStyles({
  container: {
    width: 48,
    height: 48,
    padding: 8,
    boxSizing: 'border-box',
  },
  input: {
    display: 'inline-block',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ({ color, autoColors }) => {
      const validColors = (autoColors ?? []).filter((c) => c);
      if (validColors.length !== 2) {
        return validColors?.[0] ?? color;
      }
      return color;
    },
    backgroundImage: ({ color, autoColors }) => {
      const validColors = (autoColors ?? []).filter((c) => c);
      if (validColors.length !== 2) {
        return 'none';
      }
      return `linear-gradient(90deg, ${validColors[0] ?? color} 50%, ${
        validColors[1] ?? color
      } 50%)`;
    },
  },
});

/** Input to select a color */
const ColorInput = ({ color, onChange, title, autoColors, className }) => {
  const classes = useStyles({ color, autoColors });
  // We rely on the browser behavior that clicking on an input's label is equivalent
  // to clicking the input to show a custom color picker button.
  // However, mobile Safari doesn't show the picker if we `display: none` the actual input,
  // so we use some CSS voodoo (Tailwind's `sr-only` utility) to visually hide it...
  return (
    <label className={`${classes.container} ${className}`}>
      <div title={title} className={`MuiPaper-elevation2 ${classes.input}`} />
      <input
        type="color"
        value={toHexRgb(autoColors && autoColors[0] ? autoColors[0] : color)}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
        onChange={(evt) => onChange(evt.target.value)}
        onInput={(evt) => onChange(evt.target.value)}
      />
    </label>
  );
};
ColorInput.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  autoColors: PropTypes.arrayOf(PropTypes.string),
};
ColorInput.defaultProps = {
  autoColors: undefined,
  className: '',
};

export default ColorInput;
