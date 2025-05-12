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
  Database
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
  Firestore,
  initializeFirestore
} from 'firebase/firestore';
import {
  Functions,
  getFunctions,
  httpsCallable,
  httpsCallableFromURL
} from 'firebase/functions';
import { getMessaging } from 'firebase/messaging';
import {
  FirebasePerformance,
  getPerformance,
  trace as perfTrace
} from 'firebase/performance';
import {
  getStorage,
  FirebaseStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
  StorageReference,
  deleteObject
} from 'firebase/storage';
import { getGenerativeModel, getAI, AI } from 'firebase/vertexai';
import { getDataConnect, DataConnect } from 'firebase/data-connect';
import { config, testAccount } from '../firebase-config';
import 'jest';

describe('MODULAR', () => {
  let app: FirebaseApp;
  beforeAll(() => {
    console.log('FIREBASE VERSION', SDK_VERSION);
    app = initializeApp(config);
    setLogLevel('warn');
  });

  afterAll(() => {
    signOut(getAuth(app));
    deleteApp(app);
  });

  describe('AUTH', () => {
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
      expect(cred.user.email).toBe(testAccount.email);
    });
  });

  describe('APP CHECK', () => {
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

  describe('FUNCTIONS', () => {
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
      expect(result.data.word).toBe('hellooo');
      // This takes a while. Extend timeout past default (2000)
    });
    it('httpsCallableFromURL()', async () => {
      const callTest = httpsCallableFromURL<{ data: string }, { word: string }>(
        functions,
        `https://us-central1-${app.options.projectId}.cloudfunctions.net/callTest`
      );
      const result = await callTest({ data: 'blah' });
      expect(result.data.word).toBe('hellooo');
      // This takes a while. Extend timeout past default (2000)
    });
  });

  describe('STORAGE', () => {
    let storage: FirebaseStorage;
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
      expect(url).toMatch(/test-exp\.txt/);
    });
    it('fetch uploaded data', async () => {
      const response = await fetch(url);
      const data = await response.text();
      expect(data).toBe('exp-efg');
      await deleteObject(sRef);
    });
  });

  describe('FIRESTORE', () => {
    let firestore: Firestore;
    it('initializeFirestore()', () => {
      // fetch streams doesn't work in Jest.
      // @ts-ignore I think the option is private so TS doesn't like it.
      firestore = initializeFirestore(app, { useFetchStreams: false });
    });
    it('getFirestore()', () => {
      firestore = getFirestore(app);
    });
    it('setDoc(), getDocs(), query(), where()', async () => {
      firestore = getFirestore(app);
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
      expect(trueDocs.docs.length).toBe(1);
      await deleteDoc(doc(collection(firestore, 'testCollection'), 'trueDoc'));

      await deleteDoc(doc(firestore, 'testCollection/falseDoc'));
    });
    it('onSnapshot() reflects CRUD operations', async () => {
      firestore = getFirestore(app);
      const testDocRef = doc(firestore, 'testCollection/testDoc');
      let expectedData: any = {};
      const unsub = onSnapshot(testDocRef, snap => {
        if (snap.exists()) {
          expect(snap.data()).toEqual(expectedData);
        } else {
          expect(expectedData).toBeNull;
        }
      });
      expectedData = { word: 'hi', number: 14 };
      await setDoc(testDocRef, { word: 'hi', number: 14 });
      expectedData = { word: 'bye', number: 14, newProp: ['a'] };
      await updateDoc(testDocRef, { word: 'bye', newProp: ['a'] });
      expectedData = null;
      await deleteDoc(testDocRef);
      unsub();
    });
  });

  describe('DATABASE', () => {
    let db: Database;
    it('getDatabase', () => {
      db = getDatabase(app);
    });
    it('onValue() reflects CRUD operations', async () => {
      const ref = dbRef(db, 'abc/def');
      let expectedValue: any = {};
      onValue(ref, snap => {
        if (snap.exists()) {
          expect(snap.val()).toEqual(expectedValue);
        } else {
          expect(expectedValue).toBeNull;
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
      // @ts-ignore Stub missing browser APIs that FCM depends on
      window.indexedDB = { open: () => Promise.resolve() };
      // @ts-ignore Stub missing browser APIs that FCM depends on
      navigator.serviceWorker = { addEventListener: () => {} };
      getMessaging(app);
      // @ts-ignore
      delete window.indexedDB;
      // @ts-ignore
      delete navigator.serviceWorker;
    });
  });

  describe('ANALYTICS', () => {
    let analytics: Analytics;
    it('analyticsIsSupported()', () => {
      analyticsIsSupported();
    });
    it('getAnalytics()', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
      analytics = getAnalytics(app);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching('@firebase/analytics'),
        expect.stringMatching(/IndexedDB unavailable/)
      );
      warn.mockRestore();
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
      expect(trace.getAttribute('testattr')).toBe('perftestvalue');
    });
  });

  describe.only('AI', () => {
    let ai: AI;
    it('getVertexAI()', () => {
      ai = getAI(app);
    });
    it('getGenerativeModel() and countTokens()', async () => {
      const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash' });
      expect(model.model).toMatch(/gemini-1.5-flash$/);
      const result = await model.countTokens('abcdefg');
      expect(result.totalTokens).toBeTruthy;
    });
  });

  describe('DATA CONNECT', () => {
    let dataConnect: DataConnect;
    it('getDataConnect()', () => {
      dataConnect = getDataConnect(app, {
        location: 'a-location',
        connector: 'a-connector',
        service: 'service'
      });
    });
    it('dataConnect.getSettings()', () => {
      expect(dataConnect.getSettings().location).toBe('a-location');
    });
  });
});
