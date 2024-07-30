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

import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnect, executeQuery, getDataConnect, queryRef } from '../../src';
import { SDK_VERSION } from '../../src/core/version';
import { initializeFetch } from '../../src/network/fetch';



use(sinonChai);
const json = {
  message: 'unauthorized'
};
const fakeFetchImpl = sinon.stub().returns(
  Promise.resolve({
    json: () => {
      return Promise.resolve(json);
    },
    status: 401
  } as Response)
);

describe('User Agent Tests', () => {
  let dc: DataConnect;
  beforeEach(() => {
    initializeFetch(fakeFetchImpl);
    dc = getDataConnect({ connector: 'c', location: 'l', service: 's' });
  });
  afterEach(async () => {
    await dc._delete();
  });
  it('should send a request with the corresponding user agent if using the generated SDK', async () => {
    dc._useGeneratedSdk();
    // @ts-ignore
    await executeQuery(queryRef(dc, '')).catch(() => {});
    expect(fakeFetchImpl).to.be.calledWithMatch(
      'https://firebasedataconnect.googleapis.com/v1alpha/projects/p/locations/l/services/s/connectors/c:executeQuery',
      {
        headers: {
          ['X-Goog-Api-Client']: 'gl-js/ fire/' + SDK_VERSION + ' web/gn'
        }
      }
    );
  });
  it('should send a request with the corresponding user agent if using the generated SDK', async () => {
    // @ts-ignore
    await executeQuery(queryRef(dc, '')).catch(() => {});
    expect(fakeFetchImpl).to.be.calledWithMatch(
      'https://firebasedataconnect.googleapis.com/v1alpha/projects/p/locations/l/services/s/connectors/c:executeQuery',
      {
        headers: {
          ['X-Goog-Api-Client']: 'gl-js/ fire/' + SDK_VERSION
        }
      }
    );
  });
});
