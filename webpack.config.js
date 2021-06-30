const webpack = require('webpack')

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    path: `${__dirname}/dist`,
    filename: '[name].js',
    library: 'virtualKeypad',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      { test: /\.css$/, 
        use: [ 'style-loader', 'css-loader', ],
      },
    ],
  },
};
