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

import { initializeApp, setLogLevel, SDK_VERSION } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getAnalytics,
  isSupported as analyticsIsSupported,
  logEvent
} from 'firebase/analytics';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  getFirestore,
  collection,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getPerformance, trace as perfTrace } from 'firebase/performance';
import {
  getDatabase,
  ref as dbRef,
  set,
  update,
  remove,
  onValue, off
} from 'firebase/database';
/**
 * The config file should look like:
 *
 * // A config for a project
 * export const config = {
 *   apiKey: ************,
 *   authDomain: ************,
 *   databaseURL: ************,
 *   projectId: ************,
 *   storageBucket: ************,
 *   messagingSenderId: ************,
 *   appId: ************,
 *   measurementId: ************
 * };
 *
 * // A user account with read/write privileges in that project
 * // for storage, database, firestore
 * export const testAccount = {
 *   email: ************,
 *   password: ************
 * }
 */
import { config, testAccount } from '../firebase-config';

/**
 * Quick sample app to debug and explore basic Firebase API usage/problems.
 * 
 * In order for app check to work, add the app check debug token to
 * build/index.html and uncomment the line.
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
async function authLogin(app) {
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(
    auth,
    testAccount.email,
    testAccount.password
  );
  console.log('[AUTH] Logged in with test account', cred.user.email);
  return cred;
}
async function authLogout(app) {
  console.log('[AUTH] Logging out user');
  return signOut(getAuth(app));
}

/**
 * Functions smoke test.
 *
 * Call a deployed function.
 * This cloud function must be deployed in this project first. It can be
 * found in this repo's /functions folder.
 */
async function callFunctions(app) {
  console.log('[FUNCTIONS] start');
  const functions = getFunctions(app);
  const callTest = httpsCallable(functions, 'callTest');
  try {
    const result = await callTest({ data: 'blah' });
    console.log('[FUNCTIONS] result:', result.data);
  } catch(e) {
    if (e.message.includes('Unauthenticated')) {
      console.warn('Functions blocked by App Check. ' + 'Activate app check with a live sitekey to allow Functions calls');
    } else {
      throw e;
    }
  }
}

/**
 * Storage smoke test.
 * Create, read, delete.
 */
async function callStorage(app) {
  console.log('[STORAGE] start');
  const storage = getStorage(app);
  const storageRef = ref(storage, '/test.txt');
  await uploadString(storageRef, 'efg');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const url = await getDownloadURL(storageRef);
  console.log('[STORAGE] download url', url);
  const response = await fetch(url);
  const data = await response.text();
  console.log("[STORAGE] Returned data (should be 'efg'):", data);
  await deleteObject(storageRef);
}

/**
 * Firestore smoke test.
 * Create 2 docs, test query filter.
 * Create, update, delete a doc with `onSnapshot` monitoring changes.
 */
async function callFirestore(app) {
  console.log('[FIRESTORE] start');
  const firestore = getFirestore(app);
  setDoc(doc(collection(firestore, 'testCollection'), 'trueDoc'), {
    testbool: true
  });
  setDoc(doc(collection(firestore, 'testCollection'), 'falseDoc'), {
    testbool: false
  });
  const trueDocs = await getDocs(
    query(
      collection(firestore, 'testCollection'),
      where('testbool', '==', true)
    )
  );
  trueDocs.docs.forEach(doc =>
    console.log('[FIRESTORE] Filter test, expect one doc', doc.data())
  );
  await deleteDoc(doc(collection(firestore, 'testCollection'), 'trueDoc'));
  await deleteDoc(doc(firestore, 'testCollection/falseDoc'));
  const testDocRef = doc(firestore, 'testCollection/testDoc');
  console.log('[FIRESTORE] Doc creation and updating');
  onSnapshot(testDocRef, snap => {
    if (snap.exists) {
      console.log('[FIRESTORE] SNAPSHOT:', snap.data());
    } else {
      console.log("[FIRESTORE] Snapshot doesn't exist");
    }
  });
  console.log('[FIRESTORE] creating (expect to see snapshot data)');
  await setDoc(testDocRef, { word: 'hi', number: 14 });
  console.log('[FIRESTORE] updating (expect to see snapshot data change)');
  await updateDoc(testDocRef, { word: 'bye', newProp: ['a'] });
  console.log("[FIRESTORE] deleting (expect to see snapshot doesn't exist)");
  await deleteDoc(testDocRef);
}

/**
 * Database smoke test.
 * Create, update, delete a doc with `on` monitoring changes.
 */
async function callDatabase(app) {
  console.log('[DATABASE] start');
  const db = getDatabase(app);
  const ref = dbRef(db, 'abc/def');
  onValue(ref, snap => {
    if (snap.exists()) {
      console.log(`[DATABASE] value: ${JSON.stringify(snap.val())}`);
    } else {
      console.log("[DATABASE] Snapshot doesn't exist");
    }
  });
  console.log('[DATABASE] creating (expect to see snapshot data)');
  await set(ref, { text: 'string 123 xyz' });
  console.log('[DATABASE] updating (expect to see snapshot data change)');
  await update(ref, { number: 987 });
  console.log("[DATABASE] deleting (expect to see snapshot doesn't exist)");
  await remove(ref);
  off(ref);
}

/**
 * Messaging smoke test.
 */
async function callMessaging(app) {
  console.log('[MESSAGING] start');
  getMessaging(app);
}

/**
 * Analytics smoke test.
 * Just make sure some functions can be called without obvious errors.
 */
function callAnalytics(app) {
  console.log('[ANALYTICS] start');
  analyticsIsSupported();
  const analytics = getAnalytics(app);
  logEvent(analytics, 'begin_checkout');
  console.log('[ANALYTICS] logged event');
}

/**
 * App Check smoke test.
 * Just make sure some functions can be called without obvious errors.
 */
function callAppCheck(app) {
  console.log('[APP CHECK] start');
  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: () => Promise.resolve({ token: 'abcd' })
    })
  });
  console.log('[APP CHECK] initialized');
}

/**
 * Analytics smoke test.
 * Just make sure some functions can be called without obvious errors.
 */
function callPerformance(app) {
  console.log('[PERFORMANCE] start');
  const performance = getPerformance(app);
  const trace = perfTrace(performance, 'test');
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
  console.log('FIREBASE VERSION', SDK_VERSION);
  const app = initializeApp(config);
  setLogLevel('warn');

  callAppCheck(app);
  await authLogin(app);
  await callStorage(app);
  await callFirestore(app);
  await callDatabase(app);
  await callMessaging(app);
  callAnalytics(app);
  callPerformance(app);
  await callFunctions(app);
  await authLogout(app);
  console.log('DONE');
}

main();
