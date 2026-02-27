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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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

  it('should delegate invokeQuery to RESTTransport', async () => {
    const stub = sinon
      .stub(RESTTransport.prototype, 'invokeQuery')
      .resolves({ data: {} } as DataConnectResponse<Any>);
    manager = new DataConnectTransportManager(options);

    await manager.invokeQuery('testQuery', { a: 1 });

    expect(stub).to.have.been.calledOnceWith('testQuery', { a: 1 });
  });

  it('should delegate invokeMutation to RESTTransport', async () => {
    const stub = sinon
      .stub(RESTTransport.prototype, 'invokeMutation')
      .resolves({ data: {} } as DataConnectResponse<Any>);
    manager = new DataConnectTransportManager(options);

    await manager.invokeMutation('testMutation', { b: 2 });

    expect(stub).to.have.been.calledOnceWith('testMutation', { b: 2 });
  });

  it('should delegate invokeSubscribe to RESTTransport', () => {
    const stub = sinon.stub(RESTTransport.prototype, 'invokeSubscribe');
    manager = new DataConnectTransportManager(options);

    const hook: SubscribeNotificationHook<Any> = () => {};
    manager.invokeSubscribe(hook, 'testSub', { c: 3 });

    expect(stub).to.have.been.calledOnceWith(hook, 'testSub', { c: 3 });
  });

  it('should delegate invokeUnsubscribe to RESTTransport', () => {
    const stub = sinon.stub(RESTTransport.prototype, 'invokeUnsubscribe');
    manager = new DataConnectTransportManager(options);

    manager.invokeUnsubscribe('testSub', { c: 3 });

    expect(stub).to.have.been.calledOnceWith('testSub', { c: 3 });
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
