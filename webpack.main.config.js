const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  externals: {
    'sql.js': 'commonjs sql.js'
  },
  resolve: {
    extensions: ['.js', '.json', '.node'],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'assets'),
          to: path.resolve(__dirname, '.webpack/assets'),
          noErrorOnMissing: false,
        },
      ],
    }),
  ],
};
