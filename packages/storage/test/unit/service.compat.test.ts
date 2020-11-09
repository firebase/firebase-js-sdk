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
import { expect } from 'chai';
import { TaskEvent } from '../../src/implementation/taskenums';
import { XhrIoPool } from '../../src/implementation/xhriopool';
import { StorageServiceCompat } from '../../compat/service';
import * as testShared from './testshared';
import { DEFAULT_HOST } from '../../src/implementation/constants';
import { FirebaseStorageError } from '../../src/implementation/error';
import { StorageService } from '../../src/service';
import { FirebaseApp } from '@firebase/app-types';
import { Provider } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';

const fakeAppGs = testShared.makeFakeApp('gs://mybucket');
const fakeAppGsEndingSlash = testShared.makeFakeApp('gs://mybucket/');
const fakeAppInvalidGs = testShared.makeFakeApp('gs://mybucket/hello');
const xhrIoPool = new XhrIoPool();

function makeGsUrl(child: string = ''): string {
  return 'gs://' + testShared.bucket + '/' + child;
}

function makeService(
  app: FirebaseApp,
  authProvider: Provider<FirebaseAuthInternalName>,
  pool: XhrIoPool,
  url?: string
): StorageServiceCompat {
  const storageServiceCompat: StorageServiceCompat = new StorageServiceCompat(
    app,
    new StorageService(app, authProvider, pool, url)
  );
  return storageServiceCompat;
}

describe('Firebase Storage > Service', () => {
  describe('simple constructor', () => {
    const service = makeService(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      xhrIoPool
    );
    it('Root refs point to the right place', () => {
      const ref = service.ref();
      expect(ref.toString()).to.equal(makeGsUrl());
    });
    it('Child refs point to the right place', () => {
      const ref = service.ref('path/to/child');
      expect(ref.toString()).to.equal(makeGsUrl('path/to/child'));
    });
    it('Throws calling ref with a gs:// URL', () => {
      const error = testShared.assertThrows(() => {
        service.ref('gs://bucket/object');
      }, 'storage/invalid-argument');
      expect(error.message).to.match(/refFromURL/);
    });
    it('Throws calling ref with an http:// URL', () => {
      const error = testShared.assertThrows(() => {
        service.ref(`http://${DEFAULT_HOST}/etc`);
      }, 'storage/invalid-argument');
      expect(error.message).to.match(/refFromURL/);
    });
    it('Throws calling ref with an https:// URL', () => {
      const error = testShared.assertThrows(() => {
        service.ref(`https://${DEFAULT_HOST}/etc`);
      }, 'storage/invalid-argument');
      expect(error.message).to.match(/refFromURL/);
    });
  });
  describe('custom bucket constructor', () => {
    it('gs:// custom bucket constructor refs point to the right place', () => {
      const service = makeService(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        xhrIoPool,
        'gs://foo-bar.appspot.com'
      );
      const ref = service.ref();
      expect(ref.toString()).to.equal('gs://foo-bar.appspot.com/');
    });
    it('http:// custom bucket constructor refs point to the right place', () => {
      const service = makeService(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        xhrIoPool,
        `http://${DEFAULT_HOST}/v1/b/foo-bar.appspot.com/o`
      );
      const ref = service.ref();
      expect(ref.toString()).to.equal('gs://foo-bar.appspot.com/');
    });
    it('https:// custom bucket constructor refs point to the right place', () => {
      const service = makeService(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        xhrIoPool,
        `https://${DEFAULT_HOST}/v1/b/foo-bar.appspot.com/o`
      );
      const ref = service.ref();
      expect(ref.toString()).to.equal('gs://foo-bar.appspot.com/');
    });

    it('Bare bucket name constructor refs point to the right place', () => {
      const service = makeService(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        xhrIoPool,
        'foo-bar.appspot.com'
      );
      const ref = service.ref();
      expect(ref.toString()).to.equal('gs://foo-bar.appspot.com/');
    });
    it('Child refs point to the right place', () => {
      const service = makeService(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        xhrIoPool,
        'foo-bar.appspot.com'
      );
      const ref = service.ref('path/to/child');
      expect(ref.toString()).to.equal('gs://foo-bar.appspot.com/path/to/child');
    });
    it('Throws trying to construct with a gs:// URL containing an object path', () => {
      const error = testShared.assertThrows(() => {
        makeService(
          testShared.fakeApp,
          testShared.fakeAuthProvider,
          xhrIoPool,
          'gs://bucket/object/'
        );
      }, 'storage/invalid-default-bucket');
      expect(error.message).to.match(/Invalid default bucket/);
    });
  });
  describe('default bucket config', () => {
    it('gs:// works without ending slash', () => {
      const service = makeService(
        fakeAppGs,
        testShared.fakeAuthProvider,
        xhrIoPool
      );
      expect(service.ref().toString()).to.equal('gs://mybucket/');
    });
    it('gs:// works with ending slash', () => {
      const service = makeService(
        fakeAppGsEndingSlash,
        testShared.fakeAuthProvider,
        xhrIoPool
      );
      expect(service.ref().toString()).to.equal('gs://mybucket/');
    });
    it('Throws when config bucket is gs:// with an object path', () => {
      testShared.assertThrows(() => {
        makeService(fakeAppInvalidGs, testShared.fakeAuthProvider, xhrIoPool);
      }, 'storage/invalid-default-bucket');
    });
  });
  describe('refFromURL', () => {
    const service = makeService(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      xhrIoPool
    );
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
    const service = makeService(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      xhrIoPool
    );
    describe('ref', () => {
      it('Throws on gs:// argument', () => {
        testShared.assertThrows(
          testShared.bind(service.ref, service, 'gs://yo'),
          'storage/invalid-argument'
        );
      });
    });
    describe('refFromURL', () => {
      it('Throws with a non-URL string arg', () => {
        const error = testShared.assertThrows(
          testShared.bind(service.refFromURL, service, 'child'),
          'storage/invalid-argument'
        );
        expect(error.message).to.match(
          /expected a full URL but got a child path/i
        );
      });
      it('Throws with an invalid URL arg', () => {
        testShared.assertThrows(
          testShared.bind(service.refFromURL, service, 'notlegit://url'),
          'storage/invalid-argument'
        );
      });
    });
    describe('setMaxUploadRetryTime', () => {
      it('Throws on negative arg', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxUploadRetryTime, service, -10),
          'storage/invalid-argument'
        );
      });
    });
    describe('setMaxOperationRetryTime', () => {
      it('Throws on negative arg', () => {
        testShared.assertThrows(
          testShared.bind(service.setMaxOperationRetryTime, service, -10),
          'storage/invalid-argument'
        );
      });
    });
  });

  describe('Deletion', () => {
    const service = makeService(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      xhrIoPool
    );
    it('In-flight requests are canceled when the service is deleted', async () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      const metadataPromise = ref.getMetadata();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      service.INTERNAL.delete();
      await expect(metadataPromise).to.be.rejectedWith('storage/app-deleted');
    });
    it('Requests fail when started after the service is deleted', async () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      service.INTERNAL.delete();

      await expect(ref.getMetadata()).to.be.rejectedWith('storage/app-deleted');
    });
    it('Running uploads fail when the service is deleted', () => {
      const ref = service.refFromURL('gs://mybucket/image.jpg');
      const toReturn = new Promise((resolve, reject) => {
        ref.put(new Blob(['a'])).on(
          TaskEvent.STATE_CHANGED,
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
        service.INTERNAL.delete();
      });
      return toReturn;
    });
  });
});
