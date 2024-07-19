import { expect, use } from 'chai';
import { dcFetch, initializeFetch } from '../../src/network/fetch';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
use(chaiAsPromised);
function mockFetch(json: any) {
  const fakeFetchImpl = sinon.stub().returns(
    Promise.resolve({
      json: () => {
        return Promise.resolve(json);
      },
      status: 401
    } as Response)
  );
  initializeFetch(fakeFetchImpl);
}
describe('fetch', () => {
  it('should throw an error with just the message when the server responds with an error with a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    mockFetch({
      code: 401,
      message
    });
    await expect(
      dcFetch('http://localhost', {}, {} as AbortController, null)
    ).to.eventually.be.rejectedWith(message);
  });
  it('should throw a stringified message when the server responds with an error without a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    const json = {
      code: 401,
      message1: message
    }
    mockFetch(json);
    await expect(
      dcFetch('http://localhost', {}, {} as AbortController, null)
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
  });
});
