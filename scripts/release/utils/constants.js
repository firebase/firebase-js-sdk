const { dirname, resolve } = require('path');
exports.root = dirname(resolve(__dirname, '../../../package.json'));
