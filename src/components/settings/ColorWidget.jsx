import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { MiradorMenuButton } from 'mirador';
import PropTypes from 'prop-types';

import { toHexRgb } from '../../lib/color';
import ColorInput from './ColorInput';

export default function ColorWidget({
  bgColor,
  onChange,
  pageColors,
  t,
  textColor,
  useAutoColors,
}) {
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));
  const bubbleBg = theme.palette?.shades?.main ?? theme.palette.background.paper;
  const showResetButton =
    !useAutoColors && pageColors?.some((colors) => colors && (colors.textColor || colors.bgColor));

  return (
    <Paper
      elevation={4}
      sx={{
        backgroundColor: alpha(bubbleBg, 0.8),
        borderRadius: isSmallDisplay ? '25px 0 0 25px' : '0 0 25px 25px',
        clipPath: isSmallDisplay ? 'inset(-8px 0 -8px -8px)' : 'none',
        display: 'flex',
        flexDirection: isSmallDisplay ? 'row' : 'column',
        position: 'absolute',
        right: isSmallDisplay ? 48 : 'auto',
        top: isSmallDisplay ? 'auto' : 48,
        zIndex: 100,
      }}
    >
      {showResetButton && (
        <MiradorMenuButton
          aria-label={t('resetTextColors')}
          onClick={() =>
            onChange({
              useAutoColors: true,
              textColor:
                pageColors.map((colors) => colors.textColor).filter(Boolean)[0] ?? textColor,
              bgColor: pageColors.map((colors) => colors.bgColor).filter(Boolean)[0] ?? bgColor,
            })
          }
        >
          <SettingsBackupRestoreIcon />
        </MiradorMenuButton>
      )}
      <Box
        sx={{
          mt: isSmallDisplay ? 0 : showResetButton ? -1.5 : 0,
          ml: isSmallDisplay && showResetButton ? -1.5 : 0,
        }}
      >
        <ColorInput
          autoColors={useAutoColors ? pageColors.map((colors) => colors.textColor) : undefined}
          className=""
          color={textColor}
          title={t('textColor')}
          onChange={(color) => {
            if (useAutoColors && color === toHexRgb(pageColors?.[0]?.textColor)) {
              return;
            }

            onChange({ textColor: color, bgColor, useAutoColors: false });
          }}
        />
      </Box>
      <Box sx={{ mt: isSmallDisplay ? 0 : -0.75, ml: isSmallDisplay ? -0.75 : 0 }}>
        <ColorInput
          autoColors={useAutoColors ? pageColors.map((colors) => colors.bgColor) : undefined}
          className=""
          color={bgColor}
          title={t('backgroundColor')}
          onChange={(color) => {
            if (useAutoColors && color === toHexRgb(pageColors?.[0]?.bgColor)) {
              return;
            }

            onChange({ bgColor: color, textColor, useAutoColors: false });
          }}
        />
      </Box>
    </Paper>
  );
}

ColorWidget.propTypes = {
  bgColor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  pageColors: PropTypes.arrayOf(
    PropTypes.shape({
      bgColor: PropTypes.string,
      textColor: PropTypes.string,
    }),
  ).isRequired,
  t: PropTypes.func.isRequired,
  textColor: PropTypes.string.isRequired,
  useAutoColors: PropTypes.bool.isRequired,
};
