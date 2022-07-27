import { expect } from 'chai';
import '../test/setup';
import { match, stub } from 'sinon';
import { readHeartbeatsFromIndexedDB, writeHeartbeatsToIndexedDB } from './indexeddb';
import { FirebaseApp } from './public-types';
import { AppError } from './errors';
import { HeartbeatsInIndexedDB } from './types';

/**
 * Mostly testing failure cases. heartbeatService.test.ts tests read-write
 * more extensively.
 */

describe('IndexedDB functions', () => {
  it('readHeartbeatsFromIndexedDB warns if IndexedDB.open() throws', async () => {
    const warnStub = stub(console, 'warn');
    if (typeof window !== 'undefined') {
      // Ensure that indexedDB.open() fails in browser. It will always fail in Node.
      stub(window.indexedDB, 'open').throws(new Error('abcd'));
      await readHeartbeatsFromIndexedDB({
        name: 'testname',
        options: { appId: 'test-app-id' }
      } as FirebaseApp
      );
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_GET));
    } else {
      await readHeartbeatsFromIndexedDB({
        name: 'testname',
        options: { appId: 'test-app-id' }
      } as FirebaseApp
      );
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_GET));
    }
  });
  it('writeHeartbeatsToIndexedDB warns if IndexedDB.open() throws', async () => {
    const warnStub = stub(console, 'warn');
    if (typeof window !== 'undefined') {
      // Ensure that indexedDB.open() fails in browser. It will always fail in Node.
      stub(window.indexedDB, 'open').throws(new Error('abcd'));
      await writeHeartbeatsToIndexedDB({
        name: 'testname',
        options: { appId: 'test-app-id' }
      } as FirebaseApp,
        {} as HeartbeatsInIndexedDB
      );
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_WRITE));
    } else {
      await writeHeartbeatsToIndexedDB({
        name: 'testname',
        options: { appId: 'test-app-id' }
      } as FirebaseApp,
        {} as HeartbeatsInIndexedDB
      );
      expect(warnStub).to.be.calledWith(match.any, match(AppError.IDB_WRITE));
    }
  });
});