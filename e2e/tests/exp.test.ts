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

import {
  initializeApp,
  setLogLevel,
  SDK_VERSION,
  FirebaseApp,
  deleteApp
} from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  initializeAppCheck,
  AppCheck,
  ReCaptchaV3Provider,
  getToken
} from 'firebase/app-check';
import {
  getAnalytics,
  logEvent,
  isSupported as analyticsIsSupported,
  Analytics
} from 'firebase/analytics';
import {
  getDatabase,
  ref as dbRef,
  onValue,
  off,
  update,
  remove,
  set,
  FirebaseDatabase
} from 'firebase/database';
import {
  collection,
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  where,
  query,
  deleteDoc,
  FirebaseFirestore,
  initializeFirestore
} from 'firebase/firestore';
import { Functions, getFunctions, httpsCallable } from 'firebase/functions';
import { getMessaging } from 'firebase/messaging';
import {
  FirebasePerformance,
  getPerformance,
  trace as perfTrace
} from 'firebase/performance';
import {
  getStorage,
  StorageService,
  ref as storageRef,
  uploadString,
  getDownloadURL,
  StorageReference,
  deleteObject
} from 'firebase/storage';
import { config, testAccount } from '../firebase-config';
import 'chai/register-expect';
import { expect } from 'chai';

describe('EXP', () => {
  let app: FirebaseApp;
  before(() => {
    console.log('FIREBASE VERSION', SDK_VERSION);
    app = initializeApp(config);
    setLogLevel('warn');
  });

  after(() => {
    signOut(getAuth(app));
    deleteApp(app);
  });

  describe('AUTH', async () => {
    let auth: Auth;
    it('initializeAuth()', () => {
      auth = initializeAuth(app);
    });
    it('getAuth()', () => {
      auth = getAuth(app);
    });
    it('signInWithEmailAndPassword()', async () => {
      const cred = await signInWithEmailAndPassword(
        auth,
        testAccount.email,
        testAccount.password
      );
      console.log('Logged in with test account', cred.user.email);
      expect(cred.user.email).to.equal(testAccount.email);
    });
  });

  describe('APP CHECK', async () => {
    let appCheck: AppCheck;
    it('init appCheck', () => {
      // Test uses debug token, any string is fine here.
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('fsad')
      });
    });
    it('getToken()', async () => {
      await getToken(appCheck);
    });
  });

  describe('FUNCTIONS', async () => {
    let functions: Functions;
    it('getFunctions()', () => {
      functions = getFunctions(app);
    });
    it('httpsCallable()', async () => {
      const callTest = httpsCallable<{ data: string }, { word: string }>(
        functions,
        'callTest'
      );
      const result = await callTest({ data: 'blah' });
      expect(result.data.word).to.equal('hellooo');
      // This takes a while. Extend timeout past default (2000)
    }).timeout(5000);
  });

  describe('STORAGE', async () => {
    let storage: StorageService;
    let sRef: StorageReference;
    let url: string;
    it('getStorage()', () => {
      storage = getStorage(app);
    });
    it('uploadString()', async () => {
      sRef = storageRef(storage, '/test-exp.txt');
      await uploadString(sRef, 'exp-efg');
    });
    it('getDownloadURL()', async () => {
      url = await getDownloadURL(sRef);
      expect(url).to.match(/test-exp\.txt/);
    });
    it('fetch uploaded data', async () => {
      const response = await fetch(url);
      const data = await response.text();
      expect(data).to.equal('exp-efg');
      await deleteObject(sRef);
    });
  });

  describe('FIRESTORE', async () => {
    let firestore: FirebaseFirestore;
    it('initializeFirestore()', () => {
      firestore = initializeFirestore(app, {});
    });
    it('getFirestore()', () => {
      firestore = getFirestore(app);
    });
    it('setDoc(), getDocs(), query(), where()', async () => {
      await setDoc(doc(firestore, 'testCollection/trueDoc'), {
        testbool: true
      });
      // Reference doc a different way.
      await setDoc(doc(collection(firestore, 'testCollection'), 'falseDoc'), {
        testbool: false
      });
      const trueDocs = await getDocs(
        query(
          collection(firestore, 'testCollection'),
          where('testbool', '==', true)
        )
      );
      expect(trueDocs.docs.length).to.equal(1);
      await deleteDoc(doc(collection(firestore, 'testCollection'), 'trueDoc'));
      await deleteDoc(doc(firestore, 'testCollection/falseDoc'));
    });
    it('onSnapshot() reflects CRUD operations', async () => {
      const testDocRef = doc(firestore, 'testCollection/testDoc');
      let expectedData: any = {};
      onSnapshot(testDocRef, snap => {
        if (snap.exists()) {
          expect(snap.data()).to.deep.equal(expectedData);
        } else {
          expect(expectedData).to.be.null;
        }
      });
      expectedData = { word: 'hi', number: 14 };
      await setDoc(testDocRef, { word: 'hi', number: 14 });
      expectedData = { word: 'bye', number: 14, newProp: ['a'] };
      await updateDoc(testDocRef, { word: 'bye', newProp: ['a'] });
      expectedData = null;
      await deleteDoc(testDocRef);
    });
  });

  describe('DATABASE', async () => {
    let db: FirebaseDatabase;
    it('getDatabase', () => {
      db = getDatabase(app);
    });
    it('onValue() reflects CRUD operations', async () => {
      const ref = dbRef(db, 'abc/def');
      let expectedValue: any = {};
      onValue(ref, snap => {
        if (snap.exists()) {
          expect(snap.val()).to.deep.equal(expectedValue);
        } else {
          expect(expectedValue).to.be.null;
        }
      });
      expectedValue = { text: 'string 123 xyz' };
      await set(ref, { text: 'string 123 xyz' });
      expectedValue.number = 987;
      await update(ref, { number: 987 });
      expectedValue = null;
      await remove(ref);
      off(ref);
    });
  });

  describe('MESSAGING', () => {
    it('getMessaging()', () => {
      getMessaging(app);
    });
  });

  describe('ANALYTICS', async () => {
    let analytics: Analytics;
    it('analyticsIsSupported()', () => analyticsIsSupported());
    it('getAnalytics()', () => {
      analytics = getAnalytics(app);
    });
    it("logEvent() doesn't error", () => {
      logEvent(analytics, 'begin_checkout');
    });
  });

  describe('PERFORMANCE', () => {
    let performance: FirebasePerformance;
    it('getPerformance()', () => {
      performance = getPerformance(app);
    });
    it('trace()', () => {
      const trace = perfTrace(performance, 'test');
      trace.start();
      trace.stop();
      trace.putAttribute('testattr', 'perftestvalue');
      expect(trace.getAttribute('testattr')).to.equal('perftestvalue');
    });
  });
});
