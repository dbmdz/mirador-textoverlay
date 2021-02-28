/* eslint-disable no-param-reassign, require-jsdoc */
const path = require('path');

module.exports = {
  npm: {
    esModules: true,
    umd: {
      externals: {
        react: 'React',
      },
      global: 'MiradorTextOverlay',
    },
  },
  type: 'react-component',
  webpack: {
    aliases: {
      '@material-ui/core': path.resolve('./', 'node_modules', '@material-ui/core'),
      '@material-ui/styles': path.resolve('./', 'node_modules', '@material-ui/styles'),
      react: path.resolve('./', 'node_modules', 'react'),
      'react-dom': path.resolve('./', 'node_modules', 'react-dom'),
    },
    config: (config) => {
      // config.entry = './src/index';
      config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx'];
      config.module.rules.push({
        test: /\.tsx?$/,
        loader: 'babel-loader',
      });
      return config;
    },
  },
};
