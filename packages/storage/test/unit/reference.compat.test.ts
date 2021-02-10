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
import { FirebaseApp } from '@firebase/app-types';
import { StringFormat } from '../../src/implementation/string';
import { Headers } from '../../src/implementation/xhrio';
import { Metadata } from '../../src/metadata';
import { ReferenceCompat } from '../../compat/reference';
import { StorageServiceCompat } from '../../compat/service';
import * as testShared from './testshared';
import { SendHook, TestingXhrIo } from './xhrio';
import { DEFAULT_HOST } from '../../src/implementation/constants';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { StorageService } from '../../src/service';
import { Reference } from '../../src/reference';

/* eslint-disable @typescript-eslint/no-floating-promises */
function makeFakeService(
  app: FirebaseApp,
  authProvider: Provider<FirebaseAuthInternalName>,
  sendHook: SendHook
): StorageServiceCompat {
  const storageServiceCompat: StorageServiceCompat = new StorageServiceCompat(
    app,
    new StorageService(app, authProvider, testShared.makePool(sendHook))
  );
  return storageServiceCompat;
}

function makeStorage(url: string): ReferenceCompat {
  const service = new StorageService(
    {} as FirebaseApp,
    testShared.emptyAuthProvider,
    testShared.makePool(null)
  );
  const storageServiceCompat: StorageServiceCompat = new StorageServiceCompat(
    {} as FirebaseApp,
    service
  );
  return new ReferenceCompat(new Reference(service, url), storageServiceCompat);
}

