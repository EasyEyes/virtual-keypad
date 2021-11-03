const webpack = require('webpack')

module.exports = {
  // mode: 'production',
  entry: './src/main.ts',
  module: {
    rules: [
      { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
      { test: /\.js$/, use: "source-map-loader"},
      { test: /\.css$/, 
        use: [ 'style-loader', 'css-loader', ],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }
        ],
      },
    ]
  },
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    path: `${__dirname}/dist`,
    filename: '[name].js',
    library: 'virtualKeypad',
    libraryTarget: 'umd',
  },
};
