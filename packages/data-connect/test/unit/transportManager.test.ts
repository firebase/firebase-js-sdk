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
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnectOptions } from '../../src/api/DataConnect';
import {
  DataConnectResponse,
  SubscribeNotificationHook
} from '../../src/network/DataConnectTransport';
import { DataConnectTransportManager } from '../../src/network/manager';
import { RESTTransport } from '../../src/network/rest';

use(chaiAsPromised);
use(sinonChai);

describe('DataConnectTransportManager', () => {
  let manager: DataConnectTransportManager;
  const options: DataConnectOptions = {
    projectId: 'test-project',
    location: 'us-central1',
    connector: 'test-connector',
    service: 'test-service'
  };

  afterEach(() => {
    sinon.restore();
  });

  interface TestVariables {
    key: string;
  }
  const testVariables: TestVariables = { key: 'one' };

  interface TestData {
    value: number;
  }
  const testData: TestData = { value: 1 };

  it('should delegate invokeQuery to RESTTransport', async () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon
      .stub(
        (manager as unknown as { restTransport: RESTTransport }).restTransport,
        'invokeQuery'
      )
      .resolves({ data: testData } as DataConnectResponse<TestData>);

    await manager.invokeQuery<TestData, TestVariables>(
      'testQuery',
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith('testQuery', testVariables);
  });

  it('should delegate invokeMutation to RESTTransport', async () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon
      .stub(
        (manager as unknown as { restTransport: RESTTransport }).restTransport,
        'invokeMutation'
      )
      .resolves({ data: testData } as DataConnectResponse<TestData>);

    await manager.invokeMutation<TestData, TestVariables>(
      'testMutation',
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith('testMutation', testVariables);
  });

  it('should delegate invokeSubscribe to RESTTransport', () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon.stub(
      (manager as unknown as { restTransport: RESTTransport }).restTransport,
      'invokeSubscribe'
    );

    const hook: SubscribeNotificationHook<TestData> = () => {};
    manager.invokeSubscribe<TestData, TestVariables>(
      hook,
      'testSub',
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith(hook, 'testSub', testVariables);
  });

  it('should delegate invokeUnsubscribe to RESTTransport', () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon.stub(
      (manager as unknown as { restTransport: RESTTransport }).restTransport,
      'invokeUnsubscribe'
    );

    manager.invokeUnsubscribe<TestVariables>('testSub', testVariables);

    expect(stub).to.have.been.calledOnceWith('testSub', testVariables);
  });

  it('should delegate useEmulator to RESTTransport', () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon.stub(
      (manager as unknown as { restTransport: RESTTransport }).restTransport,
      'useEmulator'
    );

    manager.useEmulator('localhost', 9000, false);

    expect(stub).to.have.been.calledOnceWith('localhost', 9000, false);
  });

  it('should delegate onAuthTokenChanged to RESTTransport', () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon.stub(
      (manager as unknown as { restTransport: RESTTransport }).restTransport,
      'onAuthTokenChanged'
    );

    manager.onAuthTokenChanged('new-token');

    expect(stub).to.have.been.calledOnceWith('new-token');
  });
});
