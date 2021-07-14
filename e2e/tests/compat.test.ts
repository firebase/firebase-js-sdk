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
import { expect } from 'chai';

describe('COMPAT', () => {
  let app: firebase.app.App;
  before(() => {
    console.log('FIREBASE VERSION', firebase.SDK_VERSION);
    app = firebase.initializeApp(config);
    firebase.setLogLevel('warn');
  });

  after(async () => {
    await firebase.auth().signOut();
    await app.delete();
  });

  describe('AUTH', async () => {
    let auth: firebase.auth.Auth;
    it('init auth', () => {
      auth = firebase.auth();
    });
    it('signInWithEmailAndPassword()', async () => {
      const cred = await auth.signInWithEmailAndPassword(
        testAccount.email,
        testAccount.password
      );
      console.log('Logged in with test account', cred.user.email);
      expect(cred.user.email).to.equal(testAccount.email);
    });
  });

  describe('APP CHECK', async () => {
    // @ts-ignore
    let appCheck: firebase.appCheck.appCheck;
    it('init appCheck', () => {
      // @ts-ignore
      appCheck = firebase.appCheck();
    });
    it('activate()', async () => {
      // Test uses debug token, any string is fine here.
      appCheck.activate('asdf');
    });
  });

  describe('FUNCTIONS', async () => {
    let functions: firebase.functions.Functions;
    it('init functions', () => {
      functions = firebase.functions();
    });
    it('httpsCallable()', async () => {
      console.log('hi');
      const callTest = functions.httpsCallable('callTest');
      const result = await callTest({ data: 'blah' });
      expect(result.data.word).to.equal('hellooo');
      // This takes a while. Extend timeout past default (2000);
    }).timeout(5000);
  });

  describe('STORAGE', async () => {
    let storage: firebase.storage.Storage;
    let storageRef: firebase.storage.Reference;
    let url: string;
    it('init storage', () => {
      storage = firebase.storage();
    });
    it('putString()', async () => {
      storageRef = storage.ref('/test-compat.txt');
      await storageRef.putString('efg');
    });
    it('getDownloadUrl()', async () => {
      url = await storageRef.getDownloadURL();
      expect(url).to.match(/test-compat\.txt/);
    });
    it('fetch and check uploaded data', async () => {
      const response = await fetch(url);
      const data = await response.text();
      expect(data).to.equal('efg');
      await storageRef.delete();
    });
  });

  describe('FIRESTORE', async () => {
    let firestore: firebase.firestore.Firestore;
    it('init firestore', () => {
      firestore = firebase.firestore();
    });
    it('set(), get(), where()', async () => {
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
      expect(trueDocs.docs.length).to.equal(1);
      await firestore.collection('testCollection').doc('trueDoc').delete();
      await firestore.collection('testCollection').doc('falseDoc').delete();
    });
    it('onSnapshot() reflects CRUD operations', async () => {
      const testDocRef = firestore.doc('testCollection/testDoc');
      let expectedSnap: any = {};
      testDocRef.onSnapshot(snap => {
        expect(snap.exists).to.equal(expectedSnap.exists);
        if (snap.exists) {
          expect(snap.data()).to.deep.equal(expectedSnap.data);
        }
      });
      expectedSnap = { exists: true, data: { word: 'hi', number: 14 } };
      await testDocRef.set({ word: 'hi', number: 14 });
      expectedSnap = {
        exists: true,
        data: { word: 'bye', number: 14, newProp: ['a'] }
      };
      await testDocRef.update({ word: 'bye', newProp: ['a'] });
      expectedSnap = { exists: false };
      await testDocRef.delete();
    });
  });

  describe('DATABASE', async () => {
    let db: firebase.database.Database;
    it('init database', () => {
      db = firebase.database();
    });
    it('on() reflects CRUD operations', async () => {
      const ref = db.ref('abc/def');
      let expectedValue: any = {};
      ref.on('value', snap => {
        if (snap.exists()) {
          expect(snap.val()).to.deep.equal(expectedValue);
        } else {
          expect(expectedValue).to.be.null;
        }
      });
      expectedValue = { text: 'string 123 xyz' };
      await ref.set({ text: 'string 123 xyz' });
      expectedValue.number = 987;
      await ref.update({ number: 987 });
      expectedValue = null;
      await ref.remove();
      ref.off();
    });
  });

  describe('MESSAGING', () => {
    it('init messaging', () => {
      firebase.messaging();
    });
  });

  describe('ANALYTICS', () => {
    let analytics: firebase.analytics.Analytics;
    it('analytics.isSupported() (static method)', () =>
      firebase.analytics.isSupported());
    it('init analytics', () => {
      analytics = firebase.analytics();
    });
    it("logEvent doesn't error", () => {
      analytics.logEvent('begin_checkout');
    });
  });

  describe('PERFORMANCE', () => {
    let performance: firebase.performance.Performance;
    it('init performance', () => {
      performance = firebase.performance();
    });
    it('trace()', () => {
      const trace = performance.trace('test');
      trace.start();
      trace.stop();
      trace.putAttribute('testattr', 'perftestvalue');
      expect(trace.getAttribute('testattr')).to.equal('perftestvalue');
    });
  });
});
