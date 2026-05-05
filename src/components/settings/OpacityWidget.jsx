import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PropTypes from 'prop-types';

export default function OpacityWidget({ onChange, opacity, t }) {
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));
  const bubbleBg = theme.palette?.shades?.main ?? theme.palette.background.paper;

  return (
    <Paper
      elevation={4}
      data-test-id="text-opacity-slider"
      id="text-opacity-slider"
      aria-labelledby="text-opacity-slider-label"
      sx={{
        backgroundColor: alpha(bubbleBg, 0.8),
        borderRadius: isSmallDisplay ? '25px 0 0 25px' : '0 0 25px 25px',
        clipPath: isSmallDisplay ? 'inset(-8px 0 -8px -8px)' : 'none',
        height: isSmallDisplay ? 'auto' : 150,
        p: isSmallDisplay ? '12px 8px 2px' : '16px 8px 8px',
        position: 'absolute',
        right: isSmallDisplay ? 48 : 'auto',
        top: isSmallDisplay ? 'auto' : 48,
        width: isSmallDisplay ? 150 : 'auto',
        zIndex: 100,
      }}
    >
      <Box sx={{ px: isSmallDisplay ? 1 : 0, height: '100%' }}>
        <Slider
          getAriaValueText={(value) => t('opacityCurrentValue', { value })}
          max={100}
          min={1}
          orientation={isSmallDisplay ? 'horizontal' : 'vertical'}
          value={opacity * 100}
          onChange={(_event, value) => onChange(Number(value) / 100)}
        />
      </Box>
    </Paper>
  );
}

OpacityWidget.propTypes = {
  onChange: PropTypes.func.isRequired,
  opacity: PropTypes.number.isRequired,
  t: PropTypes.func.isRequired,
};
