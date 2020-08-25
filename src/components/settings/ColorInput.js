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
      return `linear-gradient(90deg, ${validColors[0] ?? color} 50%, ${validColors[1] ?? color} 50%)`;
    },
  },
});

/** Input to select a color */
const ColorInput = ({
  color, onChange, title, autoColors, className,
}) => {
  const classes = useStyles({ color, autoColors });
  return (
    <label className={`${classes.container} ${className}`}>
      <div
        title={title}
        className={`MuiPaper-elevation2 ${classes.input}`}
      />
      <input
        type="color"
        value={toHexRgb((autoColors && autoColors[0]) ? autoColors[0] : color)}
        style={{ display: 'none' }}
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
