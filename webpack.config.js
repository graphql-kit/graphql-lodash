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
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  entry: ['./src/index.ts'],
  output: {
    path: root('lib'),
    filename: 'graphql-lodash.bundle.js',
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
