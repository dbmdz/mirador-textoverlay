import React from 'react';
import PropTypes from 'prop-types';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import ResetColorsIcon from '@mui/icons-material/SettingsBackupRestore';
import { alpha, styled } from '@mui/material/styles';

import ColorInput from './ColorInput';
import { toHexRgb } from '../../lib/color';

const RootDiv = styled('div')(({ theme }) => {
  const { palette, breakpoints, shadows } = theme;
  const bubbleBg = palette.shades.main;

  return {
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    top: 48,
    zIndex: 100,
    boxShadow: shadows[4],
    borderRadius: '0px 0px 25px 25px',
    backgroundColor: alpha(bubbleBg, 0.8),
    [breakpoints.down('sm')]: {
      flexDirection: 'row',
      right: 48,
      top: 'auto',
      borderRadius: '25px 0px 0px 25px',
      // Truncate right box shadow
      clipPath: 'inset(-8px 0px -8px -8px)',
    },
  };
});

const BackgroundColorInput = styled(ColorInput)(({ theme }) => {
  const { breakpoints } = theme;

  return {
    marginTop: -6,
    zIndex: -5,
    height: 40,
    padding: '0px 8px 8px 8px',
    [breakpoints.down('sm')]: {
      height: 48,
      width: 40,
      padding: '8px 8px 8px 0px',
      marginTop: 0,
      marginLeft: -6,
    },
  };
});

const ForegroundColorInput = styled(ColorInput)(({ theme, showResetButton }) => ({
  height: 40,
  padding: '8px 8px 0px 8px',
  margin: showResetButton ? '-12px 0px 0px 0px' : '0px 0px 0px 0px',
  [theme.breakpoints.down('sm')]: {
    height: 48,
    width: 40,
    padding: '8px 0px 8px 8px',
    marginTop: 0,
    margin: `0px 0px 0px ${showResetButton ? '-12px' : '0px'}`,
  },
}));

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

  return (
    <RootDiv>
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
      <ForegroundColorInput
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
      />
      <BackgroundColorInput
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
      />
    </RootDiv>
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
    }),
  ).isRequired,
};

export default ColorWidget;
