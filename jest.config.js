// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  collectCoverageFrom: ['src/**/*.js', '!src/locales.js'],
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // Ignore Mirador code from jest transforms
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(mirador|manifesto.js))',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testRegex: '/__tests__/.*\\.(test|spec)\\.[jt]sx?$',
};
