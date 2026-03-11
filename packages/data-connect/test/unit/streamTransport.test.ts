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
import {
  CallerSdkType,
  CallerSdkTypeEnum,
  getGoogApiClientValue
} from '../../src/network';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

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
    this.onAuthTokenChanged(token);
  }

  /**
   * Manually set app check token for testing purposes.
   */
  setAppCheckToken(token: string | null): void {
    this._appCheckToken = token;
  }
}

/**
 * Interface that exposes some private fields and methods of TestStreamTransport for testing purposes.
 */
interface TransportWithInternals {
  connectorResourcePath: string;
  _isUsingGen: boolean;
  _callerSdkType: CallerSdkType;
  _setCallerSdkType(type: CallerSdkType): void;
  setAuthToken(token: string | null): void;
  setAppCheckToken(token: string | null): void;
  _prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(
    requestBody: StreamBody
  ): StreamBody;
}

describe('AbstractDataConnectStreamTransport', () => {
  const dcOptions: DataConnectOptions = {
    projectId: 'p',
    location: 'l',
    service: 's',
    connector: 'c'
  };
  let transport: TransportWithInternals;
  let expectedName: string;
  let expectedInitialGoogApiClientValue: string;
  const firstRequestId = '1';
  const unpreparedMessage: DataConnectStreamRequest<unknown> = {
    requestId: firstRequestId,
    execute: { operationName: 'test' }
  };
  const initialAuthToken = 'initial-auth-token';
  const newAuthToken = 'new-auth-token';
  const initialAppCheckToken = 'initial-app-check-token';
  const newAppCheckToken = 'new-app-check-token';

  beforeEach(() => {
    transport = new TestStreamTransport(
      dcOptions
    ) as unknown as TransportWithInternals;
    expectedName = transport.connectorResourcePath;
    transport._isUsingGen = true;
    transport._callerSdkType = CallerSdkTypeEnum.Generated;
    expectedInitialGoogApiClientValue = getGoogApiClientValue(
      transport._isUsingGen,
      transport._callerSdkType
    );
    transport.setAuthToken(initialAuthToken);
    transport.setAppCheckToken(initialAppCheckToken);
  });

  describe('_prepareMessage', () => {
    it('should not change data fields', () => {
      const preparedMessage = transport._prepareMessage(
        unpreparedMessage
      ) as DataConnectStreamRequest<unknown>;
      expect(preparedMessage.requestId).to.equal(unpreparedMessage.requestId);
      expect(preparedMessage.execute).to.equal(unpreparedMessage.execute);
      expect(preparedMessage.resume).to.equal(unpreparedMessage.resume);
      expect(preparedMessage.subscribe).to.equal(unpreparedMessage.subscribe);
      expect(preparedMessage.cancel).to.equal(unpreparedMessage.cancel);
      expect(preparedMessage.dataEtag).to.equal(unpreparedMessage.dataEtag);
    });

    describe('should handle headers properly', () => {
      describe('auth token', () => {
        it('should add auth token to the first message', () => {
          const preparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(preparedMessage.headers).to.exist;
          expect(preparedMessage.headers?.authToken).to.equal(initialAuthToken);
        });

        it('should NOT add the same auth token to subsequent messages', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.authToken).to.be.undefined;
        });

        it('should include auth token when it changes', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.authToken).to.be.undefined;
          transport.setAuthToken(newAuthToken);
          const thirdPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.authToken).to.equal(
            newAuthToken
          );
        });
      });

      describe('app check token', () => {
        it('should add app check token to the first message', () => {
          const firstPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(firstPreparedMessage.headers).to.exist;
          expect(firstPreparedMessage.headers?.appCheckToken).to.equal(
            initialAppCheckToken
          );
        });

        it('should NOT add the same app check token to subsequent messages', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.appCheckToken).to.be.undefined;
        });

        it('should NOT include app check token when it changes', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.appCheckToken).to.be.undefined;
          transport.setAppCheckToken(newAppCheckToken);
          const thirdPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.appCheckToken).to.be.undefined;
        });
      });

      it('should add X-Goog-Api-Client to every message based on caller sdk type', () => {
        const firstPreparedMessage =
          transport._prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedInitialGoogApiClientValue
        );
        const secondPreparedMessage = transport._prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(secondPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedInitialGoogApiClientValue
        );
        transport._isUsingGen = true;
        transport._setCallerSdkType(CallerSdkTypeEnum.GeneratedReact);
        const expectedThirdGoogApiClientValue = getGoogApiClientValue(
          true,
          CallerSdkTypeEnum.GeneratedReact
        );
        const thirdPreparedMessage = transport._prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(thirdPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedThirdGoogApiClientValue
        );
      });
    });

    describe('should handle name properly', () => {
      it('should add name to the first message', () => {
        const firstPreparedMessage =
          transport._prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.name).to.equal(expectedName);
      });

      it('should NOT add name to subsequent messages', () => {
        transport._prepareMessage(unpreparedMessage);
        const secondPreparedMessage = transport._prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(secondPreparedMessage.name).to.be.undefined;
      });
    });
  });
});
