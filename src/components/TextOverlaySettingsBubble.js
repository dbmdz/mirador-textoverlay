/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import Slider from '@material-ui/core/Slider';
import TextIcon from '@material-ui/icons/TextFields';
import CloseIcon from '@material-ui/icons/Close';
import SubjectIcon from '@material-ui/icons/Subject';
import OpacityIcon from '@material-ui/icons/Opacity';
import PaletteIcon from '@material-ui/icons/Palette';
import CircularProgress from '@material-ui/core/CircularProgress';
import useTheme from '@material-ui/core/styles/useTheme';

import { changeAlpha } from '../lib/color';
import TextSelectIcon from './TextSelectIcon';


/** Container for a settings button */
const ButtonContainer = ({
  children, withBorder, paddingLeft, paddingRight,
}) => {
  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  // CSS voodoo to render a border with a margin on the top and bottom
  const bubbleFg = palette.getContrastText(bubbleBg);
  const style = {
    display: 'inline-block',
    paddingRight,
    paddingLeft,
  };
  if (withBorder) {
    // CSS voodoo to render a border with a margin on the top and bottom
    style.borderImageSource = 'linear-gradient('
    + `to bottom, ${changeAlpha(bubbleFg, 0)}) 20%,`
    + `${changeAlpha(bubbleFg, 0.2)} 20% 80%,`
    + `${changeAlpha(bubbleFg, 0)} 80%`;
    style.borderRight = `1px solid ${changeAlpha(bubbleFg, 0.2)}`;
    style.borderImageSlice = 1;
  }
  return (
    <div style={style}>
      {children}
    </div>
  );
};
ButtonContainer.propTypes = {
  children: PropTypes.node.isRequired,
  withBorder: PropTypes.bool,
  paddingRight: PropTypes.number,
  paddingLeft: PropTypes.number,
};
ButtonContainer.defaultProps = {
  withBorder: false,
  paddingRight: undefined,
  paddingLeft: undefined,
};

/** Widget to control the opacity of the displayed text */
const OpacityWidget = ({ opacity, onChange, t }) => {
  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  return (
    <div
      data-test-id="text-opacity-slider"
      id="text-opacity-slider"
      aria-labelledby="text-opacity-slider-label"
      className="MuiPaper-elevation4"
      style={{
        backgroundColor: changeAlpha(bubbleBg, 0.8),
        borderRadius: '0px 0px 25px 25px',
        height: '150px',
        padding: '16px 8px 8px 8px',
        position: 'absolute',
        top: 48,
        zIndex: 100,
      }}
    >
      <Slider
        orientation="vertical"
        min={0}
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

/** Input to select a color */
const ColorInput = ({ color, onChange, title }) => (
  <label
    style={{
      width: 48,
      height: 48,
      padding: 8,
      boxSizing: 'border-box',
    }}
  >
    <div
      title={title}
      className="MuiPaper-elevation2"
      style={{
        display: 'inline-block',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: color,
      }}
    />
    <input
      type="color"
      value={color}
      style={{ display: 'none' }}
      onChange={(evt) => onChange(evt.target.value)}
      onInput={(evt) => onChange(evt.target.value)}
    />
  </label>
);
ColorInput.propTypes = {
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};

/** Widget to update text and background color */
const ColorWidget = ({
  textColor, bgColor, onChange, t,
}) => {
  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  return (
    <div
      className="MuiPaper-elevation4"
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        top: 48,
        zIndex: 100,
        borderRadius: '0 0 25px 25px',
        backgroundColor: changeAlpha(bubbleBg, 0.8),
      }}
    >
      <ColorInput
        title={t('textColor')}
        color={textColor}
        onChange={(color) => onChange({ textColor: color, bgColor })}
      />
      <ColorInput
        title={t('backgroundColor')}
        color={bgColor}
        onChange={(color) => onChange({ bgColor: color, textColor })}
      />
    </div>
  );
};
ColorWidget.propTypes = {
  textColor: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};


/** Control text overlay settings  */
const TextOverlaySettingsBubble = ({
  windowTextOverlayOptions, imageToolsEnabled, textsAvailable,
  textsFetching, updateWindowTextOverlayOptions, t,
}) => {
  const {
    enabled, visible, selectable, opacity, textColor, bgColor,
  } = windowTextOverlayOptions;
  const [open, setOpen] = useState(enabled && (visible || selectable));
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  const bubbleFg = palette.getContrastText(bubbleBg);
  const toggledBubbleBg = changeAlpha(bubbleFg, 0.25);

  if (!enabled || !textsAvailable) {
    return null;
  }
  return (
    <div
      className="MuiPaper-elevation4"
      style={{
        backgroundColor: changeAlpha(bubbleBg, 0.8),
        borderRadius: 25,
        position: 'absolute',
        right: 8,
        // The mirador-image-tools plugin renders itself at the same position,
        // so if it's active, position the menu lower
        top: imageToolsEnabled ? 66 : 8,
        zIndex: 999,
      }}
    >
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
              backgroundColor: showOpacitySlider && changeAlpha(bubbleFg, 0.1),
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
              backgroundColor: showColorPicker && changeAlpha(bubbleFg, 0.1),
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
            onChange={({ textColor: newText, bgColor: newBg }) => updateWindowTextOverlayOptions({
              ...windowTextOverlayOptions,
              bgColor: newBg,
              textColor: newText,
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

TextOverlaySettingsBubble.propTypes = {
  imageToolsEnabled: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired,
  textsAvailable: PropTypes.bool.isRequired,
  textsFetching: PropTypes.bool.isRequired,
  updateWindowTextOverlayOptions: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  windowTextOverlayOptions: PropTypes.object.isRequired,
};

export default TextOverlaySettingsBubble;
