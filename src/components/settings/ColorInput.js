/* eslint-disable jsx-a11y/label-has-associated-control */
import React from 'react';
import PropTypes from 'prop-types';
import { styled } from '@mui/material';

import { toHexRgb } from '../../lib/color';

const StyledLabel = styled('label')({
  width: 48,
  height: 48,
  padding: 8,
  boxSizing: 'border-box',
});
const StyledDiv = styled('div')(({ theme, color, autoColors }) => ({
  display: 'inline-block',
  width: 32,
  height: 32,
  borderRadius: 16,
  boxShadow: theme.shadows[2],
  backgroundColor: (() => {
    const validColors = (autoColors ?? []).filter((c) => c);
    if (validColors.length !== 2) {
      return validColors?.[0] ?? color;
    }
    return color;
  })(),
  backgroundImage: (() => {
    const validColors = (autoColors ?? []).filter((c) => c);
    if (validColors.length !== 2) {
      return 'none';
    }
    return `linear-gradient(90deg, ${validColors[0] ?? color} 50%, ${validColors[1] ?? color} 50%)`;
  })(),
}));

const StyledInput = styled('input')({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
});
/** Input to select a color */
const ColorInput = ({ color, onChange, title, autoColors }) => {
  // We rely on the browser behavior that clicking on an input's label is equivalent
  // to clicking the input to show a custom color picker button.
  // However, mobile Safari doesn't show the picker if we `display: none` the actual input,
  // so we use some CSS voodoo (Tailwind's `sr-only` utility) to visually hide it...
  return (
    <StyledLabel>
      <StyledDiv title={title} color={color} autoColors={autoColors} />
      <StyledInput
        type="color"
        value={toHexRgb(autoColors && autoColors[0] ? autoColors[0] : color)}
        onChange={(evt) => onChange(evt.target.value)}
        onInput={(evt) => onChange(evt.target.value)}
      />
    </StyledLabel>
  );
};
ColorInput.propTypes = {
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  autoColors: PropTypes.arrayOf(PropTypes.string),
};
ColorInput.defaultProps = {
  autoColors: undefined,
};

export default ColorInput;
