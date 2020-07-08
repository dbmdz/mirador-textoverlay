import React from 'react';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import ListSubheader from '@material-ui/core/ListSubheader';
import MenuItem from '@material-ui/core/MenuItem';
import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import PropTypes from 'prop-types';
import TextOpacityIcon from '@material-ui/icons/Opacity';
import TextVisibleIcon from '@material-ui/icons/TextFields';

import TextSelectIcon from './TextSelectIcon';


/** Settings dialog for text display options */
const WindowTextSettings = ({
  t,
  textAvailable,
  windowId,
  windowTextOverlayOptions: currentOpts,
  setWindowTextOverlayOptions: setOpts,
}) => {
  /** Toggle a boolean option */
  const handleToggle = (optionName) => setOpts(
    windowId, {
      ...currentOpts,
      [optionName]: !currentOpts[optionName],
    },
  );

  /** Change the opacity */
  const handleOpacityChange = (evt, opacity) => setOpts(
    windowId, {
      ...currentOpts,
      opacity: opacity / 100.0,
    },
  );

  const {
    enabled, selectable, visible, opacity,
  } = currentOpts;

  return (
    <>
      <ListSubheader role="presentation" disableSticky tabIndex="-1">{t('textOverlay')}</ListSubheader>
      <MenuItem>
        <FormControlLabel
          disabled={!enabled || !textAvailable}
          control={(
            <>
              <TextSelectIcon />
              <Switch disabled={!enabled || !textAvailable} size="small" checked={selectable} onChange={() => handleToggle('selectable')} />
            </>
            )}
          label={t('textSelect')}
        />
      </MenuItem>
      <MenuItem>
        <FormControlLabel
          disabled={!enabled || !textAvailable}
          control={(
            <>
              <TextVisibleIcon />
              <Switch disabled={!enabled || !textAvailable} size="small" checked={visible} onChange={() => handleToggle('visible')} />
            </>
          )}
          label={t('textVisible')}
        />
      </MenuItem>
      {visible
      && (
      <MenuItem>
        <Typography id="text-opacity-slider" gutterBottom>
          <TextOpacityIcon titleAccess={t('textOpacity')} />
        </Typography>
        <Slider
          disabled={!enabled || !textAvailable}
          value={opacity * 100}
          onChange={handleOpacityChange}
          min={0}
          max={100}
          defaultValue={50}
          aria-labelledby="text-opacity-slider"
        />
      </MenuItem>
      )}
    </>
  );
};

WindowTextSettings.propTypes = {
  setWindowTextOverlayOptions: PropTypes.func.isRequired,
  t: PropTypes.func,
  textAvailable: PropTypes.bool,
  windowId: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  windowTextOverlayOptions: PropTypes.object.isRequired,
};
WindowTextSettings.defaultProps = {
  t: (key) => key,
  textAvailable: false,
};

export default WindowTextSettings;
