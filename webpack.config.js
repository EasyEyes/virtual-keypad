const webpack = require('webpack')

module.exports = {
  entry: {
    receiver: './src/receiver.js',
  },
  output: {
    path: `${__dirname}/dist`,
    filename: '[name].js',
    library: 'keypad-receiver',
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
