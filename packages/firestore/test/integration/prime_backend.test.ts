/**
 * @license
 * Copyright 2018 Google LLC
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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';
import { EventsAccumulator } from './util/events_accumulator';
import { withTestDoc } from './util/helpers';

// Firestore databases can be subject to a ~30s "cold start" delay if they have not been used
// recently, so before any tests run we "prime" the backend.

const PRIMING_TIMEOUT_MS = 45000;

before(
  'Prime backend by waiting for a write to show up in the watch stream',
  function(): Promise<void> {
    this.timeout(PRIMING_TIMEOUT_MS);

    return withTestDoc(/*persistence=*/ false, async doc => {
      const accumulator = new EventsAccumulator<firestore.DocumentSnapshot>();
      const unsubscribe = doc.onSnapshot(accumulator.storeEvent);

      // Wait for watch to initialize and deliver first event.
      await accumulator.awaitRemoteEvent();

      // Use a transaction to perform a write without triggering any local events.
      await doc.firestore.runTransaction(async txn => {
        txn.set(doc, { value: 'done' });
      });

      // Wait to see the write on the watch stream.
      const docSnap = await accumulator.awaitRemoteEvent();
      expect(docSnap.get('value')).to.equal('done');

      unsubscribe();
    });
  }
);
