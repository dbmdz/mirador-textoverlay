/** Helper function to match against an elements inner text */
export function svgTextMatcher(text) {
  return (content, element) => {
    if (element.tagName === 'text') {
      const elementText = Array.from(element.querySelectorAll('tspan'))
        .map((el) => el.textContent)
        .join('');
      return elementText.trimEnd() === text;
    }
    return false;
  };
}
