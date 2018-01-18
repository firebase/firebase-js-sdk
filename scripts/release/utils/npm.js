const { root } = require('./constants');
const { spawn } = require('child-process-promise');
const { mapPkgNameToPkgPath } = require('./workspace');

exports.publishToNpm = async updates => {
  updates.forEach(async update => {
    const path = await mapPkgNameToPkgPath(update);
    console.log(path);
  });
};
