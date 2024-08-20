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

// eslint-disable-next-line import/no-extraneous-dependencies
import { initializeApp, deleteApp, FirebaseApp } from '@firebase/app';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getAuth, signInAnonymously } from '@firebase/auth';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  uploadString,
  deleteObject,
  getMetadata,
  updateMetadata,
  listAll,
  getBytes
} from '../../src';

import { use, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as types from '../../src/public-types';
import { Deferred } from '@firebase/util';

use(chaiAsPromised);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../config/project.json');

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const STORAGE_BUCKET = PROJECT_CONFIG.storageBucket;
export const API_KEY = PROJECT_CONFIG.apiKey;
export const AUTH_DOMAIN = PROJECT_CONFIG.authDomain;

export async function createApp(): Promise<FirebaseApp> {
  const app = initializeApp({
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    authDomain: AUTH_DOMAIN
  });
  await signInAnonymously(getAuth(app));
  return app;
}

export function createStorage(app: FirebaseApp): types.FirebaseStorage {
  return getStorage(app);
}

describe('FirebaseStorage Exp', () => {
  let app: FirebaseApp;
  let storage: types.FirebaseStorage;

  beforeEach(async () => {
    app = await createApp();
    storage = createStorage(app);
  });

  afterEach(async () => {
    await deleteApp(app);
  });

  it('can upload bytes', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    const snap = await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    expect(snap.metadata.timeCreated).to.exist;
  });

  it('can get bytes', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    await uploadBytes(reference, new Uint8Array([0, 1, 3, 128, 255]));
    const bytes = await getBytes(reference);
    expect(new Uint8Array(bytes)).to.deep.equal(
      new Uint8Array([0, 1, 3, 128, 255])
    );
  });

  it('can get first n bytes', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    const bytes = await getBytes(reference, 2);
    expect(new Uint8Array(bytes)).to.deep.equal(new Uint8Array([0, 1]));
  });

  it('getBytes() throws for missing file', async () => {
    const reference = ref(storage, 'public/exp-bytes-missing');
    try {
      await getBytes(reference);
      expect.fail();
    } catch (e) {
      expect((e as Error)?.message).to.satisfy((v: string) =>
        v.match(/Object 'public\/exp-bytes-missing' does not exist/)
      );
    }
  });

  it('can upload bytes (resumable)', async () => {
    const reference = ref(storage, 'public/exp-bytesresumable');
    const snap = await uploadBytesResumable(
      reference,
      new Uint8Array([0, 1, 3])
    );
    expect(snap.metadata.timeCreated).to.exist;
  });

  it('can upload string', async () => {
    const reference = ref(storage, 'public/exp-string');
    const snap = await uploadString(reference, 'foo');
    expect(snap.metadata.timeCreated).to.exist;
  });

  it('validates operations on root', async () => {
    const reference = ref(storage, '');
    try {
      await uploadString(reference, 'foo');
      expect.fail();
    } catch (e) {
      expect((e as Error)?.message).to.satisfy((v: string) =>
        v.match(
          /The operation 'uploadString' cannot be performed on a root reference/
        )
      );
    }
  });

  it('can delete object ', async () => {
    const reference = ref(storage, 'public/exp-delete');
    await uploadString(reference, 'foo');
    await getDownloadURL(reference);
    await deleteObject(reference);
    await expect(getDownloadURL(reference)).to.eventually.be.rejectedWith(
      Error,
      /Object 'public\/exp-delete' does not exist/
    );
  });

  it('can get download URL', async () => {
    const reference = ref(storage, 'public/exp-downloadurl');
    await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    const url = await getDownloadURL(reference);
    expect(url).to.satisfy((v: string) =>
      v.match(
        /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/.*\/o\/public%2Fexp-downloadurl/
      )
    );
  });

  it('can get metadata', async () => {
    const reference = ref(storage, 'public/exp-getmetadata');
    await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    const metadata = await getMetadata(reference);
    expect(metadata.name).to.equal('exp-getmetadata');
  });

  it('can update metadata', async () => {
    const reference = ref(storage, 'public/exp-updatemetadata');
    await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    const metadata = await updateMetadata(reference, {
      customMetadata: { foo: 'bar' }
    });
    expect(metadata.customMetadata).to.deep.equal({ foo: 'bar' });
  });

  it('can list files', async () => {
    const referenceA = ref(storage, 'public/exp-list/a');
    const referenceB = ref(storage, 'public/exp-list/b');
    const referenceCD = ref(storage, 'public/exp-list/c/d');
    await uploadString(referenceA, '');
    await uploadString(referenceB, '');
    await uploadString(referenceCD, '');
    const listResult = await listAll(ref(storage, 'public/exp-list'));
    expect(listResult.items.map(v => v.name)).to.have.members(['a', 'b']);
    expect(listResult.prefixes.map(v => v.name)).to.have.members(['c']);
  });

  it('can pause uploads without an error', async () => {
    const referenceA = ref(storage, 'public/exp-upload/a');
    const bytesToUpload = new ArrayBuffer(1024 * 1024);
    const task = uploadBytesResumable(referenceA, bytesToUpload);
    const failureDeferred = new Deferred();
    let hasPaused = false;
    task.on(
      'state_changed',
      snapshot => {
        if (snapshot.bytesTransferred > 0 && !hasPaused) {
          task.pause();
          hasPaused = true;
        }
      },
      () => {
        failureDeferred.reject('Failed to upload file');
      }
    );
    await Promise.race([
      failureDeferred.promise,
      new Promise(resolve => setTimeout(resolve, 4000))
    ]);
    task.resume();
    await task;
    const bytes = await getBytes(referenceA);
    expect(bytes).to.deep.eq(bytesToUpload);
  }).timeout(10_000);
});
