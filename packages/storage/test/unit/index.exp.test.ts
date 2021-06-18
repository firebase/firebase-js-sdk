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
import { getStorage } from '../../exp/index';
import { StorageService } from '../../src/service';
// eslint-disable-next-line import/no-extraneous-dependencies
import { initializeApp, deleteApp } from '@firebase/app-exp';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../config/project.json');

export const PROJECT_ID = PROJECT_CONFIG.projectId;
export const STORAGE_BUCKET = PROJECT_CONFIG.storageBucket;
export const API_KEY = PROJECT_CONFIG.apiKey;
export const AUTH_DOMAIN = PROJECT_CONFIG.authDomain;

describe('Firebase Storage > API', () => {
  it('getStorage() with no bucket url specified sets correct bucket', async () => {
    const app = initializeApp({
      apiKey: API_KEY,
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
      authDomain: AUTH_DOMAIN
    });
    const storage = getStorage(app);
    expect((storage as StorageService)._bucket?.bucket).to.equal(
      STORAGE_BUCKET
    );
    await deleteApp(app);
  });
  it('getStorage() with custom bucket url sets correct bucket', async () => {
    const app = initializeApp({
      apiKey: API_KEY,
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
      authDomain: AUTH_DOMAIN
    });
    const storage = getStorage(app, 'gs://foo-bar.appspot.com');
    expect((storage as StorageService)._bucket?.bucket).to.equal(
      'foo-bar.appspot.com'
    );
    await deleteApp(app);
  });
});
