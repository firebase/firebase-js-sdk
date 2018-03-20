/**
 * Copyright 2018 Google Inc.
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

/**
 * @fileoverview Web worker for Firebase Auth test app application. The
 * web worker tries to run operations on the Auth instance for testing purposes.
 */

importScripts('/dist/firebase-app.js');
importScripts('/dist/firebase-auth.js');
importScripts('config.js');

// Polyfill Promise in case it is not supported.
if (typeof Promise === 'undefined') {
  var Promise = firebase.Promise;
}

// Initialize the Firebase app in the web worker.
firebase.initializeApp(config);

/**
 * Returns a promise that resolves with an ID token if available.
 * @return {!Promise<?string>} The promise that resolves with an ID token if
 *     available. Otherwise, the promise resolves with null.
 */
var getIdToken = function() {
  return new Promise(function(resolve, reject) {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        user.getIdToken().then(function(idToken) {
          resolve(idToken);
        }, function(error) {
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  }).catch(function(error) {
    console.log(error);
  });
};

/**
 * Runs various Firebase Auth tests in a web worker environment and confirms the
 * expected behavior. This is useful for manual testing in different browsers.
 * @param {string} googleIdToken The Google ID token to sign in with.
 * @return {!Promise<void>} A promise that resolves when all tests run
 *     successfully.
 */
var runWorkerTests = function(googleIdToken) {
  var inMemoryPersistence = firebase.auth.Auth.Persistence.NONE;
  var expectedDisplayName = 'Test User';
  var oauthCredential = firebase.auth.GoogleAuthProvider.credential(
      googleIdToken);
  var provider = new firebase.auth.GoogleAuthProvider();
  var OPERATION_NOT_SUPPORTED_CODE =
      'auth/operation-not-supported-in-this-environment';
  var email = 'user' + Math.floor(Math.random() * 10000000000).toString() +
      '@example.com';
  var pass = 'password';
  return firebase.auth().setPersistence(inMemoryPersistence)
      .then(function() {
        firebase.auth().useDeviceLanguage();
        return firebase.auth().signInAnonymously();
      })
      .then(function(user) {
        if (!user.uid) {
          throw new Error('signInAnonymously unexpectedly failed!');
        }
        return user.updateProfile({displayName: expectedDisplayName});
      })
      .then(function() {
        if (firebase.auth().currentUser.displayName != expectedDisplayName) {
          throw new Error('Profile update failed!');
        }
        return firebase.auth().currentUser.delete();
      })
      .then(function() {
        if (firebase.auth().currentUser) {
          throw new Error('currentUser.delete unexpectedly failed!');
        }
        return firebase.auth().createUserWithEmailAndPassword(email, pass);
      })
      .then(function(user) {
        if (user.email != email) {
          throw new Error(
              'createUserWithEmailAndPassword unexpectedly failed!');
        }
        return firebase.auth().fetchProvidersForEmail(email);
      }).then(function(providers) {
        if (providers.length == 0 || providers[0] != 'password') {
          throw new Error('fetchProvidersForEmail failed!');
        }
        return firebase.auth().signInWithEmailAndPassword(email, pass);
      })
      .then(function(user) {
        if (user.email != email) {
          throw new Error('signInWithEmailAndPassword unexpectedly failed!');
        }
        return user.delete();
      })
      .then(function() {
        return firebase.auth().signInWithPopup(provider)
            .catch(function(error) {
              if (error.code != OPERATION_NOT_SUPPORTED_CODE) {
                throw error;
              }
            });
      })
      .then(function() {
        return firebase.auth().signInWithRedirect(provider)
            .catch(function(error) {
              if (error.code != OPERATION_NOT_SUPPORTED_CODE) {
                throw error;
              }
            });
      })
      .then(function() {
        return Promise.resolve().then(function() {
          return new firebase.auth.RecaptchaVerifier('id');
        }).then(function() {
          throw new Error(
              'RecaptchaVerifer instantiation succeeded unexpectedly!');
        }).catch(function(error) {
          if (error.code != OPERATION_NOT_SUPPORTED_CODE) {
            throw error;
          }
        });
      })
      .then(function() {
        return firebase.auth().signInAndRetrieveDataWithCredential(
            oauthCredential);
      })
      .then(function(result) {
        if (!result.user ||
            !result.user.uid ||
            !result.credential ||
            !result.additionalUserInfo) {
          throw new Error(
              'signInAndRetrieveDataWithCredential unexpectedly failed!');
        }
        return firebase.auth().signOut();
      })
      .then(function() {
        if (firebase.auth().currentUser) {
          throw new Error('signOut unexpectedly failed!');
        }
      });
};

/**
 * Handles the incoming message from the main script.
 * @param {!Object} e The message event received.
 */
self.onmessage = function(e) {
  if (e.data && e.data.type) {
    var result = {type: e.data.type};
    switch (e.data.type) {
      case 'GET_USER_INFO':
        getIdToken().then(function(idToken) {
          result.idToken = idToken;
          result.uid = firebase.auth().currentUser &&
              firebase.auth().currentUser.uid;
          self.postMessage(result);
        });
        break;
      case 'RUN_TESTS':
        runWorkerTests(e.data.googleIdToken).then(function() {
          result.status = 'success';
          self.postMessage(result);
        }).catch(function(error) {
          result.status = 'failure';
          // DataCloneError when postMessaging in IE11 and 10.
          result.error = error.code ? error : error.message;
          self.postMessage(result);
        });
        break;
      default:
        self.postMessage({});
    }
  }
};
