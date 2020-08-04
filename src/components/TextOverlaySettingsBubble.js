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
import ResetColorsIcon from '@material-ui/icons/SettingsBackupRestore';
import CircularProgress from '@material-ui/core/CircularProgress';
import useTheme from '@material-ui/core/styles/useTheme';

import { changeAlpha, toHexRgb } from '../lib/color';
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

/** Get the styles to render the automatically determined color(s) */
function getAutoColorStyle(manualColor, colors) {
  if (!colors) {
    return {};
  }
  const validColors = colors.filter((c) => c);
  if (validColors.length !== 2) {
    return {
      backgroundColor: validColors?.[0] ?? manualColor,
    };
  }
  return {
    backgroundImage: `linear-gradient(90deg, ${colors[0] ?? manualColor} 50%, ${colors[1] ?? manualColor} 50%)`,
  };
}

/** Input to select a color */
const ColorInput = ({
  color, onChange, title, style, autoColors,
}) => (
  <label
    style={{
      width: 48,
      height: 48,
      padding: 8,
      boxSizing: 'border-box',
      ...style,
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
        ...getAutoColorStyle(color, autoColors),
      }}
    />
    <input
      type="color"
      value={toHexRgb((autoColors && autoColors[0]) ? autoColors[0] : color)}
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
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object,
  autoColors: PropTypes.arrayOf(PropTypes.string),
};
ColorInput.defaultProps = {
  style: {},
  autoColors: undefined,
};

/** Widget to update text and background color */
const ColorWidget = ({
  textColor, bgColor, onChange, t, pageColors, useAutoColors,
}) => {
  const { palette } = useTheme();
  const bubbleBg = palette.shades.main;
  const showResetButton = (
    !useAutoColors
    && pageColors
    && pageColors.some((c) => c && (c.textColor || c.bgColor))
  );
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
      {showResetButton && (
      <MiradorMenuButton
        aria-label={t('resetTextColors')}
        onClick={() => onChange({
          useAutoColors: true,
          textColor: pageColors.map((cs) => cs.textColor).filter((x) => x)[0] ?? textColor,
          bgColor: pageColors.map((cs) => cs.bgColor).filter((x) => x)[0] ?? bgColor,
        })}
      >
        <ResetColorsIcon />
      </MiradorMenuButton>
      )}
      <ColorInput
        title={t('textColor')}
        autoColors={useAutoColors
          ? pageColors.map((colors) => colors.textColor)
          : undefined}
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
        style={{
          height: 40,
          padding: '8px 8px 0px 8px',
          marginTop: showResetButton ? -12 : undefined,
        }}
      />
      <ColorInput
        title={t('backgroundColor')}
        color={bgColor}
        autoColors={useAutoColors
          ? pageColors.map((colors) => colors.bgColor)
          : undefined}
        onChange={(color) => {
          // See comment on previous ColorInput onChange callback
          if (useAutoColors && color === toHexRgb(pageColors?.[0]?.bgColor)) {
            return;
          }
          onChange({ bgColor: color, textColor, useAutoColors: false });
        }}
        style={{
          marginTop: -6,
          zIndex: -5,
          height: 40,
          padding: '0px 8px 8px 8px',
        }}
      />
    </div>
  );
};
ColorWidget.propTypes = {
  textColor: PropTypes.string.isRequired,
  bgColor: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  useAutoColors: PropTypes.bool.isRequired,
  pageColors: PropTypes.arrayOf(
    PropTypes.shape({
      textColor: PropTypes.string, bgColor: PropTypes.string,
    }),
  ).isRequired,
};

/** Control text overlay settings  */
const TextOverlaySettingsBubble = ({
  windowTextOverlayOptions, imageToolsEnabled, textsAvailable,
  textsFetching, updateWindowTextOverlayOptions, t, pageColors,
}) => {
  const {
    enabled, visible, selectable, opacity, textColor, bgColor, useAutoColors,
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

TextOverlaySettingsBubble.propTypes = {
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

export default TextOverlaySettingsBubble;
