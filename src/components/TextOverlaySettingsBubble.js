import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { MiradorMenuButton } from 'mirador/dist/es/src/components/MiradorMenuButton';
import Slider from '@material-ui/core/Slider';
import TextIcon from '@material-ui/icons/TextFields';
import CloseIcon from '@material-ui/icons/Close';
import SubjectIcon from '@material-ui/icons/Subject';
import OpacityIcon from '@material-ui/icons/Opacity';
import CircularProgress from '@material-ui/core/CircularProgress';
import TextSelectIcon from './TextSelectIcon';

/** Control text overlay settings  */
const TextOverlaySettingsBubble = ({
  windowTextOverlayOptions, imageToolsEnabled, textsAvailable,
  textsFetching, updateWindowTextOverlayOptions, t,
}) => {
  const {
    enabled, visible, selectable, opacity,
  } = windowTextOverlayOptions;
  const [open, setOpen] = useState(enabled && (visible || selectable));
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

  if (!enabled || !textsAvailable) {
    return null;
  }
  return (
    <div
      className="MuiPaper-elevation4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
        <div style={{
          // CSS voodoo to render a border with a margin on the top and bottom
          borderImageSlice: 1,
          borderImageSource: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0.2) 20% 80%, rgba(0, 0, 0, 0) 80% )',
          borderRight: '1px solid rgba(0, 0, 0, 0.2)',
          display: 'inline-block',
          paddingRight: 8,
        }}
        >
          <MiradorMenuButton
            aria-label={t('textSelect')}
            onClick={() => updateWindowTextOverlayOptions({
              ...windowTextOverlayOptions,
              selectable: !selectable,
            })}
            aria-pressed={selectable}
            style={{ backgroundColor: selectable && 'rgba(0, 0, 0, 0.25)' }}
          >
            <TextSelectIcon />
          </MiradorMenuButton>
        </div>
        <div style={{ display: 'inline-block', paddingLeft: 8 }}>
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
            }}
            aria-pressed={visible}
            style={{ backgroundColor: visible && 'rgba(0, 0, 0, 0.25)' }}
          >
            <TextIcon />
          </MiradorMenuButton>
        </div>
        <div style={{
          // CSS voodoo to render a border with a margin on the top and bottom
          borderImageSlice: 1,
          borderImageSource: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0.2) 20% 80%, rgba(0, 0, 0, 0) 80% )',
          borderRight: '1px solid rgba(0, 0, 0, 0.2)',
          display: 'inline-block',
          paddingRight: 8,
        }}
        >
          <MiradorMenuButton
            id="text-opacity-slider-label"
            disabled={!visible}
            aria-label={t('textOpacity')}
            aria-controls="text-opacity-slider"
            aria-expanded={showOpacitySlider}
            onClick={() => setShowOpacitySlider(!showOpacitySlider)}
            style={{ backgroundColor: showOpacitySlider && 'rgba(0, 0, 0, 0.1)' }}
          >
            <OpacityIcon />
          </MiradorMenuButton>
          {visible && showOpacitySlider
          && (
          <div
            data-test-id="text-opacity-slider"
            id="text-opacity-slider"
            aria-labelledby="text-opacity-slider-label"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 25,
              height: '150px',
              marginTop: 2,
              padding: 8,
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
              onChange={(evt, val) => updateWindowTextOverlayOptions({
                ...windowTextOverlayOptions,
                opacity: val / 100.0,
              })}
            />
          </div>
          )}
        </div>
      </>
      )}
      {textsFetching
        && <CircularProgress size={50} style={{ position: 'absolute' }} />}
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
