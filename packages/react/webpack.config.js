const path = require('path');
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'vista.react.js',
    library: 'vista',
    libraryTarget: 'umd',
    clean: true
  },
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /(node_modules)/,
      use: 'babel-loader',
    }],
  },
 externals: {
    antd: 'antd',
    dom: 'react-router-dom',
    react: 'react'
  },
};