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

import { ReferenceCompat } from '../../src/reference';
import { StorageServiceCompat } from '../../src/service';
import { makeTestCompatStorage, fakeApp, fakeStorage } from '../utils';
import firebase from '@firebase/app-compat';
import {
  StorageReference,
  getStorage,
  FirebaseStorage
} from '@firebase/storage';
import { FirebaseApp } from '@firebase/app-types';
import { Reference } from '@firebase/storage-types';

describe('Firebase Storage > Reference', () => {
  let testCompatApp: FirebaseApp;
  let testModularStorage: FirebaseStorage;
  let service: StorageServiceCompat;
  beforeAll(() => {
    testCompatApp = firebase.initializeApp({});
    testModularStorage = getStorage(testCompatApp);
    service = makeTestCompatStorage(testCompatApp, testModularStorage);
  });

  afterAll(() => {
    return testCompatApp.delete();
  });
  describe('toString', () => {
    it('delegates to the modular Reference.toString()', () => {
      const fakeToString = vi.fn().mockReturnValue('test123');
      const ref = new ReferenceCompat(
        {
          toString: fakeToString
        } as unknown as StorageReference,
        makeTestCompatStorage(fakeApp, fakeStorage)
      );

      expect(ref.toString()).toBe('test123');
      expect(fakeToString).toHaveBeenCalledTimes(1);
      expect(fakeToString).toHaveBeenCalledWith();
    });
  });

  describe('parent', () => {
    it('Returns null at root', () => {
      const root = service.refFromURL('gs://test-bucket');
      expect(root.parent).toBeNull();
    });
    it('Returns root one level down', () => {
      const child = service.refFromURL('gs://test-bucket/hello');
      expect(child.parent!.toString()).toBe('gs://test-bucket/');
    });
    it('Works correctly with empty levels', () => {
      const s = service.refFromURL('gs://test-bucket/a///');
      expect(s.parent!.toString()).toBe('gs://test-bucket/a/');
    });
  });

  describe('root', () => {
    it('Returns self at root', () => {
      const root = service.refFromURL('gs://test-bucket');
      expect(root.root.toString()).toBe('gs://test-bucket/');
    });

    it('Returns root multiple levels down', () => {
      const s = service.refFromURL('gs://test-bucket/a/b/c/d');
      expect(s.root.toString()).toBe('gs://test-bucket/');
    });
  });

  describe('bucket', () => {
    it('Returns bucket name', () => {
      const root = service.refFromURL('gs://test-bucket');
      expect(root.bucket).toBe('test-bucket');
    });
  });

  describe('fullPath', () => {
    it('Returns full path without leading slash', () => {
      const s = service.refFromURL('gs://test-bucket/full/path');
      expect(s.fullPath).toBe('full/path');
    });
  });

  describe('name', () => {
    it('Works at top level', () => {
      const s = service.refFromURL('gs://test-bucket/toplevel.txt');
      expect(s.name).toBe('toplevel.txt');
    });

    it('Works at not the top level', () => {
      const s = service.refFromURL('gs://test-bucket/not/toplevel.txt');
      expect(s.name).toBe('toplevel.txt');
    });
  });

  describe('child', () => {
    let root: Reference;
    beforeAll(() => {
      root = service.refFromURL('gs://test-bucket');
    });
    it('works with a simple string', () => {
      expect(root.child('a').toString()).toBe('gs://test-bucket/a');
    });
    it('drops a trailing slash', () => {
      expect(root.child('ab/').toString()).toBe('gs://test-bucket/ab');
    });
    it('compresses repeated slashes', () => {
      expect(root.child('//a///b/////').toString()).toBe(
        'gs://test-bucket/a/b'
      );
    });
    it('works chained multiple times with leading slashes', () => {
      expect(
        root.child('a').child('/b').child('c').child('d/e').toString()
      ).toBe('gs://test-bucket/a/b/c/d/e');
    });
  });

  describe('putString', () => {
    let child: Reference;
    beforeAll(() => {
      child = service.refFromURL('gs://test-bucket/hello');
    });
    it('Uses metadata.contentType for RAW format', () => {
      // Regression test for b/30989476
      const task = child.putString('hello', 'raw', {
        contentType: 'lol/wut'
      });
      expect(task.snapshot.metadata!.contentType).toBe('lol/wut');
      task.cancel();
    });
    it('Uses embedded content type in DATA_URL format', () => {
      const task = child.putString('data:lol/wat;base64,aaaa', 'data_url');
      expect(task.snapshot.metadata!.contentType).toBe('lol/wat');
      task.cancel();
    });
    it('Lets metadata.contentType override embedded content type in DATA_URL format', () => {
      const task = child.putString('data:ignore/me;base64,aaaa', 'data_url', {
        contentType: 'tomato/soup'
      });
      expect(task.snapshot.metadata!.contentType).toBe('tomato/soup');
      task.cancel();
    });
  });

  describe('Argument verification', () => {
    describe('list', () => {
      it('throws on invalid maxResults', () => {
        const child = service.refFromURL('gs://test-bucket/hello');
        expect(() => child.list({ maxResults: 0 })).toThrow(
          'storage/invalid-argument'
        );
        expect(() => child.list({ maxResults: -4 })).toThrow(
          'storage/invalid-argument'
        );
        expect(() => child.list({ maxResults: 1001 })).toThrow(
          'storage/invalid-argument'
        );
      });
    });
  });

  describe('root operations', () => {
    let root: Reference;
    beforeAll(() => {
      root = service.refFromURL('gs://test-bucket');
    });
    it('put throws', () => {
      expect(() => root.put(new Uint8Array())).toThrow(
        'storage/invalid-root-operation'
      );
    });
    it('putString throws', () => {
      expect(() => root.putString('raw', 'raw')).toThrow(
        'storage/invalid-root-operation'
      );
    });
    it('delete throws', () => {
      expect(() => root.delete()).toThrow('storage/invalid-root-operation');
    });
    it('getMetadata throws', () => {
      expect(() => root.getMetadata()).toThrow(
        'storage/invalid-root-operation'
      );
    });
    it('updateMetadata throws', () => {
      expect(() => root.updateMetadata({})).toThrow(
        'storage/invalid-root-operation'
      );
    });
    it('getDownloadURL throws', async () => {
      expect(() => root.getDownloadURL()).toThrow(
        'storage/invalid-root-operation'
      );
    });
  });
});
