import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import PropTypes from 'prop-types';

import { toHexRgb } from '../../lib/color';

const visuallyHiddenStyles = {
  borderWidth: 0,
  clip: 'rect(0, 0, 0, 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
};

export default function ColorInput({ autoColors, className, color, onChange, title }) {
  const validColors = (autoColors ?? []).filter((value) => value);
  const resolvedColor = validColors.length !== 2 ? (validColors[0] ?? color) : color;
  const backgroundImage =
    validColors.length !== 2
      ? 'none'
      : `linear-gradient(90deg, ${validColors[0] ?? color} 50%, ${validColors[1] ?? color} 50%)`;

  return (
    <Box
      component="label"
      className={className}
      sx={{ boxSizing: 'border-box', height: 48, p: 1, width: 48 }}
    >
      <Paper
        elevation={2}
        title={title}
        sx={{
          backgroundColor: resolvedColor,
          backgroundImage,
          borderRadius: 4,
          display: 'inline-block',
          height: 32,
          width: 32,
        }}
      />
      <input
        type="color"
        value={toHexRgb(autoColors?.[0] ? autoColors[0] : color)}
        style={visuallyHiddenStyles}
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.target.value)}
      />
    </Box>
  );
}

ColorInput.propTypes = {
  autoColors: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};

ColorInput.defaultProps = {
  autoColors: undefined,
  className: '',
};
