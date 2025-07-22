import React from 'react';
import PropTypes from 'prop-types';
import Slider from '@mui/material/Slider';
import { alpha, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material';

const RootDiv = styled('div')(({ theme }) => {
  const bubbleBg = theme.palette.shades.main;
  return {
    backgroundColor: alpha(bubbleBg, 0.8),
    borderRadius: '0px 0px 25px 25px',
    height: 150,
    padding: '16px 8px 8px 8px',
    position: 'absolute',
    top: 48,
    zIndex: 100,
    boxShadow: theme.shadows[4],
    [theme.breakpoints.down('sm')]: {
      top: 'auto',
      right: 48,
      height: 'auto',
      width: 150,
      borderRadius: "25px 0px 0px 25px",
      // Truncate right box shadow
      clipPath: 'inset(-8px 0 -8px -8px)',
      paddingTop: 12,
      paddingBottom: 2,
    },
  };
});

/** Widget to control the opacity of the displayed text */
const OpacityWidget = ({ opacity, onChange, t }) => {
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <RootDiv
      data-test-id="text-opacity-slider"
      id="text-opacity-slider"
      aria-labelledby="text-opacity-slider-label"
    >
      <Slider
        orientation={isSmallDisplay ? 'horizontal' : 'vertical'}
        min={1}
        max={100}
        value={opacity * 100}
        getAriaValueText={(value) => t('opacityCurrentValue', { value })}
        onChange={(evt, val) => onChange(val / 100.0)}
      />
    </RootDiv>
  );
};
OpacityWidget.propTypes = {
  opacity: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default OpacityWidget;
