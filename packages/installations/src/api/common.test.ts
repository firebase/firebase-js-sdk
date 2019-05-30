import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import '../testing/setup';
import { retryIfServerError } from './common';

describe('common', () => {
  describe('retryIfServerError', () => {
    let fetchStub: SinonStub<[], Promise<Response>>;

    beforeEach(() => {
      fetchStub = stub();
    });

    it('retries once if the server returns a 5xx error', async () => {
      const expectedResponse = new Response();
      fetchStub.onCall(0).resolves(new Response(null, { status: 500 }));
      fetchStub.onCall(1).resolves(expectedResponse);

      await expect(retryIfServerError(fetchStub)).to.eventually.equal(
        expectedResponse
      );
      expect(fetchStub).to.be.calledTwice;
    });

    it('does not retry again if the server returns a 5xx error twice', async () => {
      const expectedResponse = new Response(null, { status: 500 });
      fetchStub.onCall(0).resolves(new Response(null, { status: 500 }));
      fetchStub.onCall(1).resolves(expectedResponse);
      fetchStub.onCall(2).resolves(new Response());

      await expect(retryIfServerError(fetchStub)).to.eventually.equal(
        expectedResponse
      );
      expect(fetchStub).to.be.calledTwice;
    });

    it('does not retry if the error is not 5xx', async () => {
      const expectedResponse = new Response(null, { status: 404 });
      fetchStub.resolves(expectedResponse);

      await expect(retryIfServerError(fetchStub)).to.eventually.equal(
        expectedResponse
      );
      expect(fetchStub).to.be.calledOnce;
    });

    it('does not retry if response is ok', async () => {
      const expectedResponse = new Response();
      fetchStub.resolves(expectedResponse);

      await expect(retryIfServerError(fetchStub)).to.eventually.equal(
        expectedResponse
      );
      expect(fetchStub).to.be.calledOnce;
    });
  });
});
