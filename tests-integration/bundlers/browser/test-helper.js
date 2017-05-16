// Detect which packager is in use for this module.
function isNode() {
  return typeof window === 'undefined';
}

function getPackagerName() {
  if (isNode()) {
    return 'Node';
  }

  if (typeof __webpack_require__ !== 'undefined') {
    return 'WebPack';
  }

  return 'Browserify';
}

exports.isNode = isNode;
exports.getPackagerName = getPackagerName;
