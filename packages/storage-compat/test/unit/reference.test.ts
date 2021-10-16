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
import { ReferenceCompat } from '../../src/reference';
import { StorageServiceCompat } from '../../src/service';
import { makeTestCompatStorage, fakeApp, fakeStorage } from '../utils';
import firebase from '@firebase/app-compat';
import {
  StorageReference,
  getStorage,
  FirebaseStorage
} from '@firebase/storage';
import { fake } from 'sinon';
import { FirebaseApp } from '@firebase/app-types';
import { Reference } from '@firebase/storage-types';

describe('Firebase Storage > Reference', () => {
  let testCompatApp: FirebaseApp;
  let testModularStorage: FirebaseStorage;
  let service: StorageServiceCompat;
  before(() => {
    testCompatApp = firebase.initializeApp({});
    testModularStorage = getStorage(testCompatApp);
    service = makeTestCompatStorage(testCompatApp, testModularStorage);
  });

  after(() => {
    return testCompatApp.delete();
  });
  describe('toString', () => {
    it('delegates to the modular Reference.toString()', () => {
      const fakeToString = fake.returns('test123');
      const ref = new ReferenceCompat(
        {
          toString: fakeToString
        } as unknown as StorageReference,
        makeTestCompatStorage(fakeApp, fakeStorage)
      );

      expect(ref.toString()).to.equal('test123');
      expect(fakeToString).to.have.been.calledOnceWithExactly();
    });
  });

  describe('parent', () => {
    it('Returns null at root', () => {
      const root = service.refFromURL('gs://test-bucket');
      expect(root.parent).to.be.null;
    });
    it('Returns root one level down', () => {
      const child = service.refFromURL('gs://test-bucket/hello');
      expect(child.parent!.toString()).to.equal('gs://test-bucket/');
    });
    it('Works correctly with empty levels', () => {
      const s = service.refFromURL('gs://test-bucket/a///');
      expect(s.parent!.toString()).to.equal('gs://test-bucket/a/');
    });
  });

  describe('root', () => {
    it('Returns self at root', () => {
      const root = service.refFromURL('gs://test-bucket');
      expect(root.root.toString()).to.equal('gs://test-bucket/');
    });

    it('Returns root multiple levels down', () => {
      const s = service.refFromURL('gs://test-bucket/a/b/c/d');
      expect(s.root.toString()).to.equal('gs://test-bucket/');
    });
  });

  describe('bucket', () => {
    it('Returns bucket name', () => {
      const root = service.refFromURL('gs://test-bucket');
      expect(root.bucket).to.equal('test-bucket');
    });
  });

  describe('fullPath', () => {
    it('Returns full path without leading slash', () => {
      const s = service.refFromURL('gs://test-bucket/full/path');
      expect(s.fullPath).to.equal('full/path');
    });
  });

  describe('name', () => {
    it('Works at top level', () => {
      const s = service.refFromURL('gs://test-bucket/toplevel.txt');
      expect(s.name).to.equal('toplevel.txt');
    });

    it('Works at not the top level', () => {
      const s = service.refFromURL('gs://test-bucket/not/toplevel.txt');
      expect('toplevel.txt').to.equal(s.name);
    });
  });

  describe('child', () => {
    let root: Reference;
    before(() => {
      root = service.refFromURL('gs://test-bucket');
    });
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

  describe('putString', () => {
    let child: Reference;
    before(() => {
      child = service.refFromURL('gs://test-bucket/hello');
    });
    it('Uses metadata.contentType for RAW format', () => {
      // Regression test for b/30989476
      const task = child.putString('hello', 'raw', {
        contentType: 'lol/wut'
      });
      expect(task.snapshot.metadata!.contentType).to.equal('lol/wut');
      task.cancel();
    });
    it('Uses embedded content type in DATA_URL format', () => {
      const task = child.putString('data:lol/wat;base64,aaaa', 'data_url');
      expect(task.snapshot.metadata!.contentType).to.equal('lol/wat');
      task.cancel();
    });
    it('Lets metadata.contentType override embedded content type in DATA_URL format', () => {
      const task = child.putString('data:ignore/me;base64,aaaa', 'data_url', {
        contentType: 'tomato/soup'
      });
      expect(task.snapshot.metadata!.contentType).to.equal('tomato/soup');
      task.cancel();
    });
  });

  describe('Argument verification', () => {
    describe('list', () => {
      it('throws on invalid maxResults', async () => {
        const child = service.refFromURL('gs://test-bucket/hello');
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

  describe('root operations', () => {
    let root: Reference;
    before(() => {
      root = service.refFromURL('gs://test-bucket');
    });
    it('put throws', () => {
      expect(() => root.put(new Uint8Array())).to.throw(
        'storage/invalid-root-operation'
      );
    });
    it('putString throws', () => {
      expect(() => root.putString('raw', 'raw')).to.throw(
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
      await expect(root.updateMetadata({})).to.be.rejectedWith(
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
