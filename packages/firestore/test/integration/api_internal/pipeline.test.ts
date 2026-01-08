/**
 * @license
 * Copyright 2025 Google LLC
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

import { expect } from 'chai';

import { Deferred } from '../../util/promise';
import {
  addDoc,
  CollectionReference,
  Firestore,
  vector
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';
import {
  field,
  _internalPipelineToExecutePipelineRequestProto,
  execute
} from '../util/pipeline_export';

apiDescribe.skipClassic('Pipelines', persistence => {
  let firestore: Firestore;
  let randomCol: CollectionReference;
  let testDeferred: Deferred<void> | undefined;
  let withTestCollectionPromise: Promise<unknown> | undefined;

  beforeEach(async () => {
    const setupDeferred = new Deferred<void>();
    testDeferred = new Deferred<void>();
    withTestCollectionPromise = withTestCollection(
      persistence,
      {},
      async (collectionRef, firestoreInstance) => {
        randomCol = collectionRef;
        firestore = firestoreInstance;
        setupDeferred.resolve();

        return testDeferred?.promise;
      }
    );

    await setupDeferred.promise;
  });

  afterEach(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
  });

  describe('console support', () => {
    it('supports pipeline query serialization to proto', async () => {
      // Perform the same test as the console
      const pipeline = firestore
        .pipeline()
        .collection('customers')
        .where(field('country').equal('United Kingdom'));

      const proto = _internalPipelineToExecutePipelineRequestProto(pipeline);

      const expectedStructuredPipelineProto =
        '{"pipeline":{"stages":[{"name":"collection","options":{},"args":[{"referenceValue":"/customers"}]},{"name":"where","options":{},"args":[{"functionValue":{"name":"equal","args":[{"fieldReferenceValue":"country"},{"stringValue":"United Kingdom"}]}}]}]}}';
      expect(JSON.stringify(proto.structuredPipeline)).to.equal(
        expectedStructuredPipelineProto
      );
    });

    it('supports PipelineSnapshot serialization to proto', async () => {
      await addDoc(randomCol, {
        title: '1984',
        author: 'George Orwell',
        genre: 'Dystopian',
        published: 1949,
        rating: 4.2,
        tags: ['surveillance', 'totalitarianism', 'propaganda'],
        awards: { prometheus: true },
        embedding: vector([1, 1, 1, 1, 1, 1, 1, 10, 1, 1])
      });

      // Perform the same test as the console
      const pipeline = firestore
        .pipeline()
        .collection(randomCol)
        .sort(field('title').ascending())
        .limit(1);

      const result = await execute(pipeline);

      expect(result.results[0]._fieldsProto()).to.deep.equal({
        'author': {
          'stringValue': 'George Orwell'
        },
        'awards': {
          'mapValue': {
            'fields': {
              'prometheus': {
                'booleanValue': true
              }
            }
          }
        },
        'embedding': {
          'mapValue': {
            'fields': {
              '__type__': {
                'stringValue': '__vector__'
              },
              'value': {
                'arrayValue': {
                  'values': [
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 10
                    },
                    {
                      'doubleValue': 1
                    },
                    {
                      'doubleValue': 1
                    }
                  ]
                }
              }
            }
          }
        },
        'genre': {
          'stringValue': 'Dystopian'
        },
        'published': {
          'integerValue': '1949'
        },
        'rating': {
          'doubleValue': 4.2
        },
        'tags': {
          'arrayValue': {
            'values': [
              {
                'stringValue': 'surveillance'
              },
              {
                'stringValue': 'totalitarianism'
              },
              {
                'stringValue': 'propaganda'
              }
            ]
          }
        },
        'title': {
          'stringValue': '1984'
        }
      });
    });

    it('performs validation', async () => {
      expect(() => {
        const pipeline = firestore
          .pipeline()
          .collection('customers')
          .where(field('country').equal(new Map([])));

        _internalPipelineToExecutePipelineRequestProto(pipeline);
      }).to.throw();
    });
  });
});
