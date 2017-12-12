const { resolve } = require('path');
const webpack = require('webpack');

module.exports = {
  entry: resolve(__dirname, './console.ts'),
  output: {
    path: resolve(__dirname, './dist'),
    filename: 'standalone.js',
    libraryTarget: 'assign',
    library: '__firestore__'
  },
  // Currently we need to add '.ts' to the resolve.extensions array.
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },

  // Add the loader for .ts files.
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            declaration: false
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
  ]
};
