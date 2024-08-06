const moduleFormatMap = {
  cjs: 'commonjs',
  es: false,
};

module.exports = (api) => ({
  presets: [
    api.env('test') && [
      '@babel/preset-env',
      {
        modules: 'commonjs',
        targets: {
          node: 'current',
        },
      },
    ],
    (api.env('production') || api.env('development')) && [
      '@babel/preset-env',
      {
        corejs: 3,
        exclude: ['transform-typeof-symbol'],
        forceAllTransforms: true,
        modules: moduleFormatMap[process.env.MODULE_FORMAT] || false,
        useBuiltIns: 'entry',
      },
    ],
    [
      '@babel/preset-react',
      {
        development: api.env('development') || api.env('test'),
        runtime: 'automatic',
        useBuiltIns: true,
      },
    ],
  ].filter(Boolean),
  plugins: [
    'babel-plugin-macros',
    '@babel/plugin-transform-destructuring',
    [
      '@babel/plugin-proposal-class-properties',
      {
        loose: true,
      },
    ],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    [
      '@babel/plugin-proposal-object-rest-spread',
      {
        useBuiltIns: true,
      },
    ],
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: false,
        helpers: false, // Needed to support IE/Edge
        regenerator: true,
      },
    ],
    [
      '@babel/plugin-transform-regenerator',
      {
        async: false,
      },
    ],
    ['transform-react-remove-prop-types',
      {
        ignoreFilenames: ['node_modules'],
        removeImport: true,
      },
    ],
    [
      '@emotion',
      {
        importMap: {
          '@mui/system': {
            styled: {
              canonicalImport: ['@emotion/styled', 'default'],
              styledBaseImport: ['@mui/system', 'styled'],
            },
          },
          '@mui/material/styles': {
            styled: {
              canonicalImport: ['@emotion/styled', 'default'],
              styledBaseImport: ['@mui/material/styles', 'styled'],
            },
          },
        },
      },
    ],
  ].filter(Boolean),
});
