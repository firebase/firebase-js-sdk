/**
 * @license
 * Copyright 2026 Google LLC
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
import sinonChai from 'sinon-chai';

import { DataConnectOptions } from '../../src/api/DataConnect';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import {
  DataConnectStreamRequest,
  ExecuteStreamRequest,
  SubscribeStreamRequest
} from '../../src/network/stream/wire';
import { getGoogApiClientValue } from '../../src/network';

use(sinonChai);

class TestStreamTransport extends AbstractDataConnectStreamTransport {
  protected openConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected closeConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected sendMessage<Variables>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestBody: DataConnectStreamRequest<Variables>
  ): void {
    // no-op
  }

  onAuthTokenChanged(newToken: string | null): void {
    this._authToken = newToken;
  }

  /**
   * Manually trigger onConnectionReady for testing purposes.
   */
  triggerOnConnectionReady(): void {
    this.onConnectionReady();
  }

  /**
   * Manually set auth token for testing purposes.
   */
  setAuthToken(token: string | null): void {
    this._authToken = token;
  }

  /**
   * Manually set app check token for testing purposes.
   */
  setAppCheckToken(token: string | null): void {
    this._appCheckToken = token;
  }
}

describe('AbstractDataConnectStreamTransport', () => {
  const dcOptions: DataConnectOptions = {
    projectId: 'p',
    location: 'l',
    service: 's',
    connector: 'c'
  };
  let transport: TestStreamTransport;
  let expectedName: string;
  let expectedGoogApiClientValue: string;
  const firstRequestId = '1';
  const initialRequest: ExecuteStreamRequest<unknown> = {
    requestId: firstRequestId,
    execute: { operationName: 'test' }
  };
  const initialAuthToken = 'initial-auth-token';
  const newAuthToken = 'new-auth-token';

  beforeEach(() => {
    transport = new TestStreamTransport(dcOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectedName = (transport as any).connectorResourcePath;
    expectedGoogApiClientValue = getGoogApiClientValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transport as any)._isUsingGen,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transport as any)._callerSdkType
    );
    transport.setAuthToken(initialAuthToken);
  });

  describe('_prepareMessage', () => {
    it('should not change data fields', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstPreparedMessage = (transport as any)._prepareMessage(
        initialRequest
      ) as ExecuteStreamRequest<unknown>;
      expect(firstPreparedMessage.requestId).to.equal(initialRequest.requestId);
      expect(firstPreparedMessage.execute).to.equal(initialRequest.execute);
      expect(firstPreparedMessage.resume).to.equal(initialRequest.resume);
      expect(firstPreparedMessage.subscribe).to.equal(initialRequest.subscribe);
      expect(firstPreparedMessage.cancel).to.equal(initialRequest.cancel);
      expect(firstPreparedMessage.dataEtag).to.equal(initialRequest.dataEtag);
    });

    it('should add initial headers and name to the first message', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstPreparedMessage = (transport as any)._prepareMessage(
        initialRequest
      ) as ExecuteStreamRequest<unknown>;

      expect(firstPreparedMessage.name).to.equal(expectedName);
      expect(firstPreparedMessage.headers).to.exist;
      expect(firstPreparedMessage.headers?.authToken).to.equal(
        initialAuthToken
      );
      expect(firstPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
        expectedGoogApiClientValue
      );
    });

    it('should NOT add name to subsequent messages', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (transport as any)._prepareMessage(initialRequest);

      const secondRequest: SubscribeStreamRequest<unknown> = {
        requestId: '2',
        subscribe: { operationName: 'test2' }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const secondPreparedMessage = (transport as any)._prepareMessage(
        secondRequest
      );

      expect(secondPreparedMessage.name).to.be.undefined;
    });

    // it('should include auth token only when it changes', () => {
    //   transport.setAuthToken('token1');
    //   const req1: ExecuteStreamRequest<unknown> = {
    //     requestId: '1',
    //     execute: { operationName: 'test' }
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   const prepared1 = (transport as any)._prepareMessage(req1);
    //   expect(prepared1.headers?.authToken).to.equal('token1');

    //   // Second message: no auth change
    //   const req2: ExecuteStreamRequest<unknown> = {
    //     requestId: '2',
    //     execute: { operationName: 'test2' }
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   const prepared2 = (transport as any)._prepareMessage(req2);
    //   expect(prepared2.headers?.authToken).to.be.undefined;

    //   // Change auth
    //   transport.setAuthToken('token2');
    //   const req3: ExecuteStreamRequest<unknown> = {
    //     requestId: '3',
    //     execute: { operationName: 'test3' }
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   const prepared3 = (transport as any)._prepareMessage(req3);
    //   expect(prepared3.headers?.authToken).to.equal('token2');
    // });

    // it('should reset first message state on connection ready', () => {
    //   const req1: ExecuteStreamRequest<unknown> = {
    //     requestId: '1',
    //     execute: { operationName: 'test' }
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   (transport as any)._prepareMessage(req1);

    //   transport.triggerOnConnectionReady();

    //   const req2: ExecuteStreamRequest<unknown> = {
    //     requestId: '2',
    //     execute: { operationName: 'test2' }
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   const prepared2 = (transport as any)._prepareMessage(req2);
    //   expect(prepared2.name).to.exist; // Should contain name again
    // });

    // it('should include AppCheck token on first message', () => {
    //   transport.setAppCheckToken('app-check-token');
    //   const req: ExecuteStreamRequest<unknown> = {
    //     requestId: '1',
    //     execute: { operationName: 'test' }
    //   };
    //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //   const prepared = (transport as any)._prepareMessage(req);
    //   expect(prepared.headers?.appCheckToken).to.equal('app-check-token');
    // });
  });
});
