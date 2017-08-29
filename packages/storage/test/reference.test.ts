/**
* Copyright 2017 Google Inc.
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
import { assert } from 'chai';
import { FirebaseApp } from '@firebase/app';
import { AuthWrapper } from '../src/implementation/authwrapper';
import { makeRequest } from '../src/implementation/request';
import { StringFormat } from '../src/implementation/string';
import { Headers } from '../src/implementation/xhrio';
import { Metadata } from '../src/metadata';
import { Reference } from '../src/reference';
import { Service } from '../src/service';
import * as testShared from './testshared';
import { SendHook, TestingXhrIo } from './xhrio';

function makeFakeService(app: FirebaseApp, sendHook: SendHook): Service {
  return new Service(app, testShared.makePool(sendHook));
}

function makeStorage(url: string) {
  function maker(wrapper, loc) {
    return ({} as any) as Reference;
  }
  const authWrapper = new AuthWrapper(
    null,
    maker,
    makeRequest,
    ({} as any) as Service,
    testShared.makePool(null)
  );
  return new Reference(authWrapper, url);
}

describe('Firebase Storage > Reference', () => {
  const root = makeStorage('gs://test-bucket/');
  const child = makeStorage('gs://test-bucket/hello');
  describe('Path constructor', () => {
    it('root', () => {
      assert.equal(root.toString(), 'gs://test-bucket/');
    });
    it('keeps characters after ? on a gs:// string', () => {
      const s = makeStorage('gs://test-bucket/this/ismyobject?hello');
      assert.equal(s.toString(), 'gs://test-bucket/this/ismyobject?hello');
    });
    it("doesn't URL-decode on a gs:// string", () => {
      const s = makeStorage('gs://test-bucket/%3F');
      assert.equal(s.toString(), 'gs://test-bucket/%3F');
    });
    it('ignores URL params and fragments on an http URL', () => {
      const s = makeStorage(
        'http://firebasestorage.googleapis.com/v0/b/test-bucket/o/my/object.txt' +
          '?ignoreme#please'
      );
      assert.equal(s.toString(), 'gs://test-bucket/my/object.txt');
    });
    it('URL-decodes and ignores fragment on an http URL', () => {
      const s = makeStorage(
        'http://firebasestorage.googleapis.com/v0/b/test-bucket/o/%3F?ignore'
      );
      assert.equal(s.toString(), 'gs://test-bucket/?');
    });

    it('ignores URL params and fragments on an https URL', () => {
      const s = makeStorage(
        'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/my/object.txt' +
          '?ignoreme#please'
      );
      assert.equal(s.toString(), 'gs://test-bucket/my/object.txt');
    });

    it('URL-decodes and ignores fragment on an https URL', () => {
      const s = makeStorage(
        'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/%3F?ignore'
      );
      assert.equal(s.toString(), 'gs://test-bucket/?');
    });
  });

  describe('toString', () => {
    it("Doesn't add trailing slash", () => {
      const s = makeStorage('gs://test-bucket/foo');
      assert.equal(s.toString(), 'gs://test-bucket/foo');
    });
    it('Strips trailing slash', () => {
      const s = makeStorage('gs://test-bucket/foo/');
      assert.equal(s.toString(), 'gs://test-bucket/foo');
    });
  });

  describe('parent', () => {
    it('Returns null at root', () => {
      assert.isNull(root.parent);
    });
    it('Returns root one level down', () => {
      assert.equal(child.parent.toString(), 'gs://test-bucket/');
    });
    it('Works correctly with empty levels', () => {
      const s = makeStorage('gs://test-bucket/a///');
      assert.equal(s.parent.toString(), 'gs://test-bucket/a/');
    });
  });

  describe('root', () => {
    it('Returns self at root', () => {
      assert.equal(root.root.toString(), 'gs://test-bucket/');
    });

    it('Returns root multiple levels down', () => {
      const s = makeStorage('gs://test-bucket/a/b/c/d');
      assert.equal(s.root.toString(), 'gs://test-bucket/');
    });
  });

  describe('bucket', () => {
    it('Returns bucket name', () => {
      assert.equal(root.bucket, 'test-bucket');
    });
  });

  describe('fullPath', () => {
    it('Returns full path without leading slash', () => {
      const s = makeStorage('gs://test-bucket/full/path');
      assert.equal(s.fullPath, 'full/path');
    });
  });

  describe('name', () => {
    it('Works at top level', () => {
      const s = makeStorage('gs://test-bucket/toplevel.txt');
      assert.equal(s.name, 'toplevel.txt');
    });

    it('Works at not the top level', () => {
      const s = makeStorage('gs://test-bucket/not/toplevel.txt');
      assert.equal('toplevel.txt', s.name);
    });
  });

  describe('child', () => {
    it('works with a simple string', () => {
      assert.equal(root.child('a').toString(), 'gs://test-bucket/a');
    });
    it('drops a trailing slash', () => {
      assert.equal(root.child('ab/').toString(), 'gs://test-bucket/ab');
    });
    it('compresses repeated slashes', () => {
      assert.equal(
        root.child('//a///b/////').toString(),
        'gs://test-bucket/a/b'
      );
    });
    it('works chained multiple times with leading slashes', () => {
      assert.equal(
        root.child('a').child('/b').child('c').child('d/e').toString(),
        'gs://test-bucket/a/b/c/d/e'
      );
    });
  });

  it("Doesn't send Authorization on null auth token", done => {
    function newSend(
      xhrio: TestingXhrIo,
      url: string,
      method: string,
      body?: ArrayBufferView | Blob | string | null,
      headers?: Headers
    ) {
      assert.isDefined(headers);
      assert.isUndefined(headers['Authorization']);
      done();
    }

    const service = makeFakeService(testShared.fakeAppNoAuth, newSend);
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
    ) {
      assert.isDefined(headers);
      assert.equal(
        headers['Authorization'],
        'Firebase ' + testShared.authToken
      );
      done();
    }

    const service = makeFakeService(testShared.fakeApp, newSend);
    const ref = service.refFromURL('gs://test-bucket');
    ref.child('foo').getMetadata();
  });

  describe('putString', () => {
    it('Uses metadata.contentType for RAW format', () => {
      // Regression test for b/30989476
      const task = child.putString(
        'hello',
        StringFormat.RAW,
        { contentType: 'lol/wut' } as Metadata
      );
      assert.equal(task.snapshot.metadata.contentType, 'lol/wut');
      task.cancel();
    });
    it('Uses embedded content type in DATA_URL format', () => {
      const task = child.putString(
        'data:lol/wat;base64,aaaa',
        StringFormat.DATA_URL
      );
      assert.equal(task.snapshot.metadata.contentType, 'lol/wat');
      task.cancel();
    });
    it('Lets metadata.contentType override embedded content type in DATA_URL format', () => {
      const task = child.putString(
        'data:ignore/me;base64,aaaa',
        StringFormat.DATA_URL,
        { contentType: 'tomato/soup' } as Metadata
      );
      assert.equal(task.snapshot.metadata.contentType, 'tomato/soup');
      task.cancel();
    });
  });

  describe('Argument verification', () => {
    describe('child', () => {
      it('throws on no args', () => {
        testShared.assertThrows(
          testShared.bind(root.child, root),
          'storage/invalid-argument-count'
        );
      });
      it('throws on null instead of path', () => {
        testShared.assertThrows(
          testShared.bind(root.child, root, null),
          'storage/invalid-argument'
        );
      });
      it('throws on number instead of path', () => {
        testShared.assertThrows(
          testShared.bind(root.child, root, 3),
          'storage/invalid-argument'
        );
      });
    });

    describe('toString', () => {
      it('throws on number arg', () => {
        testShared.assertThrows(
          testShared.bind(root.toString, root, 3),
          'storage/invalid-argument-count'
        );
      });
    });

    describe('put', () => {
      const blob = new Blob(['a']);
      it('throws on no arguments', () => {
        testShared.assertThrows(
          testShared.bind(child.put, child),
          'storage/invalid-argument-count'
        );
      });
      it('throws on number instead of metadata', () => {
        testShared.assertThrows(
          testShared.bind(child.put, child, new Blob([]), 3),
          'storage/invalid-argument'
        );
      });
      it('throws on number instead of data', () => {
        testShared.assertThrows(
          testShared.bind(child.put, child, 3),
          'storage/invalid-argument'
        );
      });
      it('throws null instead of data', () => {
        testShared.assertThrows(
          testShared.bind(child.put, child, null),
          'storage/invalid-argument'
        );
      });
      it("doesn't throw on good metadata", () => {
        const goodMetadata = {
          md5Hash: 'a',
          cacheControl: 'done',
          contentDisposition: 'legit',
          contentEncoding: 'identity',
          contentLanguage: 'en',
          contentType: 'text/legit'
        };
        assert.doesNotThrow(() => {
          const task = child.put(blob, goodMetadata as Metadata);
          task.cancel();
        });
      });
      it('throws when customMetadata is a string instead of an object', () => {
        const badCustomMetadata = {
          md5Hash: 'a',
          cacheControl: 'done',
          contentDisposition: 'legit',
          contentEncoding: 'identity',
          contentLanguage: 'en',
          contentType: 'text/legit',
          customMetadata: 'yo'
        };
        testShared.assertThrows(
          testShared.bind(child.put, child, blob, badCustomMetadata),
          'storage/invalid-argument'
        );
      });
      it('throws when object is supplied instead of string', () => {
        const objectInsteadOfStringInMetadata = {
          md5Hash: { real: 'hash' },
          cacheControl: 'done',
          contentDisposition: 'legit',
          contentEncoding: 'identity',
          contentLanguage: 'en',
          contentType: 'text/legit'
        };
        testShared.assertThrows(
          testShared.bind(
            child.put,
            child,
            blob,
            objectInsteadOfStringInMetadata
          ),
          'storage/invalid-argument'
        );
      });
    });

    describe('putString', () => {
      it('throws on no arguments', () => {
        testShared.assertThrows(
          testShared.bind(child.putString, child),
          'storage/invalid-argument-count'
        );
      });
      it('throws on invalid format', () => {
        testShared.assertThrows(
          testShared.bind(child.putString, child, 'raw', 'notaformat'),
          'storage/invalid-argument'
        );
      });
      it('throws on number instead of string', () => {
        testShared.assertThrows(
          testShared.bind(child.putString, child, 3, StringFormat.RAW),
          'storage/invalid-argument'
        );
      });
      it('throws on invalid metadata', () => {
        testShared.assertThrows(
          testShared.bind(child.putString, child, 'raw', StringFormat.RAW, 3),
          'storage/invalid-argument'
        );
      });
    });

    describe('delete', () => {
      it('throws on a number arg', () => {
        testShared.assertThrows(
          testShared.bind(child.delete, child, 3),
          'storage/invalid-argument-count'
        );
      });
    });

    describe('getMetadata', () => {
      it('throws on a number arg', () => {
        testShared.assertThrows(
          testShared.bind(child.getMetadata, child, 3),
          'storage/invalid-argument-count'
        );
      });
    });

    describe('updateMetadata', () => {
      it('throws on no args', () => {
        testShared.assertThrows(
          testShared.bind(child.updateMetadata, child),
          'storage/invalid-argument-count'
        );
      });
      it('throws on number arg', () => {
        testShared.assertThrows(
          testShared.bind(child.updateMetadata, child, 3),
          'storage/invalid-argument'
        );
      });
      it('throws on null arg', () => {
        testShared.assertThrows(
          testShared.bind(child.updateMetadata, child, null),
          'storage/invalid-argument'
        );
      });
    });

    describe('getDownloadURL', () => {
      it('throws on number arg', () => {
        testShared.assertThrows(
          testShared.bind(child.getDownloadURL, child, 3),
          'storage/invalid-argument-count'
        );
      });
    });
  });

  describe('non-root operations', () => {
    it("put doesn't throw", () => {
      assert.doesNotThrow(() => {
        child.put(new Blob(['a']));
        child.put(new Uint8Array(10));
        child.put(new ArrayBuffer(10));
      });
    });
    it("putString doesn't throw", () => {
      assert.doesNotThrow(() => {
        child.putString('raw', StringFormat.RAW);
        child.putString('aaaa', StringFormat.BASE64);
        child.putString('aaaa', StringFormat.BASE64URL);
        child.putString(
          'data:application/octet-stream;base64,aaaa',
          StringFormat.DATA_URL
        );
      });
    });
    it("delete doesn't throw", () => {
      assert.doesNotThrow(() => {
        child.delete();
      });
    });
    it("getMetadata doesn't throw", () => {
      assert.doesNotThrow(() => {
        child.getMetadata();
      });
    });
    it("updateMetadata doesn't throw", () => {
      assert.doesNotThrow(() => {
        child.updateMetadata({} as Metadata);
      });
    });
    it("getDownloadURL doesn't throw", () => {
      assert.doesNotThrow(() => {
        child.getDownloadURL();
      });
    });
  });

  describe('root operations', () => {
    it('put throws', () => {
      testShared.assertThrows(
        root.put.bind(root, new Blob(['a'])),
        'storage/invalid-root-operation'
      );
    });
    it('putString throws', () => {
      testShared.assertThrows(
        root.putString.bind(root, 'raw', StringFormat.RAW),
        'storage/invalid-root-operation'
      );
    });
    it('delete throws', () => {
      testShared.assertThrows(
        root.delete.bind(root),
        'storage/invalid-root-operation'
      );
    });
    it('getMetadata throws', () => {
      testShared.assertThrows(
        root.getMetadata.bind(root),
        'storage/invalid-root-operation'
      );
    });
    it('updateMetadata throws', () => {
      testShared.assertThrows(
        root.updateMetadata.bind(root, {}),
        'storage/invalid-root-operation'
      );
    });
    it('getDownloadURL throws', () => {
      testShared.assertThrows(
        root.getDownloadURL.bind(root),
        'storage/invalid-root-operation'
      );
    });
  });
});
