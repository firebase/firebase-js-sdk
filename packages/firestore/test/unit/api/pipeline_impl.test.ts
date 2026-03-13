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
import * as sinon from 'sinon';

import { Timestamp } from '../../../src';
import { Firestore } from '../../../src/api/database';
import { execute } from '../../../src/api/pipeline_impl';
import {
  MemoryOfflineComponentProvider,
  OnlineComponentProvider
} from '../../../src/core/component_provider';
import {
  ExecutePipelineRequest as ProtoExecutePipelineRequest,
  ExecutePipelineResponse as ProtoExecutePipelineResponse
} from '../../../src/protos/firestore_proto_api';
import { constant, field } from '../../lite/pipeline_export';
import { newTestFirestore } from '../../util/api_helpers';
import { describe } from '../../util/mocha_extensions';

const FIRST_CALL = 0;
const EXECUTE_PIPELINE_REQUEST = 3;

function fakePipelineResponse(
  firestore: Firestore,
  response?: ProtoExecutePipelineResponse[]
): sinon.SinonSpy {
  response = response ?? [
    {
      executionTime: Timestamp.now().toDate().toISOString(),
      results: []
    }
  ];
  const fake = sinon.fake.resolves(response);

  firestore._componentsProvider = {
    _offline: {
      build: () => new MemoryOfflineComponentProvider()
    },
    _online: {
      build: () => {
        const provider = new OnlineComponentProvider();
        const ogCreateDatastore = provider.createDatastore.bind(provider);
        provider.createDatastore = config => {
          const datastore = ogCreateDatastore(config);
          // @ts-ignore
          datastore.invokeStreamingRPC = fake;
          return datastore;
        };
        return provider;
      }
    }
  };

  return fake;
}

describe('execute(Pipeline|PipelineOptions)', () => {
  it('returns execution time with empty results', async () => {
    const firestore = newTestFirestore();

    const executeTime = Timestamp.now();
    const spy = fakePipelineResponse(firestore, [
      {
        executionTime: executeTime.toDate().toISOString(),
        results: []
      }
    ]);

    const pipelineSnapshot = await execute(
      firestore.pipeline().collection('foo')
    );

    expect(pipelineSnapshot.results.length).to.equal(0);
    expect(spy.calledOnce);

    expect(pipelineSnapshot.executionTime.toJSON()).to.deep.equal(
      executeTime.toJSON()
    );
  });

  it('serializes the pipeline', async () => {
    const firestore = newTestFirestore();
    const spy = fakePipelineResponse(firestore);

    await execute({
      pipeline: firestore.pipeline().collection('foo')
    });

    const executePipelineRequest: ProtoExecutePipelineRequest = {
      database: 'projects/new-project/databases/(default)',
      structuredPipeline: {
        'options': {},
        'pipeline': {
          'stages': [
            {
              'args': [
                {
                  'referenceValue': '/foo'
                }
              ],
              'name': 'collection',
              'options': {}
            }
          ]
        }
      }
    };
    expect(spy.args[FIRST_CALL][EXECUTE_PIPELINE_REQUEST]).to.deep.equal(
      executePipelineRequest
    );
  });

  it('serializes the pipeline options', async () => {
    const firestore = newTestFirestore();
    const spy = fakePipelineResponse(firestore);

    await execute({
      pipeline: firestore.pipeline().collection('foo'),
      indexMode: 'recommended'
    });

    const executePipelineRequest: ProtoExecutePipelineRequest = {
      database: 'projects/new-project/databases/(default)',
      structuredPipeline: {
        'options': {
          'index_mode': {
            'stringValue': 'recommended'
          }
        },
        'pipeline': {
          'stages': [
            {
              'args': [
                {
                  'referenceValue': '/foo'
                }
              ],
              'name': 'collection',
              'options': {}
            }
          ]
        }
      }
    };
    expect(spy.args[FIRST_CALL][EXECUTE_PIPELINE_REQUEST]).to.deep.equal(
      executePipelineRequest
    );
  });

  it('serializes the pipeline raw options', async () => {
    const firestore = newTestFirestore();
    const spy = fakePipelineResponse(firestore);

    await execute({
      pipeline: firestore.pipeline().collection('foo'),
      rawOptions: {
        'foo': 'bar'
      }
    });

    const executePipelineRequest: ProtoExecutePipelineRequest = {
      database: 'projects/new-project/databases/(default)',
      structuredPipeline: {
        'options': {
          'foo': {
            'stringValue': 'bar'
          }
        },
        'pipeline': {
          'stages': [
            {
              'args': [
                {
                  'referenceValue': '/foo'
                }
              ],
              'name': 'collection',
              'options': {}
            }
          ]
        }
      }
    };
    expect(spy.args[FIRST_CALL][EXECUTE_PIPELINE_REQUEST]).to.deep.equal(
      executePipelineRequest
    );
  });
});

describe('stage serialization', () => {
  describe('search stage', () => {
    it('serializes the pipeline', async () => {
      const firestore = newTestFirestore();
      const spy = fakePipelineResponse(firestore);

      await execute({
        pipeline: firestore
          .pipeline()
          .collection('foo')
          .search({
            query: 'foo',
            limit: 1,
            retrievalDepth: 2,
            offset: 3,
            queryEnhancement: 'required',
            languageCode: 'en-US',
            sort: [field('foo').ascending()],
            addFields: [constant(true).as('bar')],
            select: [field('id')]
          })
      });

      const executePipelineRequest: ProtoExecutePipelineRequest = {
        database: 'projects/new-project/databases/(default)',
        structuredPipeline: {
          'options': {},
          'pipeline': {
            'stages': [
              {
                'args': [
                  {
                    'referenceValue': '/foo'
                  }
                ],
                'name': 'collection',
                'options': {}
              },
              {
                'args': [],
                'name': 'search',
                'options': {
                  'query': {
                    'functionValue': {
                      'args': [
                        {
                          'stringValue': 'foo'
                        }
                      ],
                      'name': 'document_matches',
                      'options': {}
                    }
                  },
                  'limit': { integerValue: '1' },
                  'retrieval_depth': { integerValue: '2' },
                  'offset': { integerValue: '3' },
                  'query_enhancement': { stringValue: 'required' },
                  'language_code': { stringValue: 'en-US' },
                  'select': {
                    'mapValue': {
                      'fields': {
                        'id': {
                          'fieldReferenceValue': 'id'
                        }
                      }
                    }
                  },
                  'sort': {
                    'arrayValue': {
                      'values': [
                        {
                          'mapValue': {
                            'fields': {
                              'direction': {
                                'stringValue': 'ascending'
                              },
                              'expression': {
                                'fieldReferenceValue': 'foo'
                              }
                            }
                          }
                        }
                      ]
                    }
                  },
                  'add_fields': {
                    'mapValue': {
                      'fields': {
                        'bar': {
                          'booleanValue': true
                        }
                      }
                    }
                  }
                }
              }
            ]
          }
        }
      };
      expect(spy.args[FIRST_CALL][EXECUTE_PIPELINE_REQUEST]).to.deep.equal(
        executePipelineRequest
      );
    });
  });
});
