/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

declare var MozWebSocket: WebSocket;

import firebase from '@firebase/app';
import '../../index';
import { Reference } from '../../src/api/Reference';
import { Query } from '../../src/api/Query';
import { ConnectionTarget } from '../../src/api/test_access';
import { RepoInfo } from "../../src/core/RepoInfo";

export const TEST_PROJECT = require('../../../../config/project.json');

const qs = {};
if ('location' in this) {
  const search = (this.location.search.substr(1) || '').split('&');
  for (let i = 0; i < search.length; ++i) {
    const parts = search[i].split('=');
    qs[parts[0]] = parts[1] || true; // support for foo=
  }
}

let numDatabases = 0;

/**
 * Fake Firebase App Authentication functions for testing.
 * @param {!FirebaseApp} app
 * @return {!FirebaseApp}
 */
export function patchFakeAuthFunctions(app) {
  const token_ = null;

  app['INTERNAL'] = app['INTERNAL'] || {};

  app['INTERNAL']['getToken'] = function(forceRefresh) {
    return Promise.resolve(token_);
  };

  app['INTERNAL']['addAuthTokenListener'] = function(listener) {};

  app['INTERNAL']['removeAuthTokenListener'] = function(listener) {};

  return app;
}

/**
 * Gets or creates a root node to the test namespace. All calls sharing the
 * value of opt_i will share an app context.
 * @param {number=} i
 * @param {string=} ref
 * @return {Reference}
 */
export function getRootNode(i = 0, ref?: string) {
  if (i + 1 > numDatabases) {
    numDatabases = i + 1;
  }
  let app;
  let db;
  try {
    app = firebase.app('TEST-' + i);
  } catch (e) {
    app = firebase.initializeApp(
      { databaseURL: TEST_PROJECT.databaseURL },
      'TEST-' + i
    );
    patchFakeAuthFunctions(app);
  }
  db = app.database();
  return db.ref(ref);
}

/**
 * Create multiple refs to the same top level
 * push key - each on it's own Firebase.Context.
 * @param {int=} numNodes
 * @return {Reference|Array<Reference>}
 */
export function getRandomNode(numNodes?): Reference | Array<Reference> {
  if (numNodes === undefined) {
    return <Reference>getRandomNode(1)[0];
  }

  let child;
  const nodeList = [];
  for (let i = 0; i < numNodes; i++) {
    const ref = getRootNode(i);
    if (child === undefined) {
      child = ref.push().key;
    }

    nodeList[i] = ref.child(child);
  }

  return <Array<Reference>>nodeList;
}

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

export function shuffle(arr, randFn = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randFn() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export function testAuthTokenProvider(app) {
  let token_ = null;
  let nextToken_ = null;
  let hasNextToken_ = false;
  const listeners_ = [];

  app['INTERNAL'] = app['INTERNAL'] || {};

  app['INTERNAL']['getToken'] = function(forceRefresh) {
    if (forceRefresh && hasNextToken_) {
      token_ = nextToken_;
      hasNextToken_ = false;
    }
    return Promise.resolve({ accessToken: token_ });
  };

  app['INTERNAL']['addAuthTokenListener'] = function(listener) {
    const token = token_;
    listeners_.push(listener);
    const async = Promise.resolve();
    async.then(function() {
      listener(token);
    });
  };

  app['INTERNAL']['removeAuthTokenListener'] = function(listener) {
    throw Error('removeAuthTokenListener not supported in testing');
  };

  return {
    setToken: function(token) {
      token_ = token;
      const async = Promise.resolve();
      for (let i = 0; i < listeners_.length; i++) {
        async.then(
          (function(idx) {
            return function() {
              listeners_[idx](token);
            };
          })(i)
        );
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
  const app = firebase.initializeApp(
    { databaseURL: url },
    'ISOLATED_REPO_' + freshRepoId++
  );
  patchFakeAuthFunctions(app);
  activeFreshApps.push(app);
  return (app as any).database().ref(path);
}

export function getFreshRepoFromReference(ref) {
  const host = ref.root.toString();
  const path = ref.toString().replace(host, '');
  return getFreshRepo(host, path);
}

// Little helpers to get the currently cached snapshot / value.
export function getSnap(path) {
  let snap;
  const callback = function(snapshot) {
    snap = snapshot;
  };
  path.once('value', callback);
  return snap;
}

export function getVal(path) {
  const snap = getSnap(path);
  return snap ? snap.val() : undefined;
}

export function canCreateExtraConnections() {
  return typeof MozWebSocket !== 'undefined' || typeof WebSocket !== 'undefined';
}

export function buildObjFromKey(key) {
  const keys = key.split('.');
  const obj = {};
  let parent = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    parent[key] = i < keys.length - 1 ? {} : 'test_value';
    parent = parent[key];
  }
  return obj;
}

export function testRepoInfo(url) {
  const regex = /https?:\/\/(.*).firebaseio.com/;
  const match = url.match(regex);
  if (!match) throw new Error('Couldnt get Namespace from passed URL');
  const [, ns] = match;
  return new ConnectionTarget(`${ns}.firebaseio.com`, true, ns, false);
}
