import { apiDescribe } from "../util/helpers";
import { TEST_PROJECT, } from "../../unit/local/persistence_test_helpers";


import { Firestore } from '../../../index.console';
import { DEFAULT_DATABASE_NAME } from "../../../src/core/database_info";
import { Provider, ComponentContainer } from '@firebase/component';
import { setLogLevel } from '@firebase/logger';
import { Deferred } from '../../../src/util/promise';
import { expect } from 'chai';

// setLogLevel('debug');

apiDescribe('Database', (persistence: boolean) => {
    it.only('receives callbacks', async () => {
        const deferred = new Deferred<{ type: number, timeToFirstByte: number }>();
        const fs = new Firestore({ database: DEFAULT_DATABASE_NAME, projectId: `khanrafi-fb-sdk` },
            new Provider('auth-internal', new ComponentContainer('default')), (type, timeToFirstByte) => deferred.resolve({ type, timeToFirstByte }));
        
        fs.settings({
            experimentalAutoDetectLongPolling: true
        });

        try
        {
            await fs.collection('users').doc('foo@bar.com').get();
        }
        catch(e)
        {
            console.error(e);
        }

        const stats = await deferred.promise;

        expect(stats).to.be.ok;
    });
});