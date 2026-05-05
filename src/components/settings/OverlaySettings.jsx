import CloseIcon from '@mui/icons-material/Close';
import OpacityIcon from '@mui/icons-material/Opacity';
import PaletteIcon from '@mui/icons-material/Palette';
import SubjectIcon from '@mui/icons-material/Subject';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { MiradorMenuButton } from 'mirador';
import PropTypes from 'prop-types';
import { useState } from 'react';

import TextSelectIcon from '../TextSelectIcon';
import ButtonContainer from './ButtonContainer';
import ColorWidget from './ColorWidget';
import OpacityWidget from './OpacityWidget';

export default function OverlaySettings({
  containerId,
  imageToolsEnabled,
  pageColors,
  t,
  textsAvailable,
  textsFetching,
  updateWindowTextOverlayOptions,
  windowTextOverlayOptions,
}) {
  const {
    bgColor: defaultBgColor,
    enabled,
    opacity,
    selectable,
    textColor: defaultTextColor,
    useAutoColors,
    visible,
  } = windowTextOverlayOptions;
  const [open, setOpen] = useState(enabled && (visible || selectable));
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));
  const bubbleBg = theme.palette?.shades?.main ?? theme.palette.background.paper;
  const bubbleFg = theme.palette.getContrastText(bubbleBg);
  const toggledBubbleBg = alpha(bubbleFg, 0.25);

  const textColor = useAutoColors
    ? (pageColors.map((colors) => colors.textColor).filter(Boolean)[0] ?? defaultTextColor)
    : defaultTextColor;
  const bgColor = useAutoColors
    ? (pageColors.map((colors) => colors.bgColor).filter(Boolean)[0] ?? defaultBgColor)
    : defaultBgColor;
  const showAllButtons = open && !textsFetching;

  if (!enabled || !textsAvailable) {
    return null;
  }

  const toggleButton = (
    <ButtonContainer withBorder={!textsFetching && open && isSmallDisplay}>
      <MiradorMenuButton
        aria-expanded={showAllButtons}
        aria-haspopup
        aria-label={open ? t('collapseTextOverlayOptions') : t('expandTextOverlayOptions')}
        containerId={containerId}
        disabled={textsFetching}
        onClick={() => setOpen(!open)}
      >
        {showAllButtons ? <CloseIcon /> : <SubjectIcon />}
      </MiradorMenuButton>
    </ButtonContainer>
  );

  return (
    <Paper
      elevation={4}
      sx={{
        alignItems: 'stretch',
        backgroundColor: alpha(bubbleBg, 0.8),
        borderRadius: isSmallDisplay
          ? `25px 25px 25px ${!textsFetching && open && showColorPicker ? 0 : 25}px`
          : '25px',
        display: 'flex',
        flexDirection: isSmallDisplay ? 'column' : 'row',
        position: 'absolute',
        right: isSmallDisplay ? (imageToolsEnabled ? 66 : 8) : 8,
        top: isSmallDisplay ? 8 : imageToolsEnabled ? 66 : 8,
        zIndex: 999,
      }}
    >
      {isSmallDisplay && toggleButton}
      {showAllButtons && (
        <>
          <ButtonContainer paddingNext={8} paddingPrev={isSmallDisplay ? 8 : 0} withBorder>
            <MiradorMenuButton
              aria-label={t('textSelect')}
              aria-pressed={selectable}
              containerId={containerId}
              sx={{ backgroundColor: selectable ? toggledBubbleBg : 'transparent' }}
              onClick={() =>
                updateWindowTextOverlayOptions({
                  ...windowTextOverlayOptions,
                  selectable: !selectable,
                })
              }
            >
              <TextSelectIcon />
            </MiradorMenuButton>
          </ButtonContainer>
          <ButtonContainer paddingPrev={8}>
            <MiradorMenuButton
              aria-label={t('textVisible')}
              aria-pressed={visible}
              containerId={containerId}
              sx={{ backgroundColor: visible ? toggledBubbleBg : 'transparent' }}
              onClick={() => {
                updateWindowTextOverlayOptions({
                  ...windowTextOverlayOptions,
                  visible: !visible,
                });
                if (showOpacitySlider && visible) setShowOpacitySlider(false);
                if (showColorPicker && visible) setShowColorPicker(false);
              }}
            >
              <TextFieldsIcon />
            </MiradorMenuButton>
          </ButtonContainer>
          <ButtonContainer>
            <MiradorMenuButton
              id="text-opacity-slider-label"
              aria-controls="text-opacity-slider"
              aria-expanded={showOpacitySlider}
              aria-label={t('textOpacity')}
              containerId={containerId}
              disabled={!visible}
              sx={{ backgroundColor: showOpacitySlider ? alpha(bubbleFg, 0.1) : 'transparent' }}
              onClick={() => setShowOpacitySlider(!showOpacitySlider)}
            >
              <OpacityIcon />
            </MiradorMenuButton>
            {visible && showOpacitySlider && (
              <OpacityWidget
                opacity={opacity}
                t={t}
                onChange={(newOpacity) =>
                  updateWindowTextOverlayOptions({
                    ...windowTextOverlayOptions,
                    opacity: newOpacity,
                  })
                }
              />
            )}
          </ButtonContainer>
          <ButtonContainer paddingNext={isSmallDisplay ? 0 : 8} withBorder={!isSmallDisplay}>
            <MiradorMenuButton
              id="color-picker-label"
              aria-controls="color-picker"
              aria-expanded={showColorPicker}
              aria-label={t('colorPicker')}
              containerId={containerId}
              disabled={!visible}
              sx={{ backgroundColor: showColorPicker ? alpha(bubbleFg, 0.1) : 'transparent' }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              <PaletteIcon />
            </MiradorMenuButton>
            {visible && showColorPicker && (
              <ColorWidget
                bgColor={bgColor}
                containerId={containerId}
                pageColors={pageColors}
                t={t}
                textColor={textColor}
                useAutoColors={useAutoColors}
                onChange={(newOptions) =>
                  updateWindowTextOverlayOptions({
                    ...windowTextOverlayOptions,
                    ...newOptions,
                  })
                }
              />
            )}
          </ButtonContainer>
        </>
      )}
      {textsFetching && (
        <Box sx={{ inset: 0, pointerEvents: 'none', position: 'absolute' }}>
          <CircularProgress
            disableShrink
            size={50}
            sx={{ left: '50%', position: 'absolute', top: '50%', translate: '-50% -50%' }}
          />
        </Box>
      )}
      {!isSmallDisplay && toggleButton}
    </Paper>
  );
}

OverlaySettings.propTypes = {
  containerId: PropTypes.string.isRequired,
  imageToolsEnabled: PropTypes.bool.isRequired,
  pageColors: PropTypes.arrayOf(
    PropTypes.shape({
      bgColor: PropTypes.string,
      textColor: PropTypes.string,
    }),
  ).isRequired,
  t: PropTypes.func.isRequired,
  textsAvailable: PropTypes.bool.isRequired,
  textsFetching: PropTypes.bool.isRequired,
  updateWindowTextOverlayOptions: PropTypes.func.isRequired,
  windowTextOverlayOptions: PropTypes.object.isRequired,
};
