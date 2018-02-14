const admin = require('firebase-admin');
const request = require('request-promise');
const errors = require('request-promise/errors');
const fs = require('fs');

const DBURL = "http://localhost:9000";

class FakeCredentials {
  getAccessToken() {
    return Promise.resolve({
      expires_in: 1000000,
      access_token: "owner"
    });
  }
  getCertificate() {
    return null;
  }
};

export function apps() {
  return admin.apps;
}

export function initializeTestApp(options) {
  // if options.auth is not present, we will construct an app with auth == null
  return admin.initializeApp({
    credential: new FakeCredentials(),
    databaseURL: DBURL + "?ns=" + options.databaseName,
    databaseAuthVariableOverride: options.auth || null
  }, "app-" + (new Date().getTime() + Math.random()));
}

export function initializeAdminApp(options) {
  return admin.initializeApp({
    credential: new FakeCredentials(),
    databaseURL: DBURL + "?ns=" + options.databaseName
  }, "app-" + (new Date().getTime() + Math.random()));
}

export function loadRules(options) {
  return fs.createReadStream(options.rulesPath)
    .pipe(request({
      uri: DBURL + "/.settings/rules.json?ns=" + options.databaseName,
      method: 'PUT',
      headers: { "Authorization": "Bearer owner" }
    }))
    .catch(function (err) {
      throw new Error("could not load rules: " + err);
    });
}

export function assertFails(pr) {
  return pr.then(v => Promise.reject(new Error("Expected request to fail, but it succeeded.")), err => err);
}

export function assertSucceeds(pr) {
  return pr;
}
