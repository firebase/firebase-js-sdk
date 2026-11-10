/**
 * @license
 * Copyright 2024 Google LLC
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

import { deleteApp, initializeApp, FirebaseApp } from '@firebase/app';

import { DataConnect, executeQuery, getDataConnect, queryRef } from '../../src';
import { SDK_VERSION } from '../../src/core/version';
import { initializeFetch } from '../../src/network/rest';

const json = {
  message: 'unauthorized'
};
const fakeFetchImpl = vi.fn().mockReturnValue(
  Promise.resolve({
    json: () => {
      return Promise.resolve(json);
    },
    status: 401
  } as Response)
);

describe('User Agent Tests', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  beforeEach(() => {
    initializeFetch(fakeFetchImpl);
    app = initializeApp({ projectId: 'p' }, 'abc'); // TODO(mtewani): Replace with util function
    dc = getDataConnect(app, { connector: 'c', location: 'l', service: 's' });
  });
  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
  });
  it('should send a request with the corresponding user agent if using the generated SDK', async () => {
    dc._useGeneratedSdk();
    // @ts-ignore
    await executeQuery(queryRef(dc, '')).catch(() => {});
    expect(fakeFetchImpl).toHaveBeenCalledWith(
      'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/connectors/c:executeQuery',
      expect.objectContaining({
        headers: expect.objectContaining({
          ['X-Goog-Api-Client']: 'gl-js/ fire/' + SDK_VERSION + ' js/gen',
          ['X-Client-Version']: 'web/' + SDK_VERSION
        })
      })
    );
  });
  it('should send a request with the corresponding user agent if not using the generated SDK', async () => {
    // @ts-ignore
    await executeQuery(queryRef(dc, '')).catch(() => {});
    expect(fakeFetchImpl).toHaveBeenCalledWith(
      'https://firebasedataconnect.googleapis.com/v1/projects/p/locations/l/services/s/connectors/c:executeQuery',
      expect.objectContaining({
        headers: expect.objectContaining({
          ['X-Goog-Api-Client']: 'gl-js/ fire/' + SDK_VERSION,
          ['X-Client-Version']: 'web/' + SDK_VERSION
        })
      })
    );
  });
});
