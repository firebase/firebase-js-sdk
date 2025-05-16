/**
 * @license
 * Copyright 2021 Google LLC
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

import { stub } from 'sinon';
import { expect } from 'chai';
import { ErrorCode } from '../../src/implementation/connection';
import { FetchBytesConnection } from '../../src/platform/node/connection';

describe('Connections', () => {
  it('FetchConnection.send() should not reject on network errors', async () => {
    const connection = new FetchBytesConnection();

    const fetchStub = stub(globalThis, 'fetch').rejects();
    await connection.send('testurl', 'GET', false);
    expect(connection.getErrorCode()).to.equal(ErrorCode.NETWORK_ERROR);

    fetchStub.restore();
  });
  it('FetchConnection.send() should send credentials on cloud workstations', async () => {
    const connection = new FetchBytesConnection();

    const fetchStub = stub(globalThis, 'fetch').rejects();
    await connection.send(
      'http://something.cloudworkstations.dev',
      'GET',
      true
    );
    expect(connection.getErrorCode()).to.equal(ErrorCode.NETWORK_ERROR);
    expect(fetchStub).to.have.been.calledWithMatch(
      'http://something.cloudworkstations.dev',
      {
        credentials: 'include'
      }
    );
    fetchStub.restore();
  });
});
