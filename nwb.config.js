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
  },
};
