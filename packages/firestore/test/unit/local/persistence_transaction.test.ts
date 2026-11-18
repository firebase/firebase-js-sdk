/**
 * @license
 * Copyright 2026 Google LLC
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

import { TargetId } from '../../../src/core/types';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  DbTargetKey,
  DbTargetStore
} from '../../../src/local/indexeddb_sentinels';
import { getStore } from '../../../src/local/indexeddb_transaction';
import { Persistence } from '../../../src/local/persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';

import * as persistenceHelpers from './persistence_test_helpers';

let persistence: Persistence;

describe('MemoryTransaction', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryEagerPersistence().then(p => {
      persistence = p;
    });
  });

  genericTransactionTests();
});

describe.skipIf(!IndexedDbPersistence.isAvailable())(
  'IndexedDbTransaction',
  () => {
    beforeEach(() => {
      return persistenceHelpers.testIndexedDbPersistence().then(p => {
        persistence = p;
      });
    });

    afterEach(() => persistence.shutdown());

    genericTransactionTests();

    it('only invokes onCommittedListener once with retries', async () => {
      let runCount = 0;
      let commitCount = 0;
      await persistence.runTransaction('onCommitted', 'readwrite', txn => {
        const targetsStore = getStore<DbTargetKey, { targetId: TargetId }>(
          txn,
          DbTargetStore
        );

        txn.addOnCommittedListener(() => {
          ++commitCount;
        });

        expect(commitCount).toBe(0);

        ++runCount;
        if (runCount === 1) {
          // Trigger a unique key violation
          return targetsStore
            .add({ targetId: 1 })
            .next(() => targetsStore.add({ targetId: 1 }));
        } else {
          return PersistencePromise.resolve(0);
        }
      });

      expect(runCount).toBe(2);
      expect(commitCount).toBe(1);
    });
  }
);

function genericTransactionTests(): void {
  it('invokes onCommittedListener when transaction succeeds', async () => {
    let onCommitted = false;
    await persistence.runTransaction('onCommitted', 'readonly', txn => {
      txn.addOnCommittedListener(() => {
        onCommitted = true;
      });

      expect(onCommitted).toBe(false);
      return PersistencePromise.resolve();
    });

    expect(onCommitted).toBe(true);
  });

  it('does not invoke onCommittedListener when transaction fails', async () => {
    let onCommitted = false;
    await persistence
      .runTransaction('onCommitted', 'readonly', txn => {
        txn.addOnCommittedListener(() => {
          onCommitted = true;
        });

        return PersistencePromise.reject(new Error('Aborted'));
      })
      .catch(() => {});

    expect(onCommitted).toBe(false);
  });
}
