/**
 * @license
 * Copyright 2025 Google LLC
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
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DatabaseId } from '../../../src/core/database_info';
import { makeDatabaseInfo } from '../../../src/lite-api/components';
import { FirestoreSettingsImpl } from '../../../src/lite-api/settings';
import { ResourcePath } from '../../../src/model/path';
import { FetchConnection } from '../../../src/platform/browser_lite/fetch_connection';

use(sinonChai);
use(chaiAsPromised);

describe('Fetch Connection', () => {
  it('should pass in credentials if using emulator and cloud workstation', async () => {
    const stub = sinon.stub(globalThis, 'fetch');
    stub.resolves({
      ok: true,
      json() {
        return Promise.resolve();
      }
    } as Response);
    const fetchConnection = new FetchConnection(
      makeDatabaseInfo(
        DatabaseId.empty(),
        '',
        '',
        new FirestoreSettingsImpl({
          host: 'abc.cloudworkstations.dev'
        })
      )
    );
    await fetchConnection.invokeRPC(
      'Commit',
      new ResourcePath([]),
      {},
      null,
      null
    );
    expect(stub).to.have.been.calledWithMatch(
      'https://abc.cloudworkstations.dev/v1/:commit',
      { credentials: 'include' }
    );
    stub.restore();
  });
});
