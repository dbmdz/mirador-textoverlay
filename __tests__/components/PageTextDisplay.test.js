import React from 'react';

import {
  describe, it, jest, expect,
} from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import PageTextDisplay from '../../src/components/PageTextDisplay';

import lineFixtures from '../../__fixtures__/lines.json';


/** Render a page overlay to the testing screen */
function renderPage(props = {}, renderFn = render) {
  const pageRef = React.createRef();
  const element = (
    <PageTextDisplay
      ref={pageRef}
      selectable
      visible
      opacity={0.75}
      width={2100}
      height={2970}
      source="http://example.com/page/1"
      lines={lineFixtures.withWords}
      {...props}
    />
  );
  return { ...renderFn(element), ref: pageRef };
}

describe('PageTextDisplay', () => {
  it('should render lines with individual words accurately', () => {
    renderPage();
    const word = screen.getByText('firstWord');
    expect(word).not.toBeNull();
    expect(word).toHaveAttribute('y', '190');
    expect(word).toHaveAttribute('font-size', '120px');
    expect(word).toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.75);');
    expect(screen.getByText('secondWord')).not.toBeNull();
  });

  it('should render lines without individual words accurately', () => {
    renderPage({ lines: lineFixtures.withoutWords });
    const firstLine = screen.getByText('a word on a line');
    expect(firstLine).not.toBeNull();
    expect(firstLine.previousElementSibling).toHaveAttribute('style', 'fill: rgba(255, 255, 255, 0.75);');
    expect(firstLine).toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.75);');
    expect(firstLine).toHaveAttribute('y', '190');
    expect(firstLine).toHaveAttribute('font-size', '120px');
    expect(screen.getByText('another word on another line')).not.toBeNull();
  });

  it('should render invisible lines correctly', () => {
    renderPage({ visible: false });
    expect(screen.getByText('firstWord'))
      .toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0);');
    expect(screen.getByText('secondWord'))
      .toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0);');
  });

  it('should not re-render by itself when the opacity changes', () => {
    const { rerender } = renderPage();
    expect(screen.getByText('firstWord'))
      .toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.75);');
    renderPage({ opacity: 0.25 }, rerender);
    expect(screen.getByText('firstWord'))
      .toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.75);');
  });

  it('should re-render when the source changes', () => {
    const { rerender } = renderPage();
    expect(screen.getByText('firstWord')).not.toBeNull();
    renderPage({ source: 'http://example.com/pages/2', lines: lineFixtures.withoutWords, opacity: 0.25 }, rerender);
    expect(screen.getByText('a word on a line'))
      .toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.25);');
  });

  it('should correctly apply transformations to svg container', () => {
    const { ref } = renderPage();
    // FIXME: We should be able to use the container provided by RTL for this,
    //        but its transform style remains empty after calling updateTransforms
    //        for some mysterious reason :-/
    const container = ref.current.containerRef.current;
    expect(container.style.transform).toEqual('');
    ref.current.updateTransforms(0.5, 200, 600);
    expect(container.style.transform).toEqual('translate(-625px, -1042.5px) scale(0.5)');
  });

  it('should correctly set opacity to all rect and text elements', () => {
    const { ref } = renderPage({ lines: lineFixtures.withoutWords });
    const firstLine = screen.getByText('a word on a line');
    expect(firstLine.previousElementSibling).toHaveAttribute('style', 'fill: rgba(255, 255, 255, 0.75);');
    expect(firstLine).toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.75);');
    ref.current.updateOpacity(0.25);
    expect(firstLine.previousElementSibling).toHaveAttribute('style', 'fill: rgba(255, 255, 255, 0.25);');
    expect(firstLine).toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.25);');
  });

  it('should render text invisible if visibility is disabled', () => {
    const { rerender } = renderPage({ lines: lineFixtures.withoutWords });
    const firstLine = screen.getByText('a word on a line');
    expect(firstLine.previousElementSibling).toHaveAttribute('style', 'fill: rgba(255, 255, 255, 0.75);');
    expect(firstLine).toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0.75);');
    renderPage({ visible: false, lines: lineFixtures.withoutWords }, rerender);
    expect(firstLine.previousElementSibling).toHaveAttribute('style', 'fill: rgba(255, 255, 255, 0);');
    expect(firstLine).toHaveAttribute('style', 'fill: rgba(0, 0, 0, 0);');
  });

  it('should prevent events from propagating to upper layers if selectability is enabled', () => {
    const topCallback = jest.fn();
    const { rerender, container } = renderPage({ selectable: false });
    container.addEventListener('pointerdown', topCallback);
    const firstLine = screen.getByText('firstWord');
    fireEvent.pointerDown(firstLine);
    expect(topCallback).toHaveBeenCalled();
    topCallback.mockClear();
    renderPage({ selectable: true }, rerender);
    fireEvent.pointerDown(firstLine);
    expect(topCallback).not.toHaveBeenCalled();
  });
});
