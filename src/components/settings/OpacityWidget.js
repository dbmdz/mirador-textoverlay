import React from 'react';
import PropTypes from 'prop-types';
import Slider from '@material-ui/core/Slider';
import makeStyles from '@material-ui/core/styles/makeStyles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { fade } from '@material-ui/core/styles/colorManipulator';
import { useTheme } from '@material-ui/core';

const useStyles = makeStyles(({ palette, breakpoints }) => {
  const bubbleBg = palette.shades.main;
  return {
    root: {
      backgroundColor: fade(bubbleBg, 0.8),
      borderRadius: [[0, 0, 25, 25]],
      height: 150,
      padding: [[16, 8, 8, 8]],
      position: 'absolute',
      top: 48,
      zIndex: 100,
      [breakpoints.down('sm')]: {
        top: 'auto',
        right: 48,
        height: 'auto',
        width: 150,
        borderRadius: [[25, 0, 0, 25]],
        // Truncate right box shadow
        clipPath: 'inset(-8px 0 -8px -8px)',
        paddingTop: 12,
        paddingBottom: 2,
      },
    },
  };
});

/** Widget to control the opacity of the displayed text */
const OpacityWidget = ({ opacity, onChange, t }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <div
      data-test-id="text-opacity-slider"
      id="text-opacity-slider"
      aria-labelledby="text-opacity-slider-label"
      className={`MuiPaper-elevation4 ${classes.root}`}
    >
      <Slider
        orientation={isSmallDisplay ? 'horizontal' : 'vertical'}
        min={1}
        max={100}
        value={opacity * 100}
        getAriaValueText={(value) => t('opacityCurrentValue', { value })}
        onChange={(evt, val) => onChange(val / 100.0)}
      />
    </div>
  );
};
OpacityWidget.propTypes = {
  opacity: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default OpacityWidget;
