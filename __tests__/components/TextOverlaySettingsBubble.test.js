import React from 'react';
import {
  describe, it, jest, expect,
} from '@jest/globals';
import {
  fireEvent, render, screen, queryByRole,
} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import TextOverlaySettingsBubble from '../../src/components/TextOverlaySettingsBubble';

// Mocked MUI slider for easier testing, taken from
// https://stackoverflow.com/a/61628815 (CC BY-SA 4.0)
jest.mock('@material-ui/core/Slider', () => (props) => {
  const {
    id, name, min, max, onChange,
  } = props;
  return (
    <input
      data-testid="opacity-slider"
      type="range"
      id={id}
      name={name}
      min={min}
      max={max}
      onChange={(event) => onChange(event, event.target.value)}
    />
  );
});

/** Render a bubble to the testing screen */
function renderBubble(props = {}) {
  const updateOptionsMock = jest.fn();
  const options = {
    enabled: true,
    opacity: 1,
    selectable: false,
    visible: false,
    ...(props.windowTextOverlayOptions ?? {}),
  };
  render(<TextOverlaySettingsBubble
    imageToolsEnabled={false}
    t={(key) => key}
    textsAvailable
    textsFetching={false}
    updateWindowTextOverlayOptions={updateOptionsMock}
    {...props}
    windowTextOverlayOptions={options}
  />);
  return { options, updateOptionsMock };
}

