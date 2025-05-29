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
import { expect, use } from 'chai';
import * as sinon from 'sinon';
import { TaskEvent } from '../../src/implementation/taskenums';
import { Headers } from '../../src/implementation/connection';
import {
  FirebaseStorageImpl,
  ref,
  connectStorageEmulator
} from '../../src/service';
import * as testShared from './testshared';
import { DEFAULT_HOST } from '../../src/implementation/constants';
import { StorageError } from '../../src/implementation/error';
import {
  Reference,
  getMetadata,
  uploadBytesResumable,
  getDownloadURL
} from '../../src/reference';
import { Location } from '../../src/implementation/location';
import { newTestConnection, TestingConnection } from './connection';
import { injectTestConnection } from '../../src/platform/connection';
import sinonChai from 'sinon-chai';

const fakeAppGs = testShared.makeFakeApp('gs://mybucket');
const fakeAppGsEndingSlash = testShared.makeFakeApp('gs://mybucket/');
const fakeAppInvalidGs = testShared.makeFakeApp('gs://mybucket/hello');
const testLocation = new Location('bucket', 'object');
use(sinonChai);

function makeGsUrl(child: string = ''): string {
  return 'gs://' + testShared.bucket + '/' + child;
}

describe('Firebase Storage > Service', () => {
  before(() => injectTestConnection(newTestConnection));
  after(() => injectTestConnection(null));

  describe('simple constructor', () => {
    const service = new FirebaseStorageImpl(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      testShared.fakeAppCheckTokenProvider
    );
    it('Root refs point to the right place', () => {
      const reference = ref(service);
      expect(reference.toString()).to.equal(makeGsUrl());
    });
    it('Child refs point to the right place', () => {
      const reference = ref(service, 'path/to/child');
      expect(reference.toString()).to.equal(makeGsUrl('path/to/child'));
    });
  });
  describe('custom bucket constructor', () => {
    it('gs:// custom bucket constructor refs point to the right place', () => {
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider,
        'gs://foo-bar.appspot.com'
      );
      const reference = ref(service);
      expect(reference.toString()).to.equal('gs://foo-bar.appspot.com/');
    });
    it('http:// custom bucket constructor refs point to the right place', () => {
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider,
        `http://${DEFAULT_HOST}/v1/b/foo-bar.appspot.com/o`
      );
      const reference = ref(service);
      expect(reference.toString()).to.equal('gs://foo-bar.appspot.com/');
    });
    it('https:// custom bucket constructor refs point to the right place', () => {
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider,
        `https://${DEFAULT_HOST}/v1/b/foo-bar.appspot.com/o`
      );
      const reference = ref(service);
      expect(reference.toString()).to.equal('gs://foo-bar.appspot.com/');
    });

    it('Bare bucket name constructor refs point to the right place', () => {
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider,
        'foo-bar.appspot.com'
      );
      const reference = ref(service);
      expect(reference.toString()).to.equal('gs://foo-bar.appspot.com/');
    });
    it('Child refs point to the right place', () => {
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider,
        'foo-bar.appspot.com'
      );
      const reference = ref(service, 'path/to/child');
      expect(reference.toString()).to.equal(
        'gs://foo-bar.appspot.com/path/to/child'
      );
    });
    it('Throws trying to construct with a gs:// URL containing an object path', () => {
      const error = testShared.assertThrows(() => {
        new FirebaseStorageImpl(
          testShared.fakeApp,
          testShared.fakeAuthProvider,
          testShared.fakeAppCheckTokenProvider,
          'gs://bucket/object/'
        );
      }, 'storage/invalid-default-bucket');
      expect(error.message).to.match(/Invalid default bucket/);
    });
  });
  describe('default bucket config', () => {
    it('gs:// works without ending slash', () => {
      const service = new FirebaseStorageImpl(
        fakeAppGs,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider
      );
      expect(ref(service)?.toString()).to.equal('gs://mybucket/');
    });
    it('gs:// works with ending slash', () => {
      const service = new FirebaseStorageImpl(
        fakeAppGsEndingSlash,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider
      );
      expect(ref(service)?.toString()).to.equal('gs://mybucket/');
    });
    it('Throws when config bucket is gs:// with an object path', () => {
      testShared.assertThrows(() => {
        new FirebaseStorageImpl(
          fakeAppInvalidGs,
          testShared.fakeAuthProvider,
          testShared.fakeAppCheckTokenProvider
        );
      }, 'storage/invalid-default-bucket');
    });
  });
  describe('ref(service, url)', () => {
    const service = new FirebaseStorageImpl(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      testShared.fakeAppCheckTokenProvider
    );
    it('Works with gs:// URLs', () => {
      const reference = ref(service, 'gs://mybucket/child/path/image.png');
      expect(reference.toString()).to.equal(
        'gs://mybucket/child/path/image.png'
      );
    });
    it('Works with http:// URLs', () => {
      const reference = ref(
        service,
        `http://${DEFAULT_HOST}/v0/b/` +
          'mybucket/o/child%2Fpath%2Fimage.png?downloadToken=hello'
      );
      expect(reference.toString()).to.equal(
        'gs://mybucket/child/path/image.png'
      );
    });
    it('Works with https:// URLs', () => {
      const reference = ref(
        service,
        `https://${DEFAULT_HOST}/v0/b/` +
          'mybucket/o/child%2Fpath%2Fimage.png?downloadToken=hello'
      );
      expect(reference.toString()).to.equal(
        'gs://mybucket/child/path/image.png'
      );
    });
    it('Works with storage.googleapis.com URLs', () => {
      const reference = ref(
        service,
        `https://storage.googleapis.com/mybucket/path%20with%20space/image.png`
      );
      expect(reference.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
    it('Works with storage.googleapis.com URLs with query params', () => {
      const reference = ref(
        service,
        `https://storage.googleapis.com/mybucket/path%20with%20space/image.png?X-Goog-Algorithm=
GOOG4-RSA-SHA256`
      );
      expect(reference.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
    it('Works with storage.cloud.google.com URLs', () => {
      const reference = ref(
        service,
        `https://storage.cloud.google.com/mybucket/path%20with%20space/image.png`
      );
      expect(reference.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
    it('Works with storage.cloud.google.com URLs and escaped slash', () => {
      const reference = ref(
        service,
        `https://storage.cloud.google.com/mybucket/path%20with%20space%2Fimage.png`
      );
      expect(reference.toString()).to.equal(
        'gs://mybucket/path with space/image.png'
      );
    });
  });
  describe('connectStorageEmulator(service, host, port, options)', () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });
    afterEach(() => {
      sandbox.restore();
    });
    it('sets emulator host correctly', done => {
      function newSend(connection: TestingConnection, url: string): void {
        // Expect emulator host to be in url of storage operations requests,
        // in this case getDownloadURL.
        expect(url).to.match(/^http:\/\/test\.host\.org:1234.+/);
        connection.abort();
        injectTestConnection(null);
        done();
      }

      injectTestConnection(() => newTestConnection(newSend));
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider
      );
      connectStorageEmulator(service, 'test.host.org', 1234);
      expect(service.host).to.equal('test.host.org:1234');
      expect(service._protocol).to.equal('http');
      void getDownloadURL(ref(service, 'test.png'));
    });
    it('sets emulator host correctly with ssl', done => {
      function newSend(connection: TestingConnection, url: string): void {
        // Expect emulator host to be in url of storage operations requests,
        // in this case getDownloadURL.
        expect(url).to.match(/^https:\/\/test\.cloudworkstations\.dev:1234.+/);
        connection.abort();
        injectTestConnection(null);
        done();
      }

      injectTestConnection(() => newTestConnection(newSend));
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider
      );
      const workstationHost = 'test.cloudworkstations.dev';
      connectStorageEmulator(service, workstationHost, 1234);
      expect(service.host).to.equal(`${workstationHost}:1234`);
      expect(service._protocol).to.equal('https');
      void getDownloadURL(ref(service, 'test.png'));
    });
    it('sets mock user token string if specified', done => {
      const mockUserToken = 'my-mock-user-token';
      function newSend(
        connection: TestingConnection,
        url: string,
        method: string,
        body?: ArrayBufferView | Blob | string | null,
        headers?: Headers
      ): void {
        // Expect emulator host to be in url of storage operations requests,
        // in this case getDownloadURL.
        expect(url).to.match(/^http:\/\/test\.host\.org:1234.+/);
        expect(headers?.['Authorization']).to.eql(`Firebase ${mockUserToken}`);
        connection.abort();
        injectTestConnection(null);
        done();
      }
      injectTestConnection(() => newTestConnection(newSend));
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider
      );
      connectStorageEmulator(service, 'test.host.org', 1234, { mockUserToken });
      expect(service.host).to.equal('test.host.org:1234');
      expect(service._protocol).to.equal('http');
      expect(service._overrideAuthToken).to.equal(mockUserToken);
      void getDownloadURL(ref(service, 'test.png'));
    });
    it('creates mock user token from object if specified', done => {
      let token: string | undefined = undefined;
      function newSend(
        connection: TestingConnection,
        url: string,
        method: string,
        body?: ArrayBufferView | Blob | string | null,
        headers?: Headers
      ): void {
        // Expect emulator host to be in url of storage operations requests,
        // in this case getDownloadURL.
        expect(url).to.match(/^http:\/\/test\.host\.org:1234.+/);
        expect(headers?.['Authorization']).to.eql(`Firebase ${token}`);
        connection.abort();
        injectTestConnection(null);
        done();
      }
      injectTestConnection(() => newTestConnection(newSend));
      const service = new FirebaseStorageImpl(
        testShared.fakeApp,
        testShared.fakeAuthProvider,
        testShared.fakeAppCheckTokenProvider
      );
      connectStorageEmulator(service, 'test.host.org', 1234, {
        mockUserToken: { sub: 'alice' }
      });
      expect(service.host).to.equal('test.host.org:1234');
      expect(service._protocol).to.equal('http');
      token = service._overrideAuthToken;
      // Token should be an unsigned JWT with header { "alg": "none", "type": "JWT" } (base64url):
      expect(token).to.match(/^eyJhbGciOiJub25lIiwidHlwZSI6IkpXVCJ9\./);
      void getDownloadURL(ref(service, 'test.png'));
    });
  });
  describe('ref(service, path)', () => {
    const service = new FirebaseStorageImpl(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      testShared.fakeAppCheckTokenProvider
    );
    it('Works with non URL paths', () => {
      const newRef = ref(service, 'child/path/image.png');
      expect(newRef.toString()).to.equal('gs://mybucket/child/path/image.png');
    });
    it('Works with no path', () => {
      const newRef = ref(service);
      expect(newRef.toString()).to.equal('gs://mybucket/');
    });
  });
  describe('ref(reference, path)', () => {
    const service = new FirebaseStorageImpl(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      testShared.fakeAppCheckTokenProvider
    );
    const reference = new Reference(service, testLocation);
    it('Throws calling ref(reference, path) with a gs:// URL', () => {
      const error = testShared.assertThrows(() => {
        ref(reference, 'gs://bucket/object');
      }, 'storage/invalid-argument');
      expect(error.message).to.match(/url/);
    });
    it('Throws calling ref(reference, path) with an http:// URL', () => {
      const error = testShared.assertThrows(() => {
        ref(reference, `http://${DEFAULT_HOST}/etc`);
      }, 'storage/invalid-argument');
      expect(error.message).to.match(/url/);
    });
    it('Throws calling ref(reference, path) with an https:// URL', () => {
      const error = testShared.assertThrows(() => {
        ref(reference, `https://${DEFAULT_HOST}/etc`);
      }, 'storage/invalid-argument');
      expect(error.message).to.match(/url/);
    });
    it('Works with non URL paths', () => {
      const newRef = ref(reference, 'child/path/image.png');
      expect(newRef.toString()).to.equal(
        'gs://bucket/object/child/path/image.png'
      );
    });
    it('Works with no path', () => {
      const newRef = ref(reference);
      expect(newRef.toString()).to.equal('gs://bucket/object');
    });
  });

  describe('Deletion', () => {
    const service = new FirebaseStorageImpl(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      testShared.fakeAppCheckTokenProvider
    );
    it('In-flight requests are canceled when the service is deleted', async () => {
      const reference = ref(service, 'gs://mybucket/image.jpg');
      const metadataPromise = getMetadata(reference);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      service._delete();
      await expect(metadataPromise).to.be.rejectedWith('storage/app-deleted');
    });
    it('Requests fail when started after the service is deleted', async () => {
      const reference = ref(service, 'gs://mybucket/image.jpg');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      service._delete();
      await expect(getMetadata(reference)).to.be.rejectedWith(
        'storage/app-deleted'
      );
    });
    it('Running uploads fail when the service is deleted', () => {
      const reference = ref(service, 'gs://mybucket/image.jpg');
      const toReturn = new Promise<void>((resolve, reject) => {
        uploadBytesResumable(reference, new Uint8Array([97])).on(
          TaskEvent.STATE_CHANGED,
          undefined,
          (err: StorageError | Error) => {
            expect((err as StorageError).code).to.equal('storage/app-deleted');
            resolve();
          },
          () => {
            reject('Upload completed, should have been canceled');
          }
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        service._delete();
      });
      return toReturn;
    });
  });

  describe('Argument verification', () => {
    const service = new FirebaseStorageImpl(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      testShared.fakeAppCheckTokenProvider
    );
    describe('setMaxUploadRetryTime', () => {
      it('Throws on negative arg', () => {
        testShared.assertThrows(
          () => (service.maxOperationRetryTime = -10),
          'storage/invalid-argument'
        );
      });
    });
    describe('setMaxOperationRetryTime', () => {
      it('Throws on negative arg', () => {
        testShared.assertThrows(
          () => (service.maxOperationRetryTime = -10),
          'storage/invalid-argument'
        );
      });
    });
  });
});
