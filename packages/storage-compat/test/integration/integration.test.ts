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

import firebase from '@firebase/app-compat';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@firebase/auth-compat';

// See https://github.com/typescript-eslint/typescript-eslint/issues/363
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as storage from '@firebase/storage-types';

import '../../src/index';
import PROJECT_CONFIG from '../../../../config/project.json';

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const STORAGE_BUCKET = PROJECT_CONFIG.storageBucket;
export const API_KEY = PROJECT_CONFIG.apiKey;

let appCount = 0;

export async function withTestInstance(
  fn: (storage: storage.FirebaseStorage) => void | Promise<void>
): Promise<void> {
  const app = firebase.initializeApp(
    { apiKey: API_KEY, projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET },
    'test-app-' + appCount++
  );
  await firebase.auth!(app).signInAnonymously();
  const storage = firebase.storage!(app);
  return fn(storage);
}

describe('FirebaseStorage Compat', () => {
  let projectPrefix: string;

  // eslint-disable-next-line no-empty-pattern
  beforeAll(({}, suite) => {
    projectPrefix = suite.file.projectName?.split(' ')[0] ?? 'default'; // 'node' or 'browser'
  });

  it('can upload bytes', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref(`public/${projectPrefix}/bytes`);
      await ref.put(new Uint8Array([0, 1, 3]));
    });
  });

  it('can upload string', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref(`public/${projectPrefix}/string`);
      await ref.putString('foo');
    });
  });

  it('validates operations on root', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref('');
      try {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        ref.putString('foo');
        expect.fail();
      } catch (e) {
        expect((e as Error).message).toMatch(
          /The operation 'putString' cannot be performed on a root reference/
        );
      }
    });
  });

  it('can delete object', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref(`public/${projectPrefix}/delete`);
      await ref.putString('foo');

      // getDownloadURL() succeeds for an existing object
      await ref.getDownloadURL();

      await ref.delete();
      try {
        // getDownloadURL() fails for a deleted object
        await ref.getDownloadURL();
        expect.fail();
      } catch (e) {
        expect((e as Error).message).toMatch(
          new RegExp(`Object 'public/${projectPrefix}/delete' does not exist`)
        );
      }
    });
  });

  it('can get download URL', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref(`public/${projectPrefix}/downloadurl`);
      await ref.put(new Uint8Array([0, 1, 3]));
      const url = await ref.getDownloadURL();
      expect(url).toMatch(
        new RegExp(
          `https://firebasestorage\\.googleapis\\.com/v0/b/.*/o/public%2F${projectPrefix}%2Fdownloadurl`
        )
      );
    });
  });

  it('can get metadata', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref(`public/${projectPrefix}/getmetadata`);
      await ref.put(new Uint8Array([0, 1, 3]));
      const metadata = await ref.getMetadata();
      expect(metadata.name).toBe('getmetadata');
    });
  });

  it('can update metadata', () => {
    return withTestInstance(async storage => {
      const ref = storage.ref(`public/${projectPrefix}/updatemetadata`);
      await ref.put(new Uint8Array([0, 1, 3]));
      const metadata = await ref.updateMetadata({
        customMetadata: { foo: 'bar' }
      });
      expect(metadata.customMetadata).toEqual({ foo: 'bar' });
    });
  });

  it('can list files', () => {
    return withTestInstance(async storage => {
      await storage.ref(`public/${projectPrefix}/list/a`).putString('');
      await storage.ref(`public/${projectPrefix}/list/b`).putString('');
      await storage.ref(`public/${projectPrefix}/list/c/d`).putString('');
      const listResult = await storage
        .ref(`public/${projectPrefix}/list`)
        .listAll();
      expect(listResult.items.map(v => v.name).sort()).toEqual(['a', 'b']);
      expect(listResult.prefixes.map(v => v.name)).toEqual(['c']);
    });
  });
});