describe('TextOverlaySettingsBubble', () => {
  it('should not render when the texts are unavailable', () => {
    renderBubble({ textsAvailable: false });
    expect(screen.queryByLabelText('expandTextOverlayOptions')).toBeNull();
  });

  it('should not render when the plugin is disabled', () => {
    renderBubble({ windowTextOverlayOptions: { enabled: false } });
    expect(screen.queryByLabelText('expandTextOverlayOptions')).toBeNull();
  });

  it('should render the bubble collapsed when texts are available, but neither selection nor visibility is enabled', () => {
    renderBubble();
    expect(screen.getByLabelText('expandTextOverlayOptions')).toBeVisible();
    expect(screen.queryByLabelText('textSelect')).toBeNull();
    expect(screen.queryByLabelText('textVisible')).toBeNull();
    expect(screen.queryByLabelText('textOpacity')).toBeNull();
  });

  it('should open and close the menu on clicks', () => {
    renderBubble();
    let bubble = screen.queryByLabelText('expandTextOverlayOptions');
    expect(bubble).not.toBeNull();
    fireEvent.click(bubble);
    bubble = screen.queryByLabelText('collapseTextOverlayOptions');
    expect(bubble).not.toBeNull();
    expect(screen.queryByLabelText('textSelect')).not.toBeNull();
    expect(screen.queryByLabelText('textVisible')).not.toBeNull();
    expect(screen.queryByLabelText('textOpacity')).not.toBeNull();
  });

  it('should render the selection toggle correctly when enabled', () => {
    const { updateOptionsMock, options: initialOpts } = renderBubble({
      windowTextOverlayOptions: { selectable: true },
    });

    // Visibility and Selection bubbles should be shown, Opacity toggle should be disabled
    expect(screen.getByLabelText('collapseTextOverlayOptions')).toBeVisible();
    const visibleButton = screen.getByLabelText('textVisible');
    expect(visibleButton).toBeVisible();
    expect(visibleButton).toHaveAttribute('aria-pressed', 'false');
    const opacityToggle = screen.getByLabelText('textOpacity');
    expect(opacityToggle).toBeVisible();
    expect(opacityToggle).toBeDisabled();
    expect(opacityToggle).not.toHaveStyle('background-color: rgba(0, 0, 0, 0.1');
    expect(opacityToggle).not.toHaveAttribute('aria-expanded', 'true');
    expect(queryByRole(opacityToggle.parentElement, 'slider')).toBeNull();

    // Button should be shown as active
    const selectButton = screen.getByLabelText('textSelect');
    expect(selectButton).toBeVisible();
    expect(selectButton).toHaveStyle('background-color: rgba(0, 0, 0, 0.25)');
    expect(selectButton).toHaveAttribute('aria-pressed', 'true');

    // Test click behavior
    fireEvent.click(selectButton);
    expect(updateOptionsMock).toHaveBeenCalledWith({
      ...initialOpts,
      selectable: false,
    });
  });

  it('should render the visibility toggle correctly when enabled', () => {
    const { updateOptionsMock, options: initialOpts } = renderBubble({
      windowTextOverlayOptions: { visible: true },
    });

    // Visibility and Selection bubbles should be shown, Opacity toggle should be enabled
    expect(screen.getByLabelText('collapseTextOverlayOptions')).toBeVisible();
    const selectButton = screen.getByLabelText('textSelect');
    expect(selectButton).toBeVisible();
    expect(selectButton).not.toHaveStyle('background-color: rgba(0, 0, 0, 0.25)');
    expect(selectButton).toHaveAttribute('aria-pressed', 'false');
    const opacityToggle = screen.getByLabelText('textOpacity');
    expect(opacityToggle).toBeVisible();
    expect(opacityToggle).not.toBeDisabled();
    expect(opacityToggle).not.toHaveStyle('background-color: rgba(0, 0, 0, 0.1');
    expect(opacityToggle).not.toHaveAttribute('aria-expanded', 'true');
    expect(queryByRole(opacityToggle.parentElement, 'slider')).toBeNull();

    // Button should be shown as active
    const visibleButton = screen.getByLabelText('textVisible');
    expect(visibleButton).toBeVisible();
    expect(visibleButton).toHaveAttribute('aria-pressed', 'true');
    expect(visibleButton).toHaveStyle('background-color: rgba(0, 0, 0, 0.25)');
    expect(visibleButton).toHaveAttribute('aria-pressed', 'true');

    // Test click behavior
    fireEvent.click(visibleButton);
    expect(updateOptionsMock).toHaveBeenCalledWith({
      ...initialOpts,
      visible: false,
    });
  });

  it('should handle opacity changes correctly', () => {
    const { updateOptionsMock, options: initialOpts } = renderBubble({
      windowTextOverlayOptions: { opacity: 0.5, visible: true },

    });
    const opacityToggle = screen.getByLabelText('textOpacity');

    // Show opacity slider
    fireEvent.click(opacityToggle);
    const slider = screen.getByTestId('opacity-slider');
    expect(slider).not.toBeNull();
    expect(slider).toHaveValue('50');

    // Change opacity
    fireEvent.change(slider, { target: { value: 25 } });
    expect(slider).toHaveValue('25');
    expect(updateOptionsMock).toHaveBeenCalledWith({
      ...initialOpts,
      opacity: 0.25,
    });

    // Hide slider
    fireEvent.click(opacityToggle);
    expect(screen.queryByTestId('opacity-slider')).toBeNull();
  });

  it('should close the opacity slider when visibility is disabled', () => {
    renderBubble({
      windowTextOverlayOptions: { opacity: 0.5, visible: true },
    });
    const visibleToggle = screen.getByLabelText('textVisible');
    const opacityToggle = screen.getByLabelText('textOpacity');
    fireEvent.click(opacityToggle);
    expect(screen.queryByTestId('opacity-slider')).not.toBeNull();
    fireEvent.click(visibleToggle);
    expect(screen.queryByTestId('opacity-slider')).toBeNull();
    fireEvent.click(visibleToggle);
    expect(screen.queryByTestId('opacity-slider')).toBeNull();
  });

  it('should be positioned lower if mirador-image-tools is enabled', () => {
    renderBubble({ imageToolsEnabled: true });
    expect(screen.getByLabelText('expandTextOverlayOptions').parentElement)
      .toHaveStyle('top: 66px');
  });

  it('should be closed, disabled and surrounded by a progress bar when texts are fetching', () => {
    renderBubble({ textsFetching: true, visible: true });
    expect(screen.getByRole('progressbar')).toBeVisible();
    expect(screen.getByLabelText('expandTextOverlayOptions')).toBeVisible();
    expect(screen.getByLabelText('expandTextOverlayOptions')).toBeDisabled();
    expect(screen.queryByLabelText('textSelect')).toBeNull();
    expect(screen.queryByLabelText('textVisible')).toBeNull();
    expect(screen.queryByLabelText('textOpacity')).toBeNull();
  });
});
