/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { apiDescribe } from '../util/helpers';
import { TEST_PROJECT } from '../../unit/local/persistence_test_helpers';

import { Firestore } from '../../../index.console';
import { DEFAULT_DATABASE_NAME } from '../../../src/core/database_info';
import { Provider, ComponentContainer } from '@firebase/component';
import { Deferred } from '../../../src/util/promise';
import { expect } from 'chai';

interface TimeToFirstByteResult {
  isLongPollingConnection: boolean;
  timeToFirstByte: number;
}

apiDescribe('Standalone', (persistence: boolean) => {
  it('can auto detect the connection type', async () => {
    const onTimeToFirstByte = new Deferred<TimeToFirstByteResult>();
    const db = new Firestore(
      {
        database: DEFAULT_DATABASE_NAME,
        projectId: TEST_PROJECT /*`khanrafi-fb-sdk`*/
      },
      new Provider('auth-internal', new ComponentContainer('default')),
      (isLongPollingConnection, timeToFirstByte) =>
        onTimeToFirstByte.resolve({ isLongPollingConnection, timeToFirstByte })
    );

    db.settings({
      experimentalAutoDetectLongPolling: true
    });

    await db.collection('users').doc('foo@bar.com').get();

    const stats = await onTimeToFirstByte.promise;

    expect(stats).to.be.ok;
  });
});
