const path = require('path');
const frontendSrc = path.resolve(__dirname, '../frontend/src');

module.exports = {
  resolve: {
    alias: {
      '@': frontendSrc
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
};
