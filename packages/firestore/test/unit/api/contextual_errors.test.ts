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

import { enableContextualErrors, FirebaseError } from '@firebase/util';

import {
  addDoc,
  collection,
  collectionGroup,
  count,
  deleteDoc,
  doc,
  Firestore,
  FirestoreError,
  FirestoreOperation,
  getAggregateFromServer,
  getCountFromServer,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  limitToLast,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch
} from '../../../src';
import {
  EmptyAppCheckTokenProvider,
  EmptyAuthCredentialsProvider
} from '../../../src/api/credentials';
import { execute } from '../../../src/api/pipeline_impl';
import {
  MemoryOfflineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
import { DatabaseId } from '../../../src/core/database_info';
import { getAggregate, getCount } from '../../../src/lite-api/aggregate';
import {
  getDatastore,
  removeComponents
} from '../../../src/lite-api/components';
import { Firestore as LiteFirestore } from '../../../src/lite-api/database';
import { execute as liteExecute } from '../../../src/lite-api/pipeline_impl';
import {
  addDoc as liteAddDoc,
  deleteDoc as liteDeleteDoc,
  getDoc as liteGetDoc,
  getDocs as liteGetDocs,
  setDoc as liteSetDoc,
  updateDoc as liteUpdateDoc
} from '../../../src/lite-api/reference_impl';
import { runTransaction as liteRunTransaction } from '../../../src/lite-api/transaction';
import { writeBatch as liteWriteBatch } from '../../../src/lite-api/write_batch';
import { AsyncObserver } from '../../../src/util/async_observer';
import { Code, withContext } from '../../../src/util/error';
import { newTestFirestore } from '../../util/api_helpers';

function createFailingFirestore(error: FirestoreError): Firestore {
  const db = newTestFirestore();
  db._componentsProvider = {
    _offline: {
      build: () => new MemoryOfflineComponentProvider()
    },
    _online: {
      build: () => {
        const provider = new OnlineComponentProvider();
        const ogCreateDatastore = provider.createDatastore.bind(provider);
        provider.createDatastore = config => {
          const datastore = ogCreateDatastore(config);
          // @ts-ignore
          datastore.invokeRPC = vi.fn().mockRejectedValue(error);
          // @ts-ignore
          datastore.invokeStreamingRPC = vi.fn().mockRejectedValue(error);
          return datastore;
        };
        return provider;
      }
    }
  };
  return db;
}

function createFailingLiteFirestore(error: FirestoreError): LiteFirestore {
  const db = new LiteFirestore(
    new EmptyAuthCredentialsProvider(),
    new EmptyAppCheckTokenProvider(),
    new DatabaseId('test-project'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { name: 'test-app', options: { appId: 'app-id', apiKey: 'api-key' } } as any
  );
  const datastore = getDatastore(db);
  // @ts-ignore
  datastore.invokeRPC = vi.fn().mockRejectedValue(error);
  // @ts-ignore
  datastore.invokeStreamingRPC = vi.fn().mockRejectedValue(error);
  return db;
}

async function expectFirestoreError(
  action: () => Promise<unknown> | unknown
): Promise<FirestoreError> {
  try {
    await action();
  } catch (e) {
    expect(e).toBeInstanceOf(FirestoreError);
    expect(e).toBeInstanceOf(FirebaseError);
    return e as FirestoreError;
  }
  throw new Error('Expected action to throw a FirestoreError');
}

describe('Contextual errors in Firestore SDK', () => {
  afterEach(() => {
    enableContextualErrors(false);
  });

  describe('withContext()', () => {
    it('returns original error when contextual errors are disabled', () => {
      const err = new FirestoreError(
        Code.PERMISSION_DENIED,
        'Missing or insufficient permissions.'
      );
      const wrapped = withContext(err, {
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
      expect(wrapped).toBe(err);
      expect((wrapped as FirestoreError).context).toBeUndefined();
      expect((wrapped as FirestoreError).message).toBe(
        'Missing or insufficient permissions.'
      );
    });

    it('attaches context and formats message/toString once when enabled', () => {
      enableContextualErrors(true);
      const err = new FirestoreError(
        Code.PERMISSION_DENIED,
        'Missing or insufficient permissions.'
      );
      const ctx = {
        path: 'users/alice',
        operation: FirestoreOperation.READ
      };
      const wrapped = withContext(err, ctx) as FirestoreError;
      expect(wrapped).toBeInstanceOf(FirestoreError);
      expect(wrapped).toBeInstanceOf(FirebaseError);
      expect(wrapped.code).toBe(Code.PERMISSION_DENIED);
      expect(wrapped.context).toEqual(ctx);
      expect(wrapped.message).toBe(
        `Missing or insufficient permissions. Context: ${JSON.stringify(ctx)}`
      );
      expect(wrapped.toString()).toBe(
        `FirebaseError: [code=permission-denied]: Missing or insufficient permissions. Context: ${JSON.stringify(ctx)}`
      );
    });

    it('does not overwrite existing context', () => {
      enableContextualErrors(true);
      const originalCtx = {
        path: 'users/alice',
        operation: FirestoreOperation.READ
      };
      const err = new FirestoreError(
        Code.PERMISSION_DENIED,
        'Denied',
        originalCtx
      );
      const wrapped = withContext(err, {
        path: 'users/bob',
        operation: FirestoreOperation.WRITE
      }) as FirestoreError;
      expect(wrapped).toBe(err);
      expect(wrapped.context).toEqual(originalCtx);
    });

    it('passes non-FirestoreError values through unchanged', () => {
      enableContextualErrors(true);
      const plainErr = new Error('boom');
      expect(
        withContext(plainErr, {
          path: 'users/alice',
          operation: FirestoreOperation.READ
        })
      ).toBe(plainErr);
    });
  });

  describe('AsyncObserver error context', () => {
    it('wraps error delivered to user error callback when enabled', async () => {
      enableContextualErrors(true);
      const received = await new Promise<FirestoreError>(resolve => {
        const observer = new AsyncObserver(
          { error: resolve },
          { path: 'users/alice', operation: FirestoreOperation.READ }
        );
        observer.error(
          new FirestoreError(Code.PERMISSION_DENIED, 'Permission denied')
        );
      });
      expect(received.context).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
      expect(received.message).toContain('"path":"users/alice"');
    });

    it('wraps error logged when no user error callback is provided', () => {
      enableContextualErrors(true);
      const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const observer = new AsyncObserver(
          {},
          { path: 'users', operation: FirestoreOperation.LIST }
        );
        observer.error(
          new FirestoreError(Code.PERMISSION_DENIED, 'Permission denied')
        );
        expect(logSpy).toHaveBeenCalledTimes(1);
        const loggedText = logSpy.mock.calls[0].join(' ');
        expect(loggedText).toContain('"path":"users"');
        expect(loggedText).toContain('"operation":"list"');
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('Full SDK operations', () => {
    it('attaches READ context to getDocFromCache errors', async () => {
      enableContextualErrors(true);
      const db = newTestFirestore();
      const err = await expectFirestoreError(() =>
        getDocFromCache(doc(db, 'users/alice'))
      );
      expect(err.code).toBe(Code.UNAVAILABLE);
      expect(err.context).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
    });

    it('does not attach context to getDocFromCache errors when disabled', async () => {
      const db = newTestFirestore();
      const err = await expectFirestoreError(() =>
        getDocFromCache(doc(db, 'users/alice'))
      );
      expect(err.code).toBe(Code.UNAVAILABLE);
      expect(err.context).toBeUndefined();
      expect(err.message).not.toContain('Context:');
    });

    it('attaches context on terminated client for getDoc, getDocFromServer, getDocs, getDocsFromCache, getDocsFromServer, setDoc, updateDoc, deleteDoc, addDoc, and onSnapshot', async () => {
      enableContextualErrors(true);
      const db = newTestFirestore();
      // Terminate without using terminate(db) since mock Firestore has no FirebaseApp
      await db._delete();

      const docRef = doc(db, 'users/alice');
      const colRef = collection(db, 'users');
      const groupQuery = collectionGroup(db, 'comments');

      expect(
        (await expectFirestoreError(() => getDoc(docRef))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
      expect(
        (await expectFirestoreError(() => getDocFromServer(docRef))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
      expect(
        (await expectFirestoreError(() => getDocs(colRef))).context
      ).toEqual({
        path: 'users',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => getDocs(groupQuery))).context
      ).toEqual({
        path: 'comments',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => getDocsFromCache(colRef))).context
      ).toEqual({
        path: 'users',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => getDocsFromServer(colRef))).context
      ).toEqual({
        path: 'users',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => setDoc(docRef, { a: 1 }))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.WRITE
      });
      expect(
        (await expectFirestoreError(() => updateDoc(docRef, { a: 2 }))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.UPDATE
      });
      expect(
        (await expectFirestoreError(() => deleteDoc(docRef))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.DELETE
      });
      const addErr = await expectFirestoreError(() => addDoc(colRef, { a: 1 }));
      expect(addErr.context?.operation).toBe(FirestoreOperation.WRITE);
      expect(addErr.context?.path).toMatch(/^users\/[^/]+$/);

      const docSnapErr = await expectFirestoreError(() =>
        onSnapshot(docRef, () => {})
      );
      expect(docSnapErr.context).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
      const querySnapErr = await expectFirestoreError(() =>
        onSnapshot(colRef, () => {})
      );
      expect(querySnapErr.context).toEqual({
        path: 'users',
        operation: FirestoreOperation.LIST
      });
    });

    it('attaches LIST context to limitToLast validation errors in getDocs and onSnapshot', async () => {
      enableContextualErrors(true);
      const db = newTestFirestore();
      const q = query(collection(db, 'orders'), limitToLast(5));

      expect((await expectFirestoreError(() => getDocs(q))).context).toEqual({
        path: 'orders',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => onSnapshot(q, () => {}))).context
      ).toEqual({
        path: 'orders',
        operation: FirestoreOperation.LIST
      });
    });

    it('attaches LIST context to getAggregateFromServer and getCountFromServer errors', async () => {
      enableContextualErrors(true);
      const db = createFailingFirestore(
        new FirestoreError(Code.PERMISSION_DENIED, 'Denied')
      );

      const aggErr = await expectFirestoreError(() =>
        getAggregateFromServer(collection(db, 'metrics'), { total: count() })
      );
      expect(aggErr.context).toEqual({
        path: 'metrics',
        operation: FirestoreOperation.LIST
      });

      const countErr = await expectFirestoreError(() =>
        getCountFromServer(collectionGroup(db, 'events'))
      );
      expect(countErr.context).toEqual({
        path: 'events',
        operation: FirestoreOperation.LIST
      });
    });

    it('attaches context to pipeline execute() errors', async () => {
      enableContextualErrors(true);
      const db = createFailingFirestore(
        new FirestoreError(Code.PERMISSION_DENIED, 'Denied')
      );

      const colErr = await expectFirestoreError(() =>
        execute(db.pipeline().collection('books'))
      );
      expect(colErr.context).toEqual({
        path: 'books',
        operation: FirestoreOperation.LIST
      });

      const groupErr = await expectFirestoreError(() =>
        execute(db.pipeline().collectionGroup('reviews'))
      );
      expect(groupErr.context).toEqual({
        path: 'reviews',
        operation: FirestoreOperation.LIST
      });
    });

    it('attaches READ context to Transaction.get() and commit context to runTransaction()', async () => {
      enableContextualErrors(true);
      const db = createFailingFirestore(
        new FirestoreError(Code.PERMISSION_DENIED, 'Denied')
      );

      const readErr = await expectFirestoreError(() =>
        runTransaction(db, async tx => {
          await tx.get(doc(db, 'accounts/1'));
        })
      );
      expect(readErr.context).toEqual({
        path: 'accounts/1',
        operation: FirestoreOperation.READ
      });

      const singleWriteErr = await expectFirestoreError(() =>
        runTransaction(db, async tx => {
          tx.delete(doc(db, 'accounts/1'));
        })
      );
      expect(singleWriteErr.context).toEqual({
        path: 'accounts/1',
        operation: FirestoreOperation.DELETE
      });

      const multiWriteErr = await expectFirestoreError(() =>
        runTransaction(db, async tx => {
          tx.set(doc(db, 'accounts/1'), { a: 1 });
          tx.set(doc(db, 'accounts/2'), { a: 2 });
        })
      );
      expect(multiWriteErr.context).toEqual({
        operation: FirestoreOperation.WRITE
      });
    });

    it('attaches context to WriteBatch sync validation errors', async () => {
      enableContextualErrors(true);
      const db = newTestFirestore();
      const batch = writeBatch(db);
      await batch.commit();

      expect(
        (
          await expectFirestoreError(() =>
            batch.set(doc(db, 'users/1'), { a: 1 })
          )
        ).context
      ).toEqual({ operation: FirestoreOperation.WRITE });
      expect(
        (
          await expectFirestoreError(() =>
            batch.update(doc(db, 'users/1'), { a: 1 })
          )
        ).context
      ).toEqual({ operation: FirestoreOperation.UPDATE });
      expect(
        (await expectFirestoreError(() => batch.delete(doc(db, 'users/1'))))
          .context
      ).toEqual({ operation: FirestoreOperation.DELETE });
    });
  });

  describe('Lite SDK operations', () => {
    let liteDb: LiteFirestore;

    afterEach(() => {
      if (liteDb) {
        removeComponents(liteDb);
      }
    });

    it('attaches context to lite getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, getAggregate, getCount, WriteBatch, Transaction, and execute', async () => {
      enableContextualErrors(true);
      liteDb = createFailingLiteFirestore(
        new FirestoreError(Code.PERMISSION_DENIED, 'Denied')
      );

      const docRef = doc(liteDb, 'users/alice');
      const colRef = collection(liteDb, 'users');
      const groupRef = collectionGroup(liteDb, 'tags');

      expect(
        (await expectFirestoreError(() => liteGetDoc(docRef))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });
      expect(
        (await expectFirestoreError(() => liteGetDocs(colRef))).context
      ).toEqual({
        path: 'users',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => liteGetDocs(groupRef))).context
      ).toEqual({
        path: 'tags',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => liteSetDoc(docRef, { a: 1 }))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.WRITE
      });
      expect(
        (await expectFirestoreError(() => liteUpdateDoc(docRef, { a: 2 })))
          .context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.UPDATE
      });
      expect(
        (await expectFirestoreError(() => liteDeleteDoc(docRef))).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.DELETE
      });

      const addErr = await expectFirestoreError(() =>
        liteAddDoc(colRef, { a: 1 })
      );
      expect(addErr.context?.operation).toBe(FirestoreOperation.WRITE);
      expect(addErr.context?.path).toMatch(/^users\/[^/]+$/);

      expect(
        (
          await expectFirestoreError(() =>
            getAggregate(colRef, { total: count() })
          )
        ).context
      ).toEqual({
        path: 'users',
        operation: FirestoreOperation.LIST
      });
      expect(
        (await expectFirestoreError(() => getCount(groupRef))).context
      ).toEqual({
        path: 'tags',
        operation: FirestoreOperation.LIST
      });

      const singleBatch = liteWriteBatch(liteDb);
      singleBatch.update(docRef, { a: 1 });
      expect(
        (await expectFirestoreError(() => singleBatch.commit())).context
      ).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.UPDATE
      });

      const multiBatch = liteWriteBatch(liteDb);
      multiBatch.set(doc(liteDb, 'users/1'), { a: 1 });
      multiBatch.set(doc(liteDb, 'users/2'), { a: 2 });
      expect(
        (await expectFirestoreError(() => multiBatch.commit())).context
      ).toEqual({
        operation: FirestoreOperation.WRITE
      });

      const txErr = await expectFirestoreError(() =>
        liteRunTransaction(liteDb, async tx => {
          await tx.get(docRef);
        })
      );
      expect(txErr.context).toEqual({
        path: 'users/alice',
        operation: FirestoreOperation.READ
      });

      const pipeErr = await expectFirestoreError(() =>
        liteExecute(liteDb.pipeline().collection('books'))
      );
      expect(pipeErr.context).toEqual({
        path: 'books',
        operation: FirestoreOperation.LIST
      });
    });
  });
});
