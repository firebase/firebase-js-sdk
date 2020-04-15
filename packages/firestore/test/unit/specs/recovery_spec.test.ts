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

import { describeSpec, specTest } from './describe_spec';
import { client } from './spec_builder';
import { TimerId } from '../../../src/util/async_queue';
import { Query } from '../../../src/core/query';
import { path } from '../../util/helpers';

describeSpec(
  'Persistence Recovery',
  ['durable-persistence', 'no-ios', 'no-android'],
  () => {
    specTest(
      'Write is acknowledged by primary client (with recovery)',
      ['multi-client'],
      () => {
        return (
          client(0)
            .expectPrimaryState(true)
            .client(1)
            .expectPrimaryState(false)
            .userSets('collection/a', { v: 1 })
            .failDatabase()
            .client(0)
            .writeAcks('collection/a', 1, { expectUserCallback: false })
            .client(1)
            // Client 1 has received the WebStorage notification that the write
            // has been acknowledged, but failed to process the change. Hence,
            // we did not get a user callback. We schedule the first retry and
            // make sure that it cannot be processed until `recoverDatabase`
            // is called.
            .runTimer(TimerId.AsyncQueueRetry)
            .recoverDatabase()
            .runTimer(TimerId.AsyncQueueRetry)
            .expectUserCallbacks({
              acknowledged: ['collection/a']
            })
        );
      }
    );

    specTest(
      'Query raises events in secondary client  (with recovery)',
      ['multi-client'],
      () => {
        const query = Query.atPath(path('collection'));

        return client(0)
          .expectPrimaryState(true)
          .client(1)
          .expectPrimaryState(false)
          .userListens(query)
          .failDatabase()
          .client(0)
          .expectListen(query)
          .watchAcksFull(query, 1000)
          .client(1)
          .recoverDatabase()
          .runTimer(TimerId.AsyncQueueRetry)
          .expectEvents(query, {});
      }
    );
  }
);
