const path = require("path");

module.exports = {
  entry: {
    main: "./src/main.js",
    PhonePeer: "./src/PhonePeer.js",
    ExperimentPeer: "./src/ExperimentPeer.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: "virtualKeypad",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
            },
          },
        ],
      },
      {
        // If you have .mjs files, use test: /\.m?js$/,
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            // You can also move this config into a separate .babelrc or babel.config.js file
            presets: [
              [
                "@babel/preset-env",
                {
                  // Adjust your target browsers as needed
                  targets: {
                    ios: "12",
                  },
                  // This config tells Babel to automatically include necessary polyfills
                  // for features you use, referencing core-js where needed
                  useBuiltIns: "usage",
                  corejs: "3",
                },
              ],
            ],
          },
        },
      },
    ],
  },
};
