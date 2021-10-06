import { stub } from 'sinon';
import { expect } from 'chai';
import { ErrorCode } from '../../src/implementation/connection';
import { FetchConnection } from '../../src/platform/node/connection';

describe('Connections', () => {
    it('FetchConnection.send() should not reject on network errors', async () => {
        const connection = new FetchConnection();

        // need the casting here because fetch_ is a private member
        stub(connection as any, 'fetch_').rejects();
        await connection.send('testurl', 'GET');
        expect(connection.getErrorCode()).to.equal(ErrorCode.NETWORK_ERROR);
    });
});
