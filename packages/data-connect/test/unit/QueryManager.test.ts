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

import { deleteApp, FirebaseApp, initializeApp } from '@firebase/app';

import {
  DataConnect,
  executeQuery,
  getDataConnect,
  mutationRef,
  queryRef
} from '../../src';
import { Code, DataConnectError } from '../../src/core/error';
import { DataConnectTransportManager } from '../../src/network/manager';
describe('Query Manager Tests', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  const APPID = 'MYAPPID';
  const APPNAME = 'MYAPPNAME';

  beforeEach(() => {
    app = initializeApp({ projectId: 'p', appId: APPID }, APPNAME);
    dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });
  });
  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
  });

  it('should refuse to make requests to execute non-query operations', async () => {
    vi.spyOn(
      DataConnectTransportManager.prototype,
      'invokeQuery'
    ).mockResolvedValue({
      data: 'ok',
      errors: [],
      extensions: {}
    });
    const query = queryRef<string>(dc, 'q');
    const mutation = mutationRef<string>(dc, 'm');

    const error = new DataConnectError(
      Code.INVALID_ARGUMENT,
      'ExecuteQuery can only execute query operations'
    );

    // @ts-ignore
    await expect(executeQuery(mutation)).rejects.toThrow(error.message);
    const result = await executeQuery(query);
    expect(result.data).toBe('ok');
  });
});
