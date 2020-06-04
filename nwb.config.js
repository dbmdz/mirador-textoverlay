module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: {
      global: 'MiradorTextDisplay',
      externals: {
        react: 'React'
      }
    }
  }
}
