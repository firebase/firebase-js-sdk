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

import { StructuredPipeline } from '../../../src/core/structured_pipeline';
import {
  JsonProtoSerializer,
  ProtoSerializable
} from '../../../src/remote/serializer';

import { Pipeline as PipelineProto } from '../../../src/protos/firestore_proto_api';
import { DatabaseId } from '../../../src/core/database_info';
import { ObjectValue } from '../../../src/model/object_value';

describe('StructuredPipeline', () => {
  it('should serialize the pipeline argument', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const structuredPipeline = new StructuredPipeline(pipeline, {}, {});

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {}
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it('should support known options', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {
        indexMode: 'recommended'
      },
      {}
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        index_mode: {
          stringValue: 'recommended'
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it.only('should support unknown options', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {},
      {
        'foo_bar': { stringValue: 'baz' }
      }
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'foo_bar': {
          stringValue: 'baz'
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it.only('should support unknown nested options', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {},
      {
        'foo.bar': { stringValue: 'baz' }
      }
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'foo': {
          mapValue: {
            fields: {
              'bar': { stringValue: 'baz' }
            }
          }
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it.only('should support options override', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {
        indexMode: 'recommended'
      },
      {
        'index_mode': { stringValue: 'baz' }
      }
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'index_mode': {
          stringValue: 'baz'
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it.only('should support options override of nested field', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };

    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {},
      {
        'foo.bar': { integerValue: 123 }
      }
    );

    // Fake known options with a nested {foo: {bar: "baz"}}
    structuredPipeline._getKnownOptions = sinon.fake.returns(
      new ObjectValue({
        mapValue: {
          fields: {
            'foo': {
              mapValue: {
                fields: {
                  'bar': { stringValue: 'baz' },
                  'waldo': { booleanValue: true }
                }
              }
            }
          }
        }
      })
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'foo': {
          mapValue: {
            fields: {
              'bar': {
                integerValue: 123
              },
              'waldo': {
                booleanValue: true
              }
            }
          }
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it.only('will replace a nested object if given a new object', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };

    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {},
      {
        'foo': { mapValue: { fields: { bar: { integerValue: 123 } } } }
      }
    );

    // Fake known options with a nested {foo: {bar: "baz"}}
    structuredPipeline._getKnownOptions = sinon.fake.returns(
      new ObjectValue({
        mapValue: {
          fields: {
            'foo': {
              mapValue: {
                fields: {
                  'bar': { stringValue: 'baz' },
                  'waldo': { booleanValue: true }
                }
              }
            }
          }
        }
      })
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'foo': {
          mapValue: {
            fields: {
              'bar': {
                integerValue: 123
              }
            }
          }
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it.only('will replace a top level property that is not an object if given a nested field with dot notation', () => {
    let pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };

    const structuredPipeline = new StructuredPipeline(
      pipeline,
      {},
      {
        'foo': {
          mapValue: {
            fields: {
              'bar': { stringValue: '123' },
              'waldo': { booleanValue: true }
            }
          }
        }
      }
    );

    // Fake known options with a nested {foo: {bar: "baz"}}
    structuredPipeline._getKnownOptions = sinon.fake.returns(
      new ObjectValue({
        mapValue: {
          fields: {
            'foo': { integerValue: 123 }
          }
        }
      })
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'foo': {
          mapValue: {
            fields: {
              'bar': {
                stringValue: '123'
              },
              'waldo': {
                booleanValue: true
              }
            }
          }
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });
});
