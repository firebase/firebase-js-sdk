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
import { initializeApp, deleteApp } from '@firebase/app-exp';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getAuth, signInAnonymously } from '@firebase/auth-exp';
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
  listAll
} from '../../exp/index';

import { use, expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { FirebaseApp } from '@firebase/app-types-exp';
import { StorageService } from '../../src/service';

use(chaiAsPromised);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../config/project.json');

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const STORAGE_BUCKET = PROJECT_CONFIG.storageBucket;
export const API_KEY = PROJECT_CONFIG.apiKey;
export const AUTH_DOMAIN = PROJECT_CONFIG.authDomain;

describe('FirebaseStorage Exp', () => {
  let app: FirebaseApp;
  let storage: StorageService;

  beforeEach(async () => {
    app = initializeApp({
      apiKey: API_KEY,
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
      authDomain: AUTH_DOMAIN
    });
    await signInAnonymously(getAuth(app));
    storage = getStorage(app);
  });

  afterEach(async () => {
    await deleteApp(app);
  });

  it('can upload bytes', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    const snap = await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    expect(snap.metadata.timeCreated).to.exist;
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
      expect(e.message).to.satisfy((v: string) =>
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
});
