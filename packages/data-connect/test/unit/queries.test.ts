import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import {
  AuthTokenListener,
  AuthTokenProvider,
  DataConnectOptions,
  FirebaseAuthProvider
} from '../../src';
import { RESTTransport } from '../../src/network/transport/rest';
import { initializeFetch } from '../../src/network/fetch';
import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
chai.use(chaiAsPromised);
const options: DataConnectOptions = {
  connector: 'c',
  location: 'l',
  projectId: 'p',
  service: 's'
};
const INITIAL_TOKEN = 'initial token';
class FakeAuthProvider implements AuthTokenProvider {
  private token: string | null = INITIAL_TOKEN;
  addTokenChangeListener(listener: AuthTokenListener): void {}
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null> {
    if (!forceRefresh) {
      return Promise.resolve({ accessToken: this.token! });
    }
    return Promise.resolve({ accessToken: 'testToken' });
  }
  setToken(_token: string | null) {
    this.token = _token;
  }
}
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
describe('Queries', () => {
  afterEach(() => {
    fakeFetchImpl.resetHistory();
  });
  it('[QUERY] should retry auth whenever the fetcher returns with unauthorized', async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, authProvider);
    await expect(
      rt.invokeQuery('test', null)
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
    expect(fakeFetchImpl.callCount).to.eq(2);
  });
  it('[MUTATION] should retry auth whenever the fetcher returns with unauthorized', async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, authProvider);
    await expect(
      rt.invokeMutation('test', null)
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
    expect(fakeFetchImpl.callCount).to.eq(2);
  });
  it("should not retry auth whenever the fetcher returns with unauthorized and the token doesn't change", async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, authProvider);
    rt._setLastToken('initial token');
    await expect(
      rt.invokeQuery('test', null) as Promise<any>
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
    expect(fakeFetchImpl.callCount).to.eq(1);
  });
});
