import React from 'react';
import {
  describe, it, jest, expect,
} from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import CanvasWorld from 'mirador/dist/es/src/lib/CanvasWorld';

import MiradorTextOverlay from '../../src/components/MiradorTextOverlay';

const mockOsd = jest.fn().mockImplementation(() => ({
  addHandler: jest.fn(),
  canvas: null, // TODO: Should be an element we can mount into
  viewport: {
    getBounds: jest.fn(),
    getZoom: jest.fn(),
  },
  world: {
    getItemAt: jest.fn(),
    getItemCount: jest.fn(),
  },
}));

/** Render overlay with props */
function renderOverlay(props = {}, renderFn = render) {
  return renderFn(
    <MiradorTextOverlay
      enabled
      visible
      selectable
      opacity={0.75}
      pageTexts={[]}
      canvasWorld={new CanvasWorld([])}
      viewer={mockOsd()}
    />,
  );
}

describe('MiradorTextOverlay', () => {
  it('should not render when it is disabled', () => {
    const { container } = renderOverlay({ enabled: false });
    expect(container).toBeEmptyDOMElement();
  });
});
