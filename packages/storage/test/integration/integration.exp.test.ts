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

import { initializeApp } from '@firebase/app-exp';
import { getAuth, signInAnonymously } from '@firebase/auth-exp';
// import { getStorage, ref, uploadBytes } from '../../exp/index';

// See https://github.com/typescript-eslint/typescript-eslint/issues/363
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import * as storage from '@firebase/storage-types';

// import { expect } from 'chai';
// import { StorageService } from '../../src/service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../config/project.json');

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const STORAGE_BUCKET = PROJECT_CONFIG.storageBucket;
export const API_KEY = PROJECT_CONFIG.apiKey;

let appCount = 0;

// export async function withTestInstance(
//   fn: (storage: StorageService) => void | Promise<void>
// ): Promise<void> {
//   const app = initializeApp(
//     { apiKey: API_KEY, projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET },
//     'test-app-' + appCount++
//   );
//   await signInAnonymously(getAuth(app));
//   // const storage = getStorage(app);
//   // return fn(storage);
// }

describe.only('FirebaseStorage', () => {
  it('can upload bytes', async () => {
    const app = initializeApp(
      { apiKey: API_KEY, projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET },
      'test-app-' + appCount++
    );
    await signInAnonymously(getAuth(app));
    console.log('signed in!');
    // return withTestInstance(async storage => {
    //   console.log('got it!');
    // const reference = ref(storage, 'public/bytes');
    // await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    // });
  });
});
