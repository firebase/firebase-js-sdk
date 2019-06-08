/**
 * @license
 * Copyright 2017 Google Inc.
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

import { TimerId } from '../../../src/util/async_queue';
import { Deferred } from '../../util/promise';
import { apiDescribe, withTestDb } from '../util/helpers';
import { asyncQueue } from '../util/internal_helpers';

apiDescribe('Idle Timeout', (persistence: boolean) => {
  it('can write document after idle timeout', () => {
    return withTestDb(persistence, db => {
      const docRef = db.collection('test-collection').doc();
      return docRef
        .set({ foo: 'bar' })
        .then(() => {
          return asyncQueue(db).runDelayedOperationsEarly(
            TimerId.WriteStreamIdle
          );
        })
        .then(() => docRef.set({ foo: 'bar' }));
    });
  });

  it('can watch documents after idle timeout', () => {
    return withTestDb(persistence, db => {
      const awaitOnlineSnapshot = (): Promise<void> => {
        const docRef = db.collection('test-collection').doc();
        const deferred = new Deferred<void>();
        const unregister = docRef.onSnapshot(
          { includeMetadataChanges: true },
          snapshot => {
            if (!snapshot.metadata.fromCache) {
              deferred.resolve();
            }
          }
        );
        return deferred.promise.then(unregister);
      };

      return awaitOnlineSnapshot()
        .then(() => {
          return asyncQueue(db).runDelayedOperationsEarly(
            TimerId.ListenStreamIdle
          );
        })
        .then(() => awaitOnlineSnapshot());
    });
  });
});
