const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
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
  entry: ['./demo/index.tsx'],
  output: {
    path: root('.'),
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
      },
      {test: /\.scss$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: 'css-loader?sourceMap!sass-loader?sourceMap'})},
      {test: /\.css$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: 'css-loader'})},
      {test: /\.(woff2?|ttf|eot|svg)$/, use: 'url-loader?limit=10000'},
      {test: /bootstrap-sass[\\\/].*\.js/, use: 'imports-loader?jQuery=jquery'}
    ]
  },
  plugins: [
    new ExtractTextPlugin({filename: 'bundle.css', allChunks: true}),
  ]
}
