const webpack = require('webpack');
const path = require('path');

function root(args) {
  args = Array.prototype.slice.call(arguments, 0);
  return path.join.apply(path, [__dirname].concat(args));
}

module.exports = {
  devtool: 'source-map',
  performance: {
    hints: false
  },
  devServer: {
    contentBase: root('.'),
    watchContentBase: true,
    port: 9005,
    stats: 'errors-only'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  entry: ['./demo/index.ts'],
  output: {
    path: root('demo'),
    filename: 'bundle.js',
    sourceMapFilename: '[file].map'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          'awesome-typescript-loader'
        ]
      }
    ]
  }
}
