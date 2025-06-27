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

import { expect } from 'chai';
import { SinonFakeXMLHttpRequest, useFakeXMLHttpRequest } from 'sinon';
import { ErrorCode } from '../../src/implementation/connection';
import { XhrBytesConnection } from '../../src/platform/browser/connection';

describe('Connections', () => {
  it('XhrConnection.send() should not reject on network errors', async () => {
    const fakeXHR = useFakeXMLHttpRequest();
    const connection = new XhrBytesConnection();
    const sendPromise = connection.send('testurl', 'GET', false);
    // simulate a network error
    ((connection as any).xhr_ as SinonFakeXMLHttpRequest).error();
    await sendPromise;
    expect(connection.getErrorCode()).to.equal(ErrorCode.NETWORK_ERROR);
    fakeXHR.restore();
  });
  it('XhrConnection.send() should send credentials when using cloud workstation', async () => {
    const fakeXHR = useFakeXMLHttpRequest();
    const connection = new XhrBytesConnection();
    const sendPromise = connection.send(
      'https://abc.cloudworkstations.dev',
      'GET',
      true
    );
    // simulate a network error
    ((connection as any).xhr_ as SinonFakeXMLHttpRequest).error();
    await sendPromise;
    expect(
      ((connection as any).xhr_ as SinonFakeXMLHttpRequest).withCredentials
    ).to.be.true;
    fakeXHR.restore();
  });
});
