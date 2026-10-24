/**
 * @license
 * Copyright 2026 Google LLC
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

import { expect } from 'chai';
import * as sinon from 'sinon';
import { initializeTestEnvironment } from '../src/initialize';
import {
  RulesTestEnvironment,
  RulesTestContext
} from '../src/public_types';
import { assertSucceeds, assertFails } from '../src/util';
import {
  initializeFirestore,
  connectFirestoreEmulator
} from '@firebase/firestore';
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet
} from '@firebase/database';

const DATABASE_RULES = JSON.stringify({
  rules: {
    users: {
      $uid: {
        '.read': 'auth != null && auth.uid == $uid',
        '.write': 'auth != null && auth.uid == $uid'
      }
    }
  }
});

describe('RulesTestEnvironment & RulesTestContext (modular)', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-rules-unit-testing-test',
      database: { rules: DATABASE_RULES }
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearDatabase();
  });

  describe('Firestore modular integration', () => {
    it('initializes and connects modular Firestore to emulator with correct auth token', () => {
      const alice = testEnv.authenticatedContext('alice');
      const db = alice.firestore();
      expect(db).to.be.ok;
      expect(initializeFirestore).to.have.been.called;
      expect(connectFirestoreEmulator).to.have.been.calledWith(
        db,
        sinon.match.string,
        sinon.match.number,
        sinon.match({ mockUserToken: sinon.match({ sub: 'alice', user_id: 'alice' }) })
      );
    });

    it('caches the firestore instance per context on repeated calls', () => {
      const alice = testEnv.authenticatedContext('alice');
      const db1 = alice.firestore();
      const db2 = alice.firestore();
      expect(db1).to.equal(db2);
    });

    it('re-initializes firestore when custom settings are provided', () => {
      const alice = testEnv.authenticatedContext('alice');
      const customSettings = { ignoreUndefinedProperties: true };
      const db = alice.firestore(customSettings as any);
      expect(initializeFirestore).to.have.been.calledWith(sinon.match.any, customSettings);
      expect(db).to.be.ok;
    });

    it('clears firestore data with clearFirestore', async () => {
      await assertSucceeds(testEnv.clearFirestore());
    });
  });

  describe('Database modular integration', () => {
    it('supports modular RTDB read, write, and rules enforcement', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const bob = testEnv.authenticatedContext('bob');
      const db = alice.database();

      // Alice can write to her own node
      await assertSucceeds(
        rtdbSet(rtdbRef(db, 'users/alice'), { message: 'hello' })
      );

      const snap = await rtdbGet(rtdbRef(db, 'users/alice'));
      expect(snap.val()).to.deep.equal({ message: 'hello' });

      // Bob cannot write to Alice's node
      await assertFails(
        rtdbSet(rtdbRef(bob.database(), 'users/alice'), { message: 'hacked' })
      );
    });

    it('clears database data with clearDatabase', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await rtdbSet(rtdbRef(alice.database(), 'users/alice'), { data: 123 });

      await testEnv.clearDatabase();

      const snap = await rtdbGet(rtdbRef(alice.database(), 'users/alice'));
      expect(snap.val()).to.be.null;
    });
  });

  describe('Storage modular integration', () => {
    it('returns a modular FirebaseStorage instance connected to emulator', () => {
      const alice = testEnv.authenticatedContext('alice');
      const storage = alice.storage();
      expect(storage).to.be.ok;
      expect(storage.app).to.be.ok;
    });

    it('clears storage data with clearStorage', async () => {
      await assertSucceeds(testEnv.clearStorage());
    });
  });

  describe('Context & Environment lifecycle', () => {
    it('eagerly cleans up context after withSecurityRulesDisabled', async () => {
      let savedContext: RulesTestContext | undefined;
      await testEnv.withSecurityRulesDisabled(async (context: RulesTestContext) => {
        savedContext = context;
        const db = context.database();
        expect(db).to.be.ok;
      });

      expect(() => savedContext!.database()).to.throw(/no longer valid/);
    });

    it('throws error when performing operations on destroyed environment', async () => {
      const localEnv = await initializeTestEnvironment({
        projectId: 'demo-lifecycle-test',
        firestore: { host: '127.0.0.1', port: 8080 },
        database: { host: '127.0.0.1', port: 9000 }
      });
      await localEnv.cleanup();

      expect(() => localEnv.authenticatedContext('alice')).to.throw(/already been cleaned up/);
      expect(() => localEnv.unauthenticatedContext()).to.throw(/already been cleaned up/);
    });
  });
});
