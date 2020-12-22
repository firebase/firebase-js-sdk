import { apiDescribe } from "../util/helpers";
import { TEST_PROJECT, } from "../../unit/local/persistence_test_helpers";


import { Firestore } from '../../../index.console';
import { DEFAULT_DATABASE_NAME } from "../../../src/core/database_info";
import { Provider, ComponentContainer } from '@firebase/component';
import { setLogLevel } from '@firebase/logger';
import { Deferred } from '../../../src/util/promise';
import { expect } from 'chai';

// setLogLevel('debug');

interface TimeToFirstByteResult { 
    isLongPollingConnection: boolean,
    timeToFirstByte: number
}

apiDescribe('Standalone', (persistence: boolean) => {
    it.only('can auto detect the connection type', async () => {
        const onTimeToFirstByte = new Deferred<TimeToFirstByteResult>();
        const db = new Firestore({ database: DEFAULT_DATABASE_NAME, projectId: `khanrafi-fb-sdk` },
                new Provider('auth-internal', new ComponentContainer('default')),
                (isLongPollingConnection, timeToFirstByte) => onTimeToFirstByte.resolve({ isLongPollingConnection, timeToFirstByte }
            ));
        
        db.settings({
            experimentalAutoDetectLongPolling: true
        });

        try
        {
            await db.collection('users').doc('foo@bar.com').get();
        }
        catch(e)
        {
            console.error(e);
        }

        const stats = await onTimeToFirstByte.promise;

        expect(stats).to.be.ok;
    });
});
