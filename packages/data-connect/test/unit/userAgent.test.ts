import { executeQuery, getDataConnect, queryRef } from "../../src"
import * as sinon from 'sinon';
import { initializeFetch } from "../../src/network/fetch";
import { expect, use } from "chai";
import { SDK_VERSION } from "../../src/core/version";
import sinonChai from "sinon-chai";
use(sinonChai);
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
describe('User Agent Tests', () => {
    it('should send a request with the corresponding user agent if using the generated SDK', async () =>  {
        initializeFetch(fakeFetchImpl);
        const dc = getDataConnect({ connector: 'c', location: 'l', service: 's' });
        dc._useGeneratedSdk();
        // @ts-ignore
        try {
            await executeQuery(queryRef(dc, ''));
        } catch { }
        expect(fakeFetchImpl).to.be.calledWithMatch('https://firebasedataconnect.googleapis.com/v1alpha/projects/p/locations/l/services/s/connectors/c:executeQuery', {
            headers: {
                ['X-Goog-Api-Client']: 'gl-js/ fire/' + SDK_VERSION + ' web/gen'
            }
        })

    });
})