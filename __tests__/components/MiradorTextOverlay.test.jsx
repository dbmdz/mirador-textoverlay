/* eslint-disable require-jsdoc */
import React from 'react';
import { render, queryByText, getByText, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MiradorTextOverlay from '../../src/components/MiradorTextOverlay';

import lineFixtures from '../../__fixtures__/lines.json';

const pageTexts = [
  {
    source: 'lines',
    lines: lineFixtures.withoutSpans,
    width: 200,
    height: 200,
    textColor: '#111222',
    bgColor: '#eeeddd',
  },
  {
    source: 'words',
    lines: lineFixtures.withSpans,
    width: 200,
    height: 200,
    textColor: '#222333',
    bgColor: '#444555',
  },
];

class MockOpenSeadragon {
  canvas = (() => {
    const canv = document.createElement('div');
    canv.className = 'openseadragon-canvas';
    // Mocked Annotation overlay
    canv.innerHTML =
      '<div style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;"><canvas width="500" height="500"></div>';
    return canv;
  })();

  handlers = {};

  image = {
    source: { dimensions: { x: 300, y: 300 } },
    viewportToImageZoom: (x) => x,
  };

  addHandler = (evt, handler) => {
    this.handlers[evt] = handler;
  };

  removeHandler = vi.fn((evt, handler) => {
    if (this.handlers[evt] === handler) {
      delete this.handlers[evt];
    }
  });

  viewport = {
    getBounds: vi.fn(() => ({ x: -10, y: -20 })),
    getFlip: vi.fn(() => false),
    getZoom: vi.fn(() => 1.33),
    getRotation: vi.fn(() => 0),
  };

  world = {
    getItemAt: vi.fn(() => this.image),
    getItemCount: vi.fn(() => 2),
  };

  container = {
    clientWidth: 444,
    clientHeight: 555,
  };
}

const mockCanvasWorld = {
  canvasIds: ['canvasA', 'canvasB'],
  canvasDimensions: [
    { x: 0, y: 0, width: 200, height: 200 },
    { x: 200, y: 0, width: 200, height: 200 },
  ],
};

/** Render overlay with props */
function renderOverlay(props = {}, renderFn = render, ref = React.createRef()) {
  const viewer = props.viewer ?? new MockOpenSeadragon();
  if (!viewer.canvas.parentElement) {
    document.body.appendChild(viewer.canvas);
  }
  const renderProps = {
    enabled: true,
    visible: true,
    selectable: true,
    opacity: 0.75,
    pageTexts: [],
    canvasWorld: mockCanvasWorld,
    viewer,
    ...props,
  };
  const res = renderFn(<MiradorTextOverlay ref={ref} {...renderProps} />);
  return {
    ref,
    props: renderProps,
    ...res,
  };
}

function getPageOverlay(canvas, text) {
  return getByText(canvas, text).closest('svg').parentElement;
}

describe('MiradorTextOverlay', () => {
  it('should not render when it is disabled', () => {
    const {
      props: { viewer },
    } = renderOverlay({ enabled: false });
    expect(viewer.canvas.querySelector('svg')).toBeNull();
  });

  it("should render a page overlay for every page next to the viewer's canvas", () => {
    const {
      props: { viewer },
    } = renderOverlay({ pageTexts });
    expect(viewer.handlers['update-viewport']).not.toBeUndefined();
    expect(viewer.canvas).not.toBeEmptyDOMElement();
    const firstLine = queryByText(viewer.canvas, 'a word on a line');
    expect(firstLine).not.toBeNull();
    const firstWord = queryByText(viewer.canvas, 'firstWord');
    expect(firstWord).not.toBeNull();

    // Text should be invisible before the first update
    expect(firstLine).not.toBeVisible();
    expect(firstWord).not.toBeVisible();
  });

  it('should register viewport updates when enabled after mount', () => {
    const viewer = new MockOpenSeadragon();
    const { rerender } = renderOverlay({ enabled: false, pageTexts, viewer });
    expect(viewer.handlers['update-viewport']).toBeUndefined();

    renderOverlay({ enabled: true, pageTexts, viewer }, rerender);

    expect(viewer.handlers['update-viewport']).toBeDefined();
  });

  it('should correctly update the scale and positions of the overlay container when OSD updates', () => {
    const {
      props: { viewer },
    } = renderOverlay({ pageTexts });
    viewer.handlers['update-viewport']();
    const overlays = Array.of(...viewer.canvas.querySelectorAll('div > svg:first-of-type')).map(
      (e) => e.parentElement,
    );
    expect(overlays[0]).toHaveStyle({
      transform: 'translate(52.95000000000001px, 72.9px) scale(1.33)',
    });
    expect(overlays[1]).toHaveStyle({
      transform: 'translate(451.95000000000005px, 72.9px) scale(1.33)',
    });
    expect(overlays[0].parentElement.style.transform).toHaveLength(0);
  });

  it("should correctly patch the annotation overlay's style if present", () => {
    // eslint-disable-next-line prefer-const
    const { rerender, props } = renderOverlay({ pageTexts });
    let { viewer } = props;
    let annoOverlay = viewer.canvas.querySelector('canvas').parentElement;
    // NOTE: It would be better to test this from more of a user's perspective instead
    //       of simply asserting on the CSS styles, but I couldn't get this to work with
    //       jsdom :-/
    expect(annoOverlay).toHaveStyle({
      zIndex: 100,
      pointerEvents: 'none',
    });
    viewer = renderOverlay({ pageTexts, selectable: false }, rerender).props.viewer;
    annoOverlay = viewer.canvas.querySelector('canvas').parentElement;
    expect(annoOverlay).not.toHaveStyle({ pointerEvents: 'none' });
  });

  it('should correctly track and mirror flips and rotations on OSD', () => {
    const {
      ref,
      props: { viewer },
    } = renderOverlay({ pageTexts });
    viewer.viewport.getFlip.mockReturnValue(true);
    viewer.viewport.getRotation.mockReturnValue(90);
    viewer.handlers['update-viewport']();
    expect(ref.current.containerRef.current).toHaveStyle({
      transform: 'translate(444px, 0px) scale(-1, 1) translate(444px, 0px) rotate(90deg)',
    });
    viewer.viewport.getFlip.mockReset();
    viewer.viewport.getFlip.mockReturnValue(false);
    viewer.viewport.getRotation.mockReset();
    viewer.viewport.getRotation.mockReturnValue(180);
    viewer.handlers['update-viewport']();
    expect(ref.current.containerRef.current).toHaveStyle({
      transform: 'translate(444px, 555px) rotate(180deg)',
    });
    viewer.viewport.getRotation.mockReset();
    viewer.viewport.getRotation.mockReturnValue(270);
    viewer.handlers['update-viewport']();
    expect(ref.current.containerRef.current).toHaveStyle({
      transform: 'translate(0px, 555px) rotate(270deg)',
    });
    viewer.viewport.getFlip.mockReset();
    viewer.viewport.getRotation.mockReset();
  });

  it('should update colors if visibility is changed', async () => {
    let props = {
      pageTexts,
      visible: false,
      useAutoColors: true,
    };
    const { rerender, props: renderProps } = renderOverlay(props);
    props = renderProps;
    expect(getByText(props.viewer.canvas, 'a word on a line')).toHaveStyle({
      fill: 'rgba(17, 18, 34, 0)',
    });
    expect(getByText(props.viewer.canvas, 'firstWord').parentElement).toHaveStyle({
      fill: 'rgba(34, 35, 51, 0)',
    });
    renderOverlay({ ...props, visible: true }, rerender);
    await waitFor(() =>
      expect(getByText(props.viewer.canvas, 'a word on a line')).toHaveStyle({
        fill: 'rgba(17, 18, 34, 0.75)',
      }),
    );
    expect(getByText(props.viewer.canvas, 'firstWord').parentElement).toHaveStyle({
      fill: 'rgba(34, 35, 51, 0.75)',
    });
  });

  it('should unregister viewport updates when unmounting', () => {
    const viewer = new MockOpenSeadragon();
    const { unmount } = renderOverlay({ pageTexts, viewer });
    const handler = viewer.handlers['update-viewport'];

    expect(handler).toBeDefined();

    unmount();

    expect(viewer.removeHandler).toHaveBeenCalledWith('update-viewport', handler);
    expect(viewer.handlers['update-viewport']).toBeUndefined();
  });

  it('should update overlay positions when the canvas world changes but the rendered text count stays the same', async () => {
    const viewer = new MockOpenSeadragon();
    viewer.world.getItemCount.mockReturnValue(1);
    const singleCanvasWorld = {
      canvasIds: ['canvasA'],
      canvasDimensions: [{ x: 0, y: 0, width: 200, height: 200 }],
    };
    const singlePageTexts = [pageTexts[0]];
    const { rerender } = renderOverlay({
      canvasWorld: singleCanvasWorld,
      pageTexts: singlePageTexts,
      viewer,
    });

    viewer.handlers['update-viewport']();
    let overlays = Array.of(...viewer.canvas.querySelectorAll('div > svg:first-of-type')).map(
      (e) => e.parentElement,
    );
    expect(overlays[0]).toHaveStyle({
      transform: 'translate(52.95000000000001px, 72.9px) scale(1.33)',
    });

    viewer.world.getItemCount.mockReturnValue(2);
    renderOverlay({ canvasWorld: mockCanvasWorld, pageTexts: [undefined, pageTexts[0]], viewer }, rerender);
    await waitFor(() => {
      overlays = Array.of(...viewer.canvas.querySelectorAll('div > svg:first-of-type')).map(
        (e) => e.parentElement,
      );
      expect(overlays[0]).toHaveStyle({
        transform: 'translate(451.95000000000005px, 72.9px) scale(1.33)',
      });
    });
  });

  it('should keep the original canvas overlay moving after switching from single to book view', async () => {
    const viewer = new MockOpenSeadragon();
    viewer.world.getItemCount.mockReturnValue(1);
    const singleCanvasWorld = {
      canvasIds: ['canvasA'],
      canvasDimensions: [{ x: 0, y: 0, width: 200, height: 200 }],
    };
    const { rerender } = renderOverlay({
      canvasWorld: singleCanvasWorld,
      pageTexts: [pageTexts[0]],
      viewer,
    });

    viewer.handlers['update-viewport']();
    let oldPageOverlay = getPageOverlay(viewer.canvas, 'a word on a line');
    expect(oldPageOverlay).toHaveStyle({
      transform: 'translate(52.95000000000001px, 72.9px) scale(1.33)',
    });

    viewer.world.getItemCount.mockReturnValue(1);
    renderOverlay({ canvasWorld: mockCanvasWorld, pageTexts: [pageTexts[1], pageTexts[0]], viewer }, rerender);

    await waitFor(() => {
      oldPageOverlay = getPageOverlay(viewer.canvas, 'a word on a line');
      expect(oldPageOverlay).toHaveStyle({
        transform: 'translate(451.95000000000005px, 72.9px) scale(1.33)',
      });
    });

    viewer.viewport.getBounds.mockReturnValue({ x: -20, y: -20 });
    viewer.handlers['update-viewport']();
    oldPageOverlay = getPageOverlay(viewer.canvas, 'a word on a line');
    expect(oldPageOverlay).toHaveStyle({
      transform: 'translate(471.90000000000003px, 72.9px) scale(1.33)',
    });
  });
});
