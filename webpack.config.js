const path = require('path');

module.exports = {
  devtool: 'source-map',
  entry: ['./src/index.ts'],
  resolve: {
    extensions: ['.tsx', '.ts', '.mjs', '.js'],
  },
  output: {
    path: path.join(__dirname, 'lib'),
    filename: 'graphql-lodash.bundle.js',
    sourceMapFilename: '[file].map',
    library: 'GQLLodash',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  }
}
