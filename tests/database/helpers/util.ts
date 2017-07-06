import { globalScope } from "../../../src/utils/globalScope";
import firebase from "../../../src/app";
import '../../../src/database';
import { Reference } from "../../../src/database/api/Reference";
import { Query } from "../../../src/database/api/Query";
import { expect } from "chai";
import { ConnectionTarget } from "../../../src/database/api/test_access";


export const TEST_PROJECT = require('../../config/project.json');

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
export function patchFakeAuthFunctions(app) {
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
export function getRootNode(i?, ref?) {
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
  db = app.database();
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

export function shuffle(arr, randFn?) {
  var randFn = randFn || Math.random;
  for (var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export function testAuthTokenProvider(app) {
  var token_ = null;
  var nextToken_ = null;
  var hasNextToken_ = false;
  var listeners_  = [];

  app['INTERNAL'] = app['INTERNAL'] || {};

  app['INTERNAL']['getToken'] = function(forceRefresh) {
    if (forceRefresh && hasNextToken_) {
      token_ = nextToken_;
      hasNextToken_ = false;
    }
    return Promise.resolve({accessToken: token_});
  };

  app['INTERNAL']['addAuthTokenListener'] = function(listener) {
    var token = token_;
    listeners_.push(listener);
    var async = Promise.resolve();
    async.then(function() {
      listener(token)
    });
  };

  app['INTERNAL']['removeAuthTokenListener'] = function(listener) {
    throw Error('removeAuthTokenListener not supported in testing');
  };

  return {
    setToken: function(token) {
      token_ = token;
      var async = Promise.resolve();
      for (var i = 0; i < listeners_.length; i++) {
        async.then((function(idx) {
          return function() {
            listeners_[idx](token);
          }
        }(i)));
      }

      // Any future thens are guaranteed to be resolved after the listeners have been notified
      return async;
    },
    setNextToken: function(token) {
      nextToken_ = token;
      hasNextToken_ = true;
    }
  };
}

let freshRepoId = 1;
const activeFreshApps = [];

export function getFreshRepo(url, path?) {
  var app = firebase.initializeApp({databaseURL: url}, 'ISOLATED_REPO_' + freshRepoId++);
  patchFakeAuthFunctions(app);
  activeFreshApps.push(app);
  return app.database().ref(path);
}

export function getFreshRepoFromReference(ref) {
  var host = ref.root.toString();
  var path = ref.toString().replace(host, '');
  return getFreshRepo(host, path);
}

// Little helpers to get the currently cached snapshot / value.
export function getSnap(path) {
  var snap;
  var callback = function(snapshot) { snap = snapshot; };
  path.once('value', callback);
  return snap;
};

export function getVal(path) {
  var snap = getSnap(path);
  return snap ? snap.val() : undefined;
};

export function canCreateExtraConnections() {
  return globalScope.MozWebSocket || globalScope.WebSocket;
};

export function buildObjFromKey(key) {
  var keys = key.split('.');
  var obj = {};
  var parent = obj;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    parent[key] = i < keys.length - 1 ? {} : 'test_value';
    parent = parent[key];
  }
  return obj;
};

export function testRepoInfo(url) {
  const regex = /https?:\/\/(.*).firebaseio.com/;
  const match = url.match(regex);
  if (!match) throw new Error('Couldnt get Namespace from passed URL');
  const [,ns] = match;
  return new ConnectionTarget(`${ns}.firebaseio.com`, true, ns, false);
}
