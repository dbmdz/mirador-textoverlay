import React from 'react';
import PropTypes from 'prop-types';
import Slider from '@material-ui/core/Slider';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { fade } from '@material-ui/core/styles/colorManipulator';

const useStyles = makeStyles(({ palette }) => {
  const bubbleBg = palette.shades.main;
  return {
    root: {
      backgroundColor: fade(bubbleBg, 0.8),
      borderRadius: '0px 0px 25px 25px',
      height: '150px',
      padding: '16px 8px 8px 8px',
      position: 'absolute',
      top: 48,
      zIndex: 100,
    },
  };
});

/** Widget to control the opacity of the displayed text */
const OpacityWidget = ({ opacity, onChange, t }) => {
  const classes = useStyles();
  return (
    <div
      data-test-id="text-opacity-slider"
      id="text-opacity-slider"
      aria-labelledby="text-opacity-slider-label"
      className={`MuiPaper-elevation4 ${classes.root}`}
    >
      <Slider
        orientation="vertical"
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
