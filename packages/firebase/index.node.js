var firebase = require('@firebase/app').default;
require('./database');
require('./storage');
require('./messaging');

var Storage = require('dom-storage');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

firebase.INTERNAL.extendNamespace({
  INTERNAL: {
    node: {
      localStorage: new Storage(null, { strict: true }),
      sessionStorage: new Storage(null, { strict: true }),
      XMLHttpRequest: XMLHttpRequest
    }
  }
});

module.exports = firebase;
