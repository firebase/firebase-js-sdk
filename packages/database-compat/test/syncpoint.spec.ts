import util from './helpers/syncpoint-util';

describe('Syncpoint Tests', function() {
  var syncPointSpecs = require('./helpers/syncPointSpec.json');
  for (var i = 0; i < syncPointSpecs.length; i++) {
    var spec = syncPointSpecs[i];
    util.defineTest(spec);
  }
});
