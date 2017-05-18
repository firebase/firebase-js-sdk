var assert = require('chai').assert;
// Partial inclusion is a browser-only feature
var firebase = require('../../../dist/package/app');
var helper = require('./test-helper.js');

describe("Lazy Firebase App (" + helper.getPackagerName() + ")", function() {
  it("firebase namespace", function() {
    assert.isDefined(firebase);
  });

  it("SDK_VERSION", function() {
    assert.isDefined(firebase.SDK_VERSION);
  });

  it('Should allow for lazy component init', function() {
    assert.isUndefined(firebase.database);
    firebase.initializeApp({});
    require('../../../dist/package/database');
    assert.isDefined(firebase.database);
  });
});
