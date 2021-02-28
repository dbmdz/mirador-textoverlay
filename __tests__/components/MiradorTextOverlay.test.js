/* eslint-disable require-jsdoc */
import React from 'react';
import { describe, it, jest, expect } from '@jest/globals';
import { render, queryByText, getByText } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

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

  viewport = {
    getBounds: jest.fn(() => ({ x: -10, y: -20 })),
    getFlip: jest.fn(() => false),
    getZoom: jest.fn(() => 1.33),
    getRotation: jest.fn(() => 0),
  };

  world = {
    getItemAt: jest.fn(() => this.image),
    getItemCount: jest.fn(() => 2),
  };

  container = {
    clientWidth: 444,
    clientHeight: 555,
  };
}

const mockCanvasWorld = {
  canvasDimensions: [
    { width: 200, height: 200 },
    { width: 200, height: 200 },
  ],
};

/** Render overlay with props */
function renderOverlay(props = {}, renderFn = render) {
  const viewer = new MockOpenSeadragon();
  const ref = React.createRef();
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

  it('should correctly update the scale and positions of the overlay container when OSD updates', () => {
    const {
      props: { viewer },
    } = renderOverlay({ pageTexts });
    viewer.handlers['update-viewport']();
    const overlays = Array.of(...viewer.canvas.querySelectorAll('div > svg:first-of-type')).map(
      (e) => e.parentElement
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
    viewer.viewport.getFlip.mockReturnValue(false);
    viewer.viewport.getRotation.mockReturnValue(180);
    viewer.handlers['update-viewport']();
    expect(ref.current.containerRef.current).toHaveStyle({
      transform: 'translate(444px, 555px) rotate(180deg)',
    });
    viewer.viewport.getRotation.mockReturnValue(270);
    viewer.handlers['update-viewport']();
    expect(ref.current.containerRef.current).toHaveStyle({
      transform: 'translate(0px, 555px) rotate(270deg)',
    });
    viewer.viewport.getFlip.mockReset();
    viewer.viewport.getRotation.mockReset();
  });

  it('should update colors if visibility is changed', () => {
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
    expect(getByText(props.viewer.canvas, 'a word on a line')).toHaveStyle({
      fill: 'rgba(17, 18, 34, 0.75)',
    });
    expect(getByText(props.viewer.canvas, 'firstWord').parentElement).toHaveStyle({
      fill: 'rgba(34, 35, 51, 0.75)',
    });
  });
});
