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
import useMediaQuery from '@material-ui/core/useMediaQuery';
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
      borderRadius: (props) => [[25, 25, 25, 25]],
      position: 'absolute',
      right: 8,
      // The mirador-image-tools plugin renders itself at the same position,
      // so if it's active, position the menu lower
      top: (props) => (props.imageToolsEnabled ? 66 : 8),
      zIndex: 999,
      [breakpoints.down('sm')]: {
        flexDirection: 'column',
        top: (props) => 8, // FIXME: Needs to be a func for some reason
        right: (props) => (props.imageToolsEnabled ? 66 : 8),
        borderRadius: (props) => [
          [25, 25, 25, !props.textsFetching && props.open && props.showColorPicker ? 0 : 25],
        ],
      },
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
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down('sm'));

  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  const bubbleFg = palette.getContrastText(bubbleBg);
  const toggledBubbleBg = fade(bubbleFg, 0.25);
  const classes = useStyles({
    imageToolsEnabled,
    open,
    showColorPicker,
    textsFetching,
  });

  const textColor = useAutoColors
    ? pageColors.map((cs) => cs.textColor).filter((x) => x)[0] ?? defaultTextColor
    : defaultTextColor;
  const bgColor = useAutoColors
    ? pageColors.map((cs) => cs.bgColor).filter((x) => x)[0] ?? defaultBgColor
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
    <div className={`MuiPaper-elevation4 ${classes.bubbleContainer}`}>
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
              style={{ backgroundColor: selectable && toggledBubbleBg }}
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
              style={{ backgroundColor: visible && toggledBubbleBg }}
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
              style={{
                backgroundColor: showOpacitySlider && fade(bubbleFg, 0.1),
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
              style={{
                backgroundColor: showColorPicker && fade(bubbleFg, 0.1),
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
      {textsFetching && (
        <CircularProgress disableShrink size={50} style={{ position: 'absolute' }} />
      )}
      {!isSmallDisplay && toggleButton}
    </div>
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
    })
  ).isRequired,
};

export default OverlaySettings;
