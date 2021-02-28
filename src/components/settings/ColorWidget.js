import React from 'react';
import PropTypes from 'prop-types';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import ResetColorsIcon from '@material-ui/icons/SettingsBackupRestore';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { fade } from '@material-ui/core/styles/colorManipulator';

import ColorInput from './ColorInput';
import { toHexRgb } from '../../lib/color';

const useStyles = makeStyles(({ palette, breakpoints }) => {
  const bubbleBg = palette.shades.main;
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      top: 48,
      zIndex: 100,
      borderRadius: [[0, 0, 25, 25]],
      backgroundColor: fade(bubbleBg, 0.8),
      [breakpoints.down('sm')]: {
        flexDirection: 'row',
        right: 48,
        top: 'auto',
        borderRadius: [[25, 0, 0, 25]],
        // Truncate right box shadow
        clipPath: 'inset(-8px 0 -8px -8px)',
      },
    },
    foreground: {
      height: 40,
      padding: [[8, 8, 0, 8]],
      margin: (props) => [[props.showResetButton ? -12 : 0, 0, 0, 0]],
      [breakpoints.down('sm')]: {
        height: 48,
        width: 40,
        padding: [[8, 0, 8, 8]],
        marginTop: 0,
        margin: (props) => [[0, 0, 0, props.showResetButton ? -12 : 0]],
      },
    },
    background: {
      marginTop: -6,
      zIndex: -5,
      height: 40,
      padding: [[0, 8, 8, 8]],
      [breakpoints.down('sm')]: {
        height: 48,
        width: 40,
        padding: [[8, 8, 8, 0]],
        marginTop: 0,
        marginLeft: -6,
      },
    },
  };
});

/** Widget to update text and background color */
const ColorWidget = ({
  textColor,
  bgColor,
  onChange,
  t,
  pageColors,
  useAutoColors,
  containerId,
}) => {
  const showResetButton =
    !useAutoColors && pageColors && pageColors.some((c) => c && (c.textColor || c.bgColor));
  const classes = useStyles({ showResetButton });

  return (
    <div className={`MuiPaper-elevation4 ${classes.root}`}>
      {showResetButton && (
        <MiradorMenuButton
          containerId={containerId}
          aria-label={t('resetTextColors')}
          onClick={() =>
            onChange({
              useAutoColors: true,
              textColor: pageColors.map((cs) => cs.textColor).filter((x) => x)[0] ?? textColor,
              bgColor: pageColors.map((cs) => cs.bgColor).filter((x) => x)[0] ?? bgColor,
            })
          }
        >
          <ResetColorsIcon />
        </MiradorMenuButton>
      )}
      <ColorInput
        title={t('textColor')}
        autoColors={useAutoColors ? pageColors.map((colors) => colors.textColor) : undefined}
        color={textColor}
        onChange={(color) => {
          // Lackluster way to check if selection was canceled: The chance of users picking
          // the exact same colors as the autodetected one is extremely slim, so if we get that,
          // the user probably aborted the color picking and we don't have to update the color
          // settings.
          if (useAutoColors && color === toHexRgb(pageColors?.[0]?.bgColor)) {
            return;
          }
          onChange({ textColor: color, bgColor, useAutoColors: false });
        }}
        className={classes.foreground}
      />
      <ColorInput
        title={t('backgroundColor')}
        color={bgColor}
        autoColors={useAutoColors ? pageColors.map((colors) => colors.bgColor) : undefined}
        onChange={(color) => {
          // See comment on previous ColorInput onChange callback
          if (useAutoColors && color === toHexRgb(pageColors?.[0]?.bgColor)) {
            return;
          }
          onChange({ bgColor: color, textColor, useAutoColors: false });
        }}
        className={classes.background}
      />
    </div>
  );
};
ColorWidget.propTypes = {
  containerId: PropTypes.string.isRequired,
  textColor: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  useAutoColors: PropTypes.bool.isRequired,
  pageColors: PropTypes.arrayOf(
    PropTypes.shape({
      textColor: PropTypes.string,
      bgColor: PropTypes.string,
    })
  ).isRequired,
};

export default ColorWidget;
