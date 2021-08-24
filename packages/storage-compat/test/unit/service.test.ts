/**
 * @license
 * Copyright 2020 Google LLC
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
import '../setup';
import { expect } from 'chai';
import { stub } from 'sinon';
import * as modularStorage from '@firebase/storage';
import { makeTestCompatStorage, fakeApp, fakeStorage } from '../utils';
import {
  FirebaseStorage,
  getStorage,
  FirebaseStorageError
} from '@firebase/storage';
import firebase from '@firebase/app-compat';
import { StorageServiceCompat } from '../../src/service';
import { FirebaseApp } from '@firebase/app-types';

const DEFAULT_HOST = 'firebasestorage.googleapis.com';

describe('Firebase Storage > Service', () => {
  describe('useEmulator(host, port)', () => {
    it('calls connectStorageEmulator() correctly', () => {
      const connectStorageEmulatorStub = stub(
        modularStorage,
        'connectStorageEmulator'
      ).callsFake(() => {});
      const service = makeTestCompatStorage(fakeApp, fakeStorage);
      service.useEmulator('test.host.org', 1234);

      expect(connectStorageEmulatorStub).to.have.been.calledWithExactly(
        fakeStorage,
        'test.host.org',
        1234,
        {}
      );
    });
  });

  describe('refFromURL', () => {
    let service: StorageServiceCompat;
    let testCompatApp: FirebaseApp;
    let testModularStorage: FirebaseStorage;
    before(() => {
      testCompatApp = firebase.initializeApp({});
      testModularStorage = getStorage(testCompatApp);
      service = makeTestCompatStorage(testCompatApp, testModularStorage);
    });

    after(() => {
      return testCompatApp.delete();
    });

    it('Works with gs:// URLs', () => {
      const ref = service.refFromURL('gs://mybucket/child/path/image.png');
      expect(ref.toString()).to.equal('gs://mybucket/child/path/image.png');
    });
    it('Works with http:// URLs', () => {
      const ref = service.refFromURL(
        `http://${DEFAULT_HOST}/v0/b/` +
          'mybucket/o/child%2Fpath%2Fimage.png?downloadToken=hello'
      );
      expect(ref.toString()).to.equal('gs://mybucket/child/path/image.png');
    });
    it('Works with https:// URLs', () => {
      const ref = service.refFromURL(
        `https://${DEFAULT_HOST}/v0/b/` +
          'mybucket/o/child%2Fpath%2Fimage.png?downloadToken=hello'
      );
      expect(ref.toString()).to.equal('gs://mybucket/child/path/image.png');
    });
    it('Works with storage.googleapis.com URLs', () => {
      const ref = service.refFromURL(
        `https://storage.googleapis.com/mybucket/path%20with%20space/image.png`
      );
      expect(ref.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
    it('Works with storage.googleapis.com URLs with query params', () => {
      const ref = service.refFromURL(
        `https://storage.googleapis.com/mybucket/path%20with%20space/image.png?X-Goog-Algorithm=
GOOG4-RSA-SHA256`
      );
      expect(ref.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
    it('Works with storage.cloud.google.com URLs', () => {
      const ref = service.refFromURL(
        `https://storage.cloud.google.com/mybucket/path%20with%20space/image.png`
      );
      expect(ref.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
    it('Works with storage.cloud.google.com URLs and escaped slash', () => {
      const ref = service.refFromURL(
        `https://storage.cloud.google.com/mybucket/path%20with%20space%2Fimage.png`
      );
      expect(ref.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
  });

  describe('Argument verification', () => {
    let service: StorageServiceCompat;
    let testCompatApp: FirebaseApp;
    let testModularStorage: FirebaseStorage;
    before(() => {
      testCompatApp = firebase.initializeApp({});
      testModularStorage = getStorage(testCompatApp);
      service = makeTestCompatStorage(testCompatApp, testModularStorage);
    });

    after(() => {
      return testCompatApp.delete();
    });

    describe('ref', () => {
      it('Throws on gs:// argument', () => {
        expect(() => service.ref('gs://yo')).to.throw(
          'storage/invalid-argument'
        );
      });
    });

    describe('refFromURL', () => {
      it('Throws with a non-URL string arg', () => {
        expect(() => {
          service.refFromURL('child');
        }).to.throw(
          /expected a full URL but got a child path.*storage\/invalid-argument/i
        );
      });
      it('Throws with an invalid URL arg', () => {
        expect(() => {
          service.refFromURL('notlegit://url');
        }).to.throw('storage/invalid-argument');
      });
    });

    describe('MaxUploadRetryTime', () => {
      const modularStorage = {} as FirebaseStorage;
      const service = makeTestCompatStorage(fakeApp, modularStorage);
      it('reads from the modular instance', () => {
        modularStorage.maxUploadRetryTime = 999;
        expect(service.maxUploadRetryTime).to.equal(999);
      });

      it('sets value on the modular instance', () => {
        service.setMaxUploadRetryTime(888);
        expect(modularStorage.maxUploadRetryTime).to.equal(888);
      });
    });
    describe('MaxOperationRetryTime', () => {
      const modularStorage = {} as FirebaseStorage;
      const service = makeTestCompatStorage(fakeApp, modularStorage);
      it('reads from the modular instance', () => {
        modularStorage.maxOperationRetryTime = 999;
        expect(service.maxOperationRetryTime).to.equal(999);
      });

      it('sets value on the modular instance', () => {
        service.setMaxOperationRetryTime(888);
        expect(modularStorage.maxOperationRetryTime).to.equal(888);
      });
    });
  });

  describe('Deletion', () => {
    let service: StorageServiceCompat;
    let testCompatApp: FirebaseApp;
    let testModularStorage: FirebaseStorage;
    before(() => {
      testCompatApp = firebase.initializeApp({});
      testModularStorage = getStorage(testCompatApp);
      service = makeTestCompatStorage(testCompatApp, testModularStorage);
    });

    after(() => {
      return testCompatApp.delete();
    });

    it('In-flight requests are canceled when the service is deleted', async () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      const metadataPromise = ref.getMetadata();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      service._delegate._delete();
      await expect(metadataPromise).to.be.rejectedWith('storage/app-deleted');
    });
    it('Requests fail when started after the service is deleted', async () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      service._delegate._delete();

      await expect(ref.getMetadata()).to.be.rejectedWith('storage/app-deleted');
    });
    it('Running uploads fail when the service is deleted', () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      const toReturn = new Promise<void>((resolve, reject) => {
        ref.put(new Uint8Array([97])).on(
          'state_changed',
          null,
          (err: FirebaseStorageError | Error) => {
            expect((err as FirebaseStorageError).code).to.equal(
              'storage/app-deleted'
            );
            resolve();
          },
          () => {
            reject('Upload completed, should have been canceled');
          }
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        service._delegate._delete();
      });
      return toReturn;
    });
  });
});
