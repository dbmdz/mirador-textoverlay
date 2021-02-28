/* eslint-disable react/prop-types */
import React from 'react';
import { describe, it, jest, expect } from '@jest/globals';
import { fireEvent, render, screen, queryByRole } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { ThemeProvider } from '@material-ui/core/styles';
import MuiDefaultTheme from '@material-ui/core/styles/defaultTheme';

import OverlaySettings from '../../src/components/settings/OverlaySettings';

const mockTheme = {
  ...MuiDefaultTheme,
  palette: {
    ...MuiDefaultTheme.palette,
    getContrastText: () => '#000',
    shades: {
      ...MuiDefaultTheme.palette.shades,
      main: '#fff',
    },
  },
};

// Mocked MUI slider for easier testing, taken from
// https://stackoverflow.com/a/61628815 (CC BY-SA 4.0)
jest.mock('@material-ui/core/Slider', () => (props) => {
  const { id, name, min, max, onChange } = props;
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
function renderSettings(props = {}, renderFn = render) {
  const updateOptionsMock = jest.fn();
  const options = {
    enabled: true,
    opacity: 1,
    selectable: false,
    visible: false,
    textColor: '#000000',
    bgColor: '#ffffff',
    useAutoColors: false,
    ...(props.windowTextOverlayOptions ?? {}),
  };
  const pageColors = [
    { textColor: '#111111', bgColor: '#eeeeee' },
    { textColor: '#222222', bgColor: '#dddddd' },
  ];
  const { rerender } = renderFn(
    <ThemeProvider theme={mockTheme}>
      <OverlaySettings
        containerId="foobar"
        imageToolsEnabled={false}
        t={(key) => key}
        textsAvailable
        textsFetching={false}
        updateWindowTextOverlayOptions={updateOptionsMock}
        pageColors={pageColors}
        {...props}
        windowTextOverlayOptions={options}
      />
    </ThemeProvider>
  );
  return { rerender, options, updateOptionsMock };
}

describe('TextOverlaySettingsBubble', () => {
  it('should not render when the texts are unavailable', () => {
    renderSettings({ textsAvailable: false });
    expect(screen.queryByLabelText('expandTextOverlayOptions')).toBeNull();
  });

  it('should not render when the plugin is disabled', () => {
    renderSettings({ windowTextOverlayOptions: { enabled: false } });
    expect(screen.queryByLabelText('expandTextOverlayOptions')).toBeNull();
  });

  it('should render the bubble collapsed when texts are available, but neither selection nor visibility is enabled', () => {
    renderSettings();
    expect(screen.getByLabelText('expandTextOverlayOptions')).toBeVisible();
    expect(screen.queryByLabelText('textSelect')).toBeNull();
    expect(screen.queryByLabelText('textVisible')).toBeNull();
    expect(screen.queryByLabelText('textOpacity')).toBeNull();
  });

  it('should open and close the menu on clicks', () => {
    renderSettings();
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
    const { updateOptionsMock, options: initialOpts } = renderSettings({
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
    const { updateOptionsMock, options: initialOpts } = renderSettings({
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
    const { updateOptionsMock, options: initialOpts } = renderSettings({
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
    renderSettings({
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
    renderSettings({ imageToolsEnabled: true });
    expect(
      screen.getByLabelText('expandTextOverlayOptions').parentElement.parentElement
    ).toHaveStyle('top: 66px');
  });

  it('should be closed, disabled and surrounded by a progress spinner when texts are fetching', () => {
    renderSettings({ textsFetching: true, visible: true });
    expect(screen.getByRole('progressbar')).toBeVisible();
    expect(screen.getByLabelText('expandTextOverlayOptions')).toBeVisible();
    expect(screen.getByLabelText('expandTextOverlayOptions')).toBeDisabled();
    expect(screen.queryByLabelText('textSelect')).toBeNull();
    expect(screen.queryByLabelText('textVisible')).toBeNull();
    expect(screen.queryByLabelText('textOpacity')).toBeNull();
  });

  it('should allow manually setting the foreground and background colors', () => {
    const { options, updateOptionsMock } = renderSettings({
      windowTextOverlayOptions: { visible: true, textColor: '#bbbbbb', bgColor: '#444444' },
    });
    fireEvent.click(screen.getByLabelText('colorPicker'));

    expect(screen.queryByLabelText('resetTextColors')).not.toBeDisabled();

    const textLabel = screen.getByTitle('textColor');
    const textInput = textLabel.nextElementSibling;
    expect(textLabel).toHaveStyle({ 'background-color': '#bbbbbb' });
    expect(textInput).toHaveValue('#bbbbbb');
    fireEvent.input(textInput, { target: { value: '#cccccc' } });
    expect(updateOptionsMock).toHaveBeenCalledWith({ ...options, textColor: '#cccccc' });
    fireEvent.change(textInput, { target: { value: '#dddddd' } });
    expect(updateOptionsMock).toHaveBeenCalledWith({ ...options, textColor: '#dddddd' });

    const bgLabel = screen.getByTitle('backgroundColor');
    const bgInput = bgLabel.nextElementSibling;
    expect(bgLabel).toHaveStyle({ 'background-color': '#444444' });
    expect(bgInput).toHaveValue('#444444');
  });

  it('should not render the reset button if no page colors are available', () => {
    renderSettings({
      windowTextOverlayOptions: { visible: true },
      pageColors: [undefined, undefined],
    });
    fireEvent.click(screen.getByLabelText('colorPicker'));
    expect(screen.queryByLabelText('resetTextColors')).toBeNull();
  });

  it('should disable auto-color reset and render gradients in the pickers if auto colors are being used', () => {
    renderSettings({ windowTextOverlayOptions: { visible: true, useAutoColors: true } });
    fireEvent.click(screen.getByLabelText('colorPicker'));
    expect(screen.queryByLabelText('resetTextColors')).toBeNull();
    const textLabel = screen.getByTitle('textColor');
    // This will fail due to a jsdom bug, unfortunately :-/
    // https://github.com/jsdom/jsdom/issues/2166
    // expect(textLabel).toHaveStyle({
    //  'background-image': 'linear-gradient(90deg, #111111 50%, #222222 50%)',
    // });
    // Text color should be the first pages' auto textColor
    const textInput = textLabel.nextElementSibling;
    expect(textInput).toHaveValue('#111111');
    // Same for the backgroundColor
    expect(screen.getByTitle('backgroundColor').nextElementSibling).toHaveValue('#eeeeee');
  });

  it('should disable auto-colors if colors are manually selected', () => {
    const { updateOptionsMock, options } = renderSettings({
      windowTextOverlayOptions: { visible: true, useAutoColors: true },
    });
    fireEvent.click(screen.getByLabelText('colorPicker'));
    const textLabel = screen.getByTitle('backgroundColor');
    const textInput = textLabel.nextElementSibling;
    fireEvent.change(textInput, { target: { value: '#deadbe' } });
    expect(updateOptionsMock).toHaveBeenCalledWith({
      ...options,
      bgColor: '#deadbe',
      textColor: '#111111',
      useAutoColors: false,
    });
  });

  it('should not disable auto-colors if manual color selection is canceled', () => {
    const { updateOptionsMock } = renderSettings({
      windowTextOverlayOptions: { visible: true, useAutoColors: true },
    });
    fireEvent.click(screen.getByLabelText('colorPicker'));
    const textLabel = screen.getByTitle('backgroundColor');
    const textInput = textLabel.nextElementSibling;
    // Color is the same as the fixture auto backgroundColor
    fireEvent.change(textInput, { target: { value: '#eeeeee' } });
    expect(updateOptionsMock).not.toHaveBeenCalled();
  });

  it('should reset the colors to auto if the colors were manipulated and the reset button is clicked', () => {
    const { updateOptionsMock, options } = renderSettings({
      windowTextOverlayOptions: { visible: true },
    });
    fireEvent.click(screen.getByLabelText('colorPicker'));
    fireEvent.click(screen.getByLabelText('resetTextColors'));
    expect(updateOptionsMock).toHaveBeenCalledWith({
      ...options,
      useAutoColors: true,
      textColor: '#111111',
      bgColor: '#eeeeee',
    });
  });
});
