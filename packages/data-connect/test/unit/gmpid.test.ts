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
import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnect, executeQuery, getDataConnect, queryRef } from '../../src';
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

describe('GMPID Tests', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  let APPID = 'MYAPPID';
  beforeEach(() => {
    initializeFetch(fakeFetchImpl);
    app = initializeApp({ projectId: 'p',appId: APPID }, 'fdsasdf'); // TODO(mtewani): Replace with util function
    dc = getDataConnect(app, { connector: 'c', location: 'l', service: 's' });
  });
  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
  });
  it('should send a request with the corresponding gmpid if using the app id is specified', async () => {
    // @ts-ignore
    await executeQuery(queryRef(dc, '')).catch(() => {});
    expect(fakeFetchImpl).to.be.calledWithMatch(
      'https://firebasedataconnect.googleapis.com/v1alpha/projects/p/locations/l/services/s/connectors/c:executeQuery',
      {
        headers: {
          ['x-firebase-gmpid']: APPID
        }
      }
    );
  });
  it('should send a request with no gmpid if using the app id is not specified', async () => {
    const app2 = initializeApp({ projectId: 'p' }, 'def'); // TODO(mtewani): Replace with util function
    const dc2 = getDataConnect(app2, { connector: 'c', location: 'l', service: 's' });
    // @ts-ignore
    await executeQuery(queryRef(dc2, '')).catch(() => {});
    expect(fakeFetchImpl).to.be.calledWithMatch(
      'https://firebasedataconnect.googleapis.com/v1alpha/projects/p/locations/l/services/s/connectors/c:executeQuery',
      {
        headers: {
          ['x-firebase-gmpid']: APPID
        }
      }
    );
    dc2._delete();
    deleteApp(app2);
  });
});