describe('Firebase Storage > Reference', () => {
  const root = makeStorage('gs://test-bucket/');
  const child = makeStorage('gs://test-bucket/hello');
  describe('Path constructor', () => {
    it('root', () => {
      expect(root.toString()).to.equal('gs://test-bucket/');
    });
    it('keeps characters after ? on a gs:// string', () => {
      const s = makeStorage('gs://test-bucket/this/ismyobject?hello');
      expect(s.toString()).to.equal('gs://test-bucket/this/ismyobject?hello');
    });
    it("doesn't URL-decode on a gs:// string", () => {
      const s = makeStorage('gs://test-bucket/%3F');
      expect(s.toString()).to.equal('gs://test-bucket/%3F');
    });
    it('ignores URL params and fragments on an http URL', () => {
      const s = makeStorage(
        `http://${DEFAULT_HOST}/v0/b/test-bucket/o/my/object.txt` +
          '?ignoreme#please'
      );
      expect(s.toString()).to.equal('gs://test-bucket/my/object.txt');
    });
    it('URL-decodes and ignores fragment on an http URL', () => {
      const s = makeStorage(
        `http://${DEFAULT_HOST}/v0/b/test-bucket/o/%3F?ignore`
      );
      expect(s.toString()).to.equal('gs://test-bucket/?');
    });

    it('ignores URL params and fragments on an https URL', () => {
      const s = makeStorage(
        `https://${DEFAULT_HOST}/v0/b/test-bucket/o/my/object.txt` +
          '?ignoreme#please'
      );
      expect(s.toString()).to.equal('gs://test-bucket/my/object.txt');
    });

    it('URL-decodes and ignores fragment on an https URL', () => {
      const s = makeStorage(
        `https://${DEFAULT_HOST}/v0/b/test-bucket/o/%3F?ignore`
      );
      expect(s.toString()).to.equal('gs://test-bucket/?');
    });
  });

  describe('toString', () => {
    it("Doesn't add trailing slash", () => {
      const s = makeStorage('gs://test-bucket/foo');
      expect(s.toString()).to.equal('gs://test-bucket/foo');
    });
    it('Strips trailing slash', () => {
      const s = makeStorage('gs://test-bucket/foo/');
      expect(s.toString()).to.equal('gs://test-bucket/foo');
    });
  });

  describe('parent', () => {
    it('Returns null at root', () => {
      expect(root.parent).to.be.null;
    });
    it('Returns root one level down', () => {
      expect(child.parent!.toString()).to.equal('gs://test-bucket/');
    });
    it('Works correctly with empty levels', () => {
      const s = makeStorage('gs://test-bucket/a///');
      expect(s.parent!.toString()).to.equal('gs://test-bucket/a/');
    });
  });

  describe('root', () => {
    it('Returns self at root', () => {
      expect(root.root.toString()).to.equal('gs://test-bucket/');
    });

    it('Returns root multiple levels down', () => {
      const s = makeStorage('gs://test-bucket/a/b/c/d');
      expect(s.root.toString()).to.equal('gs://test-bucket/');
    });
  });

  describe('bucket', () => {
    it('Returns bucket name', () => {
      expect(root.bucket).to.equal('test-bucket');
    });
  });

  describe('fullPath', () => {
    it('Returns full path without leading slash', () => {
      const s = makeStorage('gs://test-bucket/full/path');
      expect(s.fullPath).to.equal('full/path');
    });
  });

  describe('name', () => {
    it('Works at top level', () => {
      const s = makeStorage('gs://test-bucket/toplevel.txt');
      expect(s.name).to.equal('toplevel.txt');
    });

    it('Works at not the top level', () => {
      const s = makeStorage('gs://test-bucket/not/toplevel.txt');
      expect('toplevel.txt').to.equal(s.name);
    });
  });

  describe('child', () => {
    it('works with a simple string', () => {
      expect(root.child('a').toString()).to.equal('gs://test-bucket/a');
    });
    it('drops a trailing slash', () => {
      expect(root.child('ab/').toString()).to.equal('gs://test-bucket/ab');
    });
    it('compresses repeated slashes', () => {
      expect(root.child('//a///b/////').toString()).to.equal(
        'gs://test-bucket/a/b'
      );
    });
    it('works chained multiple times with leading slashes', () => {
      expect(
        root.child('a').child('/b').child('c').child('d/e').toString()
      ).to.equal('gs://test-bucket/a/b/c/d/e');
    });
  });

  it("Doesn't send Authorization on null auth token", done => {
    function newSend(
      xhrio: TestingXhrIo,
      url: string,
      method: string,
      body?: ArrayBufferView | Blob | string | null,
      headers?: Headers
    ): void {
      expect(headers).to.not.be.undefined;
      expect(headers!['Authorization']).to.be.undefined;
      done();
    }

    const service = makeFakeService(
      testShared.fakeApp,
      testShared.emptyAuthProvider,
      newSend
    );
    const ref = service.refFromURL('gs://test-bucket');
    ref.child('foo').getMetadata();
  });

  it('Works if the user logs in before creating the storage reference', done => {
    // Regression test for b/27227221
    function newSend(
      xhrio: TestingXhrIo,
      url: string,
      method: string,
      body?: ArrayBufferView | Blob | string | null,
      headers?: Headers
    ): void {
      expect(headers).to.not.be.undefined;
      expect(headers!['Authorization']).to.equal(
        'Firebase ' + testShared.authToken
      );
      done();
    }

    const service = makeFakeService(
      testShared.fakeApp,
      testShared.fakeAuthProvider,
      newSend
    );
    const ref = service.refFromURL('gs://test-bucket');
    ref.child('foo').getMetadata();
  });

  describe('putString', () => {
    it('Uses metadata.contentType for RAW format', () => {
      // Regression test for b/30989476
      const task = child.putString('hello', StringFormat.RAW, {
        contentType: 'lol/wut'
      } as Metadata);
      expect(task.snapshot.metadata!.contentType).to.equal('lol/wut');
      task.cancel();
    });
    it('Uses embedded content type in DATA_URL format', () => {
      const task = child.putString(
        'data:lol/wat;base64,aaaa',
        StringFormat.DATA_URL
      );
      expect(task.snapshot.metadata!.contentType).to.equal('lol/wat');
      task.cancel();
    });
    it('Lets metadata.contentType override embedded content type in DATA_URL format', () => {
      const task = child.putString(
        'data:ignore/me;base64,aaaa',
        StringFormat.DATA_URL,
        { contentType: 'tomato/soup' } as Metadata
      );
      expect(task.snapshot.metadata!.contentType).to.equal('tomato/soup');
      task.cancel();
    });
  });

  describe('Argument verification', () => {
    describe('list', () => {
      it('throws on invalid maxResults', () => {
        it('throws on invalid maxResults', async () => {
          await expect(child.list({ maxResults: 0 })).to.be.rejectedWith(
            'storage/invalid-argument'
          );
          await expect(child.list({ maxResults: -4 })).to.be.rejectedWith(
            'storage/invalid-argument'
          );
          await expect(child.list({ maxResults: 1001 })).to.be.rejectedWith(
            'storage/invalid-argument'
          );
        });
      });
    });
  });

  describe('root operations', () => {
    it('put throws', () => {
      expect(() => root.put(new Blob(['a']))).to.throw(
        'storage/invalid-root-operation'
      );
    });
    it('putString throws', () => {
      expect(() => root.putString('raw', StringFormat.RAW)).to.throw(
        'storage/invalid-root-operation'
      );
    });
    it('delete throws', () => {
      expect(() => root.delete()).to.throw('storage/invalid-root-operation');
    });
    it('getMetadata throws', async () => {
      await expect(root.getMetadata()).to.be.rejectedWith(
        'storage/invalid-root-operation'
      );
    });
    it('updateMetadata throws', async () => {
      await expect(root.updateMetadata({} as Metadata)).to.be.rejectedWith(
        'storage/invalid-root-operation'
      );
    });
    it('getDownloadURL throws', async () => {
      await expect(root.getDownloadURL()).to.be.rejectedWith(
        'storage/invalid-root-operation'
      );
    });
  });
});
