import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { stubAllTimeouts } from '../../../test/helpers/timeout_stub';
import { User } from '../../model/user';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { _OFFSET_DURATION, _RETRY_BACKOFF_MIN, ProactiveRefresh } from './proactive_refresh';

use(chaiAsPromised);
use(sinonChai);

describe.only('src/core/user/proactive_refresh', () => {
  let timerTripFn: () => Promise<number>|number;
  let user: User;
  let proactiveRefresh: ProactiveRefresh;
  let getTokenStub: sinon.SinonStub;

  // Sets the expiration time in accordance with the offset in proactive refresh
  // This translates to the interval between updates
  function setExpirationTime(offset: number) {
    user.stsTokenManager.expirationTime = _OFFSET_DURATION + offset;
  }

  beforeEach(async () => {
    const auth = await testAuth();
    user = testUser(auth, 'uid');
    timerTripFn = stubAllTimeouts();

    // Cast to any to gain access to private member
    proactiveRefresh = new ProactiveRefresh(user);
    getTokenStub = sinon.stub(user, 'getIdToken').returns(Promise.resolve('foo'));

    sinon.stub(Date, 'now').returns(0);
    sinon.stub(window, 'clearTimeout');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls getToken at regular intervals', async () => {
    setExpirationTime(1000);
    proactiveRefresh._start();
    expect(await timerTripFn()).to.eq(1000);
    expect(await timerTripFn()).to.eq(1000);
    expect(await timerTripFn()).to.eq(1000);
    expect(getTokenStub.getCalls().length).to.eq(3);
  });

  it('stops getting token when _stop is called', async () => {
    setExpirationTime(1000);
    proactiveRefresh._start();
    expect(await timerTripFn()).to.eq(1000);
    proactiveRefresh._stop();
    expect(window.clearTimeout).to.have.been.calledWith(101);
  });

  it('stops getting token when a non-network error occurs', async () => {
    setExpirationTime(1000);
    getTokenStub.returns(Promise.reject(new Error('no')));
    proactiveRefresh._start();
    expect(await timerTripFn()).to.eq(1000);
    expect(timerTripFn).to.throw(Error, 'NO_MORE_TIMERS');
  });

  context('error backoff', () => {
    const error = AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {appName: 'app'});
    beforeEach(() => {
      getTokenStub.returns(Promise.reject(error));
    });

    it('schedules a backoff when a network error occurs', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await timerTripFn()).to.eq(1000);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN);
    });

    it('backoff continues to increase until the max', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await timerTripFn()).to.eq(1000);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 2);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 4);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 8);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 16);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 32);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 32);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 32);
    });

    it('backoff resets after one success', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await timerTripFn()).to.eq(1000);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 2);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 4);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 8);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 16);
      getTokenStub.returns(Promise.resolve());
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 32);
      expect(await timerTripFn()).to.eq(1000);
      getTokenStub.returns(Promise.reject(error));
      expect(await timerTripFn()).to.eq(1000);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 2);
      expect(await timerTripFn()).to.eq(_RETRY_BACKOFF_MIN * 4);
    });
  });
});