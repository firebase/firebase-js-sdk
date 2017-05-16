var assert = require('chai').assert;
// Partial inclusion is a browser-only feature
var firebase = require('../../../dist/package/app');
var helper = require('./test-helper.js');

describe("Firebase App Only (" + helper.getPackagerName() + ")", function() {
  it("firebase namespace", function() {
    assert.isDefined(firebase);
  });

  it("SDK_VERSION", function() {
    assert.isDefined(firebase.SDK_VERSION);
  });
});
