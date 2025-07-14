/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import TextIcon from '@mui/icons-material/TextFields';
import CloseIcon from '@mui/icons-material/Close';
import SubjectIcon from '@mui/icons-material/Subject';
import OpacityIcon from '@mui/icons-material/Opacity';
import PaletteIcon from '@mui/icons-material/Palette';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import TextSelectIcon from '../TextSelectIcon';
import ButtonContainer from './ButtonContainer';
import OpacityWidget from './OpacityWidget';
import ColorWidget from './ColorWidget';

const BubbleContainer = styled('div', {
  shouldForwardProp: (prop) =>
    prop !== 'imageToolsEnabled' && prop !== 'open' && prop !== 'showColorPicker',
})(({ theme, imageToolsEnabled, showColorPicker }) => {
  const bubbleBg = theme.palette.shades.main;

  return {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: alpha(bubbleBg, 0.8),
    borderRadius: showColorPicker ? '25px 25px 25px 0px' : '25px',
    position: 'absolute',
    right: 8,
    top: imageToolsEnabled ? 66 : 8,
    boxShadow: theme.shadows[4],
    zIndex: 999,
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      top: 8,
      right: imageToolsEnabled ? 66 : 8,
      borderRadius: showColorPicker ? '25px 25px 25px 0px' : '25px',
    },
  };
});

/** Control text overlay settings  */
const OverlaySettings = ({
  windowTextOverlayOptions,
  imageToolsEnabled,
  textsAvailable,
  textsFetching,
  updateWindowTextOverlayOptions,
  t,
  pageColors,
  containerId,
}) => {
  const {
    enabled,
    visible,
    selectable,
    opacity,
    textColor: defaultTextColor,
    bgColor: defaultBgColor,
    useAutoColors,
  } = windowTextOverlayOptions;
  const [open, setOpen] = useState(enabled && (visible || selectable));
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const theme = useTheme();
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('md'));

  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  const bubbleFg = palette.getContrastText(bubbleBg);
  const toggledBubbleBg = alpha(bubbleFg, 0.25);

  const textColor = useAutoColors
    ? (pageColors.map((cs) => cs.textColor).filter((x) => x)[0] ?? defaultTextColor)
    : defaultTextColor;
  const bgColor = useAutoColors
    ? (pageColors.map((cs) => cs.bgColor).filter((x) => x)[0] ?? defaultBgColor)
    : defaultBgColor;

  const showAllButtons = open && !textsFetching;

  if (!enabled || !textsAvailable) {
    return null;
  }

  /** Button for toggling the menu  */
  const toggleButton = (
    <ButtonContainer withBorder={!textsFetching && open && isSmallDisplay}>
      <MiradorMenuButton
        containerId={containerId}
        aria-expanded={showAllButtons}
        aria-haspopup
        aria-label={open ? t('collapseTextOverlayOptions') : t('expandTextOverlayOptions')}
        disabled={textsFetching}
        onClick={() => setOpen(!open)}
      >
        {showAllButtons ? <CloseIcon /> : <SubjectIcon />}
      </MiradorMenuButton>
    </ButtonContainer>
  );
  return (
    <BubbleContainer
      imageToolsEnabled={imageToolsEnabled}
      open={open}
      showColorPicker={showColorPicker}
    >
      {isSmallDisplay && toggleButton}
      {showAllButtons && (
        <>
          <ButtonContainer withBorder paddingPrev={isSmallDisplay ? 8 : 0} paddingNext={8}>
            <MiradorMenuButton
              containerId={containerId}
              aria-label={t('textSelect')}
              onClick={() =>
                updateWindowTextOverlayOptions({
                  ...windowTextOverlayOptions,
                  selectable: !selectable,
                })
              }
              aria-pressed={selectable}
              sx={{ backgroundColor: selectable && toggledBubbleBg }}
            >
              <TextSelectIcon />
            </MiradorMenuButton>
          </ButtonContainer>
          <ButtonContainer paddingPrev={8}>
            <MiradorMenuButton
              containerId={containerId}
              aria-label={t('textVisible')}
              onClick={() => {
                updateWindowTextOverlayOptions({
                  ...windowTextOverlayOptions,
                  visible: !visible,
                });
                if (showOpacitySlider && visible) {
                  setShowOpacitySlider(false);
                }
                if (showColorPicker && visible) {
                  setShowColorPicker(false);
                }
              }}
              aria-pressed={visible}
              sx={{ backgroundColor: visible && toggledBubbleBg }}
            >
              <TextIcon />
            </MiradorMenuButton>
          </ButtonContainer>
          <ButtonContainer>
            <MiradorMenuButton
              id="text-opacity-slider-label"
              containerId={containerId}
              disabled={!visible}
              aria-label={t('textOpacity')}
              aria-controls="text-opacity-slider"
              aria-expanded={showOpacitySlider}
              onClick={() => setShowOpacitySlider(!showOpacitySlider)}
              sx={{
                backgroundColor: showOpacitySlider && alpha(bubbleFg, 0.1),
              }}
            >
              <OpacityIcon />
            </MiradorMenuButton>
            {visible && showOpacitySlider && (
              <OpacityWidget
                t={t}
                opacity={opacity}
                onChange={(newOpacity) =>
                  updateWindowTextOverlayOptions({
                    ...windowTextOverlayOptions,
                    opacity: newOpacity,
                  })
                }
              />
            )}
          </ButtonContainer>
          <ButtonContainer withBorder={!isSmallDisplay} paddingNext={isSmallDisplay ? 0 : 8}>
            <MiradorMenuButton
              id="color-picker-label"
              containerId={containerId}
              disabled={!visible}
              aria-label={t('colorPicker')}
              aria-controls="color-picker"
              aria-expanded={showColorPicker}
              onClick={() => setShowColorPicker(!showColorPicker)}
              sx={{
                backgroundColor: showColorPicker && alpha(bubbleFg, 0.1),
              }}
            >
              <PaletteIcon />
            </MiradorMenuButton>
            {visible && showColorPicker && (
              <ColorWidget
                t={t}
                containerId={containerId}
                bgColor={bgColor}
                textColor={textColor}
                pageColors={pageColors}
                useAutoColors={useAutoColors}
                onChange={(newOpts) =>
                  updateWindowTextOverlayOptions({
                    ...windowTextOverlayOptions,
                    ...newOpts,
                  })
                }
              />
            )}
          </ButtonContainer>
        </>
      )}
      {textsFetching && <CircularProgress disableShrink size={50} sx={{ position: 'absolute' }} />}
      {!isSmallDisplay && toggleButton}
    </BubbleContainer>
  );
};

OverlaySettings.propTypes = {
  containerId: PropTypes.string.isRequired,
  imageToolsEnabled: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  textsAvailable: PropTypes.bool.isRequired,
  textsFetching: PropTypes.bool.isRequired,
  updateWindowTextOverlayOptions: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  windowTextOverlayOptions: PropTypes.object.isRequired,
  pageColors: PropTypes.arrayOf(
    PropTypes.shape({
      textColor: PropTypes.string,
      bgColor: PropTypes.string,
    }),
  ).isRequired,
};

export default OverlaySettings;
