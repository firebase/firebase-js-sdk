import { expect } from "chai";
import { SinonFakeXMLHttpRequest, useFakeXMLHttpRequest } from "sinon";
import { ErrorCode } from "../../src/implementation/connection";
import { XhrConnection } from "../../src/platform/browser/connection";

describe('Connections', () => {
    it('XhrConnection.send() should not reject on network errors', async () => {
        const fakeXHR = useFakeXMLHttpRequest();
        const connection = new XhrConnection();
        const sendPromise = connection.send('testurl', 'GET');
        // simulate a network error
        ((connection as any).xhr_ as SinonFakeXMLHttpRequest).error();
        await sendPromise;
        expect(connection.getErrorCode()).to.equal(ErrorCode.NETWORK_ERROR);
        fakeXHR.restore();
    });
});
