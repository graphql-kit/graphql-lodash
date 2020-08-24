const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  devtool: 'source-map',
  devServer: {
    contentBase: __dirname,
    watchContentBase: true,
    port: 9005,
  },
  entry: './demo/index.tsx',
  plugins: [new MiniCssExtractPlugin({ filename: 'bundle.css' })],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { importLoaders: 1 } },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.mjs', '.js'],
  },
  output: {
    path: __dirname,
    filename: 'bundle.js',
    sourceMapFilename: '[file].map'
  },
};
