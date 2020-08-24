/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import TextIcon from '@material-ui/icons/TextFields';
import CloseIcon from '@material-ui/icons/Close';
import SubjectIcon from '@material-ui/icons/Subject';
import OpacityIcon from '@material-ui/icons/Opacity';
import PaletteIcon from '@material-ui/icons/Palette';
import CircularProgress from '@material-ui/core/CircularProgress';
import useTheme from '@material-ui/core/styles/useTheme';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { fade } from '@material-ui/core/styles/colorManipulator';

import TextSelectIcon from '../TextSelectIcon';
import ButtonContainer from './ButtonContainer';
import OpacityWidget from './OpacityWidget';
import ColorWidget from './ColorWidget';

const useStyles = makeStyles(({ palette, breakpoints }) => {
  const bubbleBg = palette.shades.main;

  return {
    bubbleContainer: {
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: fade(bubbleBg, 0.8),
      borderRadius: 25,
      position: 'absolute',
      right: 8,
      // The mirador-image-tools plugin renders itself at the same position,
      // so if it's active, position the menu lower
      top: (props) => (props.imageToolsEnabled ? 66 : 8),
      zIndex: 999,
    },
  };
});

/** Control text overlay settings  */
const OverlaySettings = ({
  windowTextOverlayOptions, imageToolsEnabled, textsAvailable,
  textsFetching, updateWindowTextOverlayOptions, t, pageColors,
}) => {
  const {
    enabled, visible, selectable, opacity, textColor: defaultTextColor, bgColor: defaultBgColor,
    useAutoColors,
  } = windowTextOverlayOptions;
  const [open, setOpen] = useState(enabled && (visible || selectable));
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  const bubbleFg = palette.getContrastText(bubbleBg);
  const toggledBubbleBg = fade(bubbleFg, 0.25);
  const classes = useStyles({ imageToolsEnabled });

  const textColor = useAutoColors
    ? pageColors.map((cs) => cs.textColor).filter((x) => x)[0] ?? defaultTextColor
    : defaultTextColor;
  const bgColor = useAutoColors
    ? pageColors.map((cs) => cs.bgColor).filter((x) => x)[0] ?? defaultBgColor
    : defaultBgColor;

  if (!enabled || !textsAvailable) {
    return null;
  }
  return (
    <div className={`MuiPaper-elevation4 ${classes.bubbleContainer}`}>
      {(open && !textsFetching)
      && (
      <>
        <ButtonContainer withBorder paddingRight={8}>
          <MiradorMenuButton
            aria-label={t('textSelect')}
            onClick={() => updateWindowTextOverlayOptions({
              ...windowTextOverlayOptions,
              selectable: !selectable,
            })}
            aria-pressed={selectable}
            style={{ backgroundColor: selectable && toggledBubbleBg }}
          >
            <TextSelectIcon />
          </MiradorMenuButton>
        </ButtonContainer>
        <ButtonContainer paddingLeft={8}>
          <MiradorMenuButton
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
            style={{ backgroundColor: visible && toggledBubbleBg }}
          >
            <TextIcon />
          </MiradorMenuButton>
        </ButtonContainer>
        <ButtonContainer>
          <MiradorMenuButton
            id="text-opacity-slider-label"
            disabled={!visible}
            aria-label={t('textOpacity')}
            aria-controls="text-opacity-slider"
            aria-expanded={showOpacitySlider}
            onClick={() => setShowOpacitySlider(!showOpacitySlider)}
            style={{
              backgroundColor: showOpacitySlider && fade(bubbleFg, 0.1),
            }}
          >
            <OpacityIcon />
          </MiradorMenuButton>
          {visible && showOpacitySlider
          && (
          <OpacityWidget
            t={t}
            opacity={opacity}
            onChange={(newOpacity) => updateWindowTextOverlayOptions({
              ...windowTextOverlayOptions,
              opacity: newOpacity,
            })}
          />
          )}
        </ButtonContainer>
        <ButtonContainer withBorder paddingRight={8}>
          <MiradorMenuButton
            id="color-picker-label"
            disabled={!visible}
            aria-label={t('colorPicker')}
            aria-controls="color-picker"
            aria-expanded={showColorPicker}
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{
              backgroundColor: showColorPicker && fade(bubbleFg, 0.1),
            }}
          >
            <PaletteIcon />
          </MiradorMenuButton>
          {visible && showColorPicker
          && (
          <ColorWidget
            t={t}
            bgColor={bgColor}
            textColor={textColor}
            pageColors={pageColors}
            useAutoColors={useAutoColors}
            onChange={(newOpts) => updateWindowTextOverlayOptions({
              ...windowTextOverlayOptions,
              ...newOpts,
            })}
          />
          )}
        </ButtonContainer>
      </>
      )}
      {textsFetching
        && <CircularProgress disableShrink size={50} style={{ position: 'absolute' }} />}
      <MiradorMenuButton
        aria-label={open ? t('collapseTextOverlayOptions') : t('expandTextOverlayOptions')}
        disabled={textsFetching}
        onClick={() => setOpen(!open)}
      >
        { (open && !textsFetching)
          ? <CloseIcon />
          : <SubjectIcon />}
      </MiradorMenuButton>
    </div>
  );
};

OverlaySettings.propTypes = {
  imageToolsEnabled: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  textsAvailable: PropTypes.bool.isRequired,
  textsFetching: PropTypes.bool.isRequired,
  updateWindowTextOverlayOptions: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  windowTextOverlayOptions: PropTypes.object.isRequired,
  pageColors: PropTypes.arrayOf(
    PropTypes.shape({
      textColor: PropTypes.string, bgColor: PropTypes.string,
    }),
  ).isRequired,
};

export default OverlaySettings;
