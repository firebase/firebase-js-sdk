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
import { RESTTransport } from '../../src/network/rest/RestTransport';

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
    const stub = sinon
      .stub(RESTTransport.prototype, 'invokeQuery')
      .resolves({ data: testData } as DataConnectResponse<TestData>);
    manager = new DataConnectTransportManager(options);

    await manager.invokeQuery<TestData, TestVariables>(
      'testQuery',
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith('testQuery', testVariables);
  });

  it('should delegate invokeMutation to RESTTransport', async () => {
    const stub = sinon
      .stub(RESTTransport.prototype, 'invokeMutation')
      .resolves({ data: testData } as DataConnectResponse<TestData>);
    manager = new DataConnectTransportManager(options);

    await manager.invokeMutation<TestData, TestVariables>(
      'testMutation',
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith('testMutation', testVariables);
  });

  it('should delegate invokeSubscribe to RESTTransport', () => {
    const stub = sinon.stub(RESTTransport.prototype, 'invokeSubscribe');
    manager = new DataConnectTransportManager(options);

    const hook: SubscribeNotificationHook<TestData> = () => {};
    manager.invokeSubscribe<TestData, TestVariables>(
      hook,
      'testSub',
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith(hook, 'testSub', testVariables);
  });

  it('should delegate invokeUnsubscribe to RESTTransport', () => {
    const stub = sinon.stub(RESTTransport.prototype, 'invokeUnsubscribe');
    manager = new DataConnectTransportManager(options);

    manager.invokeUnsubscribe<TestVariables>('testSub', testVariables);

    expect(stub).to.have.been.calledOnceWith('testSub', testVariables);
  });

  it('should delegate useEmulator to RESTTransport', () => {
    const stub = sinon.stub(RESTTransport.prototype, 'useEmulator');
    manager = new DataConnectTransportManager(options);

    manager.useEmulator('localhost', 9000, false);

    expect(stub).to.have.been.calledOnceWith('localhost', 9000, false);
  });

  it('should delegate onAuthTokenChanged to RESTTransport', () => {
    const stub = sinon.stub(RESTTransport.prototype, 'onAuthTokenChanged');
    manager = new DataConnectTransportManager(options);

    manager.onAuthTokenChanged('new-token');

    expect(stub).to.have.been.calledOnceWith('new-token');
  });
});
