/**
 * @license
 * Copyright 2021 Google LLC
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

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/analytics';
import 'firebase/compat/app-check';
import 'firebase/compat/functions';
import 'firebase/compat/storage';
import 'firebase/compat/firestore';
import 'firebase/compat/messaging';
import 'firebase/compat/performance';
import 'firebase/compat/database';
import { config, testAccount } from '../firebase-config';

/**
 * Quick sample app to debug and explore basic Firebase API usage/problems.
 */

/**
 * Auth smoke test.
 *
 * Login with email and password. Account must exist. Should set up
 * test project rules to only allow read/writes from this account
 * (and other test accounts), to properly test rules.
 *
 * Logout after all tests are done.
 */
async function authLogin() {
  const cred = await firebase
    .auth()
    .signInWithEmailAndPassword(testAccount.email, testAccount.password);
  console.log('[AUTH] Logged in with test account', cred.user.email);
  return cred;
}
async function authLogout() {
  console.log('[AUTH] Logging out user');
  return firebase.auth().signOut();
}

/**
 * Functions smoke test.
 *
 * Call a deployed function.
 * This cloud function must be deployed in this project first. It can be
 * found in this repo's /functions folder.
 */
async function callFunctions() {
  console.log('[FUNCTIONS] start');
  const functions = firebase.functions();
  const callTest = functions.httpsCallable('callTest');
  const result = await callTest({ data: 'blah' });
  console.log('[FUNCTIONS] result:', result.data);
}

/**
 * Storage smoke test.
 * Create, read, delete.
 */
async function callStorage() {
  console.log('[STORAGE] start');
  const storage = firebase.storage();
  const storageRef = storage.ref('/test.txt');
  await storageRef.putString('efg');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const url = await storageRef.getDownloadURL();
  console.log('[STORAGE] download url', url);
  const response = await fetch(url);
  const data = await response.text();
  console.log("[STORAGE] Returned data (should be 'efg'):", data);
  await storageRef.delete();
}

/**
 * Firestore smoke test.
 * Create 2 docs, test query filter.
 * Create, update, delete a doc with `onSnapshot` monitoring changes.
 */
async function callFirestore() {
  console.log('[FIRESTORE] start');
  const firestore = firebase.firestore();
  await firestore.collection('testCollection').doc('trueDoc').set({
    testbool: true
  });
  await firestore.collection('testCollection').doc('falseDoc').set({
    testbool: false
  });
  const trueDocs = await firestore
    .collection('testCollection')
    .where('testbool', '==', true)
    .get();
  trueDocs.docs.forEach(doc =>
    console.log('[FIRESTORE] Filter test, expect one doc', doc.data())
  );
  await firestore.collection('testCollection').doc('trueDoc').delete();
  await firestore.collection('testCollection').doc('falseDoc').delete();
  const testDocRef = firestore.doc('testCollection/testDoc');
  console.log('[FIRESTORE] Doc creation and updating');
  testDocRef.onSnapshot(snap => {
    if (snap.exists) {
      console.log('[FIRESTORE] SNAPSHOT:', snap.data());
    } else {
      console.log("[FIRESTORE] Snapshot doesn't exist");
    }
  });
  console.log('[FIRESTORE] creating (expect to see snapshot data)');
  await testDocRef.set({ word: 'hi', number: 14 });
  console.log('[FIRESTORE] updating (expect to see snapshot data change)');
  await testDocRef.update({ word: 'bye', newProp: ['a'] });
  console.log("[FIRESTORE] deleting (expect to see snapshot doesn't exist)");
  await testDocRef.delete();
}

/**
 * Database smoke test.
 * Create, update, delete a doc with `on` monitoring changes.
 */
async function callDatabase() {
  console.log('[DATABASE] start');
  const db = firebase.database();
  const ref = db.ref('abc/def');
  ref.on('value', snap => {
    if (snap.exists()) {
      console.log(`[DATABASE] value: ${JSON.stringify(snap.val())}`);
    } else {
      console.log("[DATABASE] Snapshot doesn't exist");
    }
  });
  console.log('[DATABASE] creating (expect to see snapshot data)');
  await ref.set({ text: 'string 123 xyz' });
  console.log('[DATABASE] updating (expect to see snapshot data change)');
  await ref.update({ number: 987 });
  console.log("[DATABASE] deleting (expect to see snapshot doesn't exist)");
  await ref.remove();
  ref.off();
}

/**
 * Messaging smoke test.
 * Call getToken(), it won't work on localhost, just a minimal test to make
 * sure library has registered and initialized.
 */
async function callMessaging() {
  console.log('[MESSAGING] start');
  const messaging = firebase.messaging();

  return messaging
    .getToken()
    .then(token => console.log(`[MESSAGING] Got token: ${token}`))
    .catch(e => {
      if (e.message.includes('messaging/permission-blocked')) {
        console.log('[MESSAGING] Permission blocked (expected on localhost)');
      } else {
        throw e;
      }
    });
}

/**
 * Analytics smoke test.
 * Just make sure some functions can be called without obvious errors.
 */
function callAnalytics() {
  console.log('[ANALYTICS] start');
  firebase.analytics.isSupported();
  firebase.analytics().logEvent('begin_checkout');
  console.log('[ANALYTICS] logged event');
}

/**
 * App Check smoke test.
 * Just make sure some functions can be called without obvious errors.
 */
function callAppCheck() {
  console.log('[APP CHECK] start');
  firebase.appCheck().activate('6LeQ87AaAAAAAPutpKHMwFs5wD4UxmenWvpujtt5');
  console.log('[APP CHECK] activated');
}

/**
 * Analytics smoke test.
 * Just make sure some functions can be called without obvious errors.
 */
function callPerformance() {
  console.log('[PERFORMANCE] start');
  const performance = firebase.performance();
  const trace = performance.trace('test');
  trace.start();
  trace.stop();
  trace.putAttribute('testattr', 'perftestvalue');
  console.log(
    "[PERFORMANCE] trace (should be 'perftestvalue')",
    trace.getAttribute('testattr')
  );
}

/**
 * Run all smoke tests.
 */
async function main() {
  console.log('FIREBASE VERSION', firebase.SDK_VERSION);
  const app = firebase.initializeApp(config);
  firebase.setLogLevel('warn');

  callAppCheck();
  await authLogin();
  await callStorage();
  await callFirestore();
  await callDatabase();
  await callMessaging();
  callAnalytics();
  callPerformance();
  await callFunctions();
  await authLogout();
  console.log('DONE');
}

main();
