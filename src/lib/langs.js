/* eslint-disable require-jsdoc,max-classes-per-file */
const DefaultScript = {
  name: 'default',

  /// Pattern to match the script's character range(s)
  pattern: /^$/,

  /// Multiply a line's height by this factor to get the font size in pixels
  fontSizeFactor: 1,

  /// Reading direction
  direction: 'ltr',

  /// Factor to multiply line height by to get a fallback baseline y-position
  baselineFactor: 0.75,

  /// SVG baseline value, i.e. how text is placed on the baseline
  baseline: 'auto',

  /// Ratio of characters needed for a string to be considered to be in a script
  detectionThreshold: 0.5,

  isScript(text) {
    if (!this.pattern.test(text)) {
      return 0.0;
    }
    const charsTotal = text.length;
    return [...text].filter((c) => this.pattern.test(c)).length / charsTotal;
  },
};

const Hebrew = {
  ...DefaultScript,
  name: 'hebrew',
  pattern: /[\u0590-\u05FF]/,
  fontSizeFactor: 0.35,
  baselineFactor: 0.15,
  direction: 'rtl',
  baseline: 'hanging',
};

const Arabic = {
  ...DefaultScript,
  name: 'arabic',
  pattern: new RegExp(
    [
      '[\u0600-\u06ff]', // Arabic
      '[\u0750-\u077f]',
      '[\ufb50-\ufbc1]',
      '[\ufbd3-\ufd3f]',
      '[\ufd50-\ufd8f]',
      '[\ufd92-\ufdc7]',
      '[\ufe70-\ufefc]',
      '[\uFDF0-\uFDFD]',
    ].join('|')
  ),
  fontSizeFactor: 0.35,
  baselineFactor: 0.65,
  direction: 'rtl',
  baseline: 'middle',
};

export function determineScriptParams(text) {
  return [Hebrew, Arabic].find((s) => s.isScript(text) > s.detectionThreshold) ?? DefaultScript;
}
