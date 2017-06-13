import firebase from "../../src/app";
import { Reference } from "../../src/database/api/Reference";
import { Query } from "../../src/database/api/Query";
import { expect } from "chai";

const TEST_PROJECT = require('../config/project.json');

var qs = {};
if ('location' in this) {
  var search = (this.location.search.substr(1) || '').split('&');
  for (var i = 0; i < search.length; ++i) {
    var parts = search[i].split('=');
    qs[parts[0]] = parts[1] || true;  // support for foo=
  }
}

let numDatabases = 0;

/**
 * Fake Firebase App Authentication functions for testing.
 * @param {!FirebaseApp} app
 * @return {!FirebaseApp}
 */
function patchFakeAuthFunctions(app) {
  var token_ = null;

  app['INTERNAL'] = app['INTERNAL'] || {};

  app['INTERNAL']['getToken'] = function(forceRefresh) {
    return Promise.resolve(token_);
  };

  app['INTERNAL']['addAuthTokenListener'] = function(listener) {
  };

  app['INTERNAL']['removeAuthTokenListener'] = function(listener) {
  };

  return app;
};

/**
 * Gets or creates a root node to the test namespace. All calls sharing the
 * value of opt_i will share an app context.
 * @param {=} opt_i
 * @param {string=} opt_ref
 * @return {Firebase}
 */
function getRootNode(i?, ref?) {
  if (i === undefined) {
    i = 0;
  }
  if (i + 1 > numDatabases) {
    numDatabases = i + 1;
  }
  var app;
  var db;
  try {
    app = firebase.app("TEST-" + i);
  } catch(e) {
    app = firebase.initializeApp({ databaseURL: TEST_PROJECT.databaseURL }, "TEST-" + i);
    patchFakeAuthFunctions(app);
  }
  db = /** @type {fb.api.Database} */ (app['database']());
  return db.ref(ref);
};

/**
 * Create multiple refs to the same top level
 * push key - each on it's own Firebase.Context.
 * @param {int=} opt_numNodes
 * @return {Firebase|Array<Firebase>}
 */
export function getRandomNode(numNodes?): Reference | Array<Reference> {
  if (numNodes === undefined) {
    return <Reference>getRandomNode(1)[0];
  }

  var child;
  var nodeList = [];
  for (var i = 0; i < numNodes; i++) {
    var ref = getRootNode(i);
    if (child === undefined) {
      child = ref.push().key;
    }

    nodeList[i] = ref.child(child);
  }

  return <Array<Reference>>nodeList;
};

export function getQueryValue(query: Query) {
  return query.once('value').then(snap => snap.val());
}

export function pause(milliseconds: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), milliseconds);
  });
}

export function getPath(query: Query) {
  return query.toString().replace(TEST_PROJECT.databaseURL, '');
}

export function runs() {}
export function waitsFor() {}