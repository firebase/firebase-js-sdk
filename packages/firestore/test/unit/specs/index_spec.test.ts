/**
 * @license
 * Copyright 2022 Google LLC
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

import { IndexConfiguration } from '../../../src/api/index_configuration';
import { IndexKind } from '../../../src/model/field_index';
import * as Helpers from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client } from './spec_builder';

describeSpec('Client Side Index', [], () => {
  const config: IndexConfiguration = {
    indexes: [
      {
        collectionGroup: 'restaurants',
        queryScope: 'COLLECTION',
        fields: [
          {
            fieldPath: 'price',
            order: 'ASCENDING'
          }
        ]
      }
    ]
  };
  const expectedIndexes = [
    Helpers.fieldIndex('restaurants', {
      fields: [['price', IndexKind.ASCENDING]]
    })
  ];

  specTest('Index Creation visible on all clients', ['multi-client'], () => {
    return client(0)
      .expectPrimaryState(true)
      .setIndexConfiguration(config)
      .expectIndexes(expectedIndexes)
      .client(1)
      .expectPrimaryState(false)
      .expectIndexes(expectedIndexes);
  });

  specTest(
    'Index Creation succeeds even if not primary',
    ['multi-client'],
    () => {
      return client(0)
        .expectPrimaryState(true)
        .client(1)
        .expectPrimaryState(false)
        .setIndexConfiguration(config)
        .expectIndexes(expectedIndexes)
        .client(0)
        .expectIndexes(expectedIndexes);
    }
  );
});
