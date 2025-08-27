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

import { DatabaseId } from '../../../src/core/database_info';
import {StructuredPipeline, StructuredPipelineOptions} from '../../../src/core/structured_pipeline';
import { Pipeline as PipelineProto } from '../../../src/protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  ProtoSerializable
} from '../../../src/remote/serializer';
import {testUserDataReader} from "../../util/helpers";

describe.only('StructuredPipeline', () => {
  it('should serialize the pipeline argument', () => {
    const pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const structuredPipelineOptions = new StructuredPipelineOptions();
    structuredPipelineOptions._readUserData(testUserDataReader(false));
    const structuredPipeline = new StructuredPipeline(pipeline, structuredPipelineOptions);

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
    const pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };

    const options = new StructuredPipelineOptions({
      indexMode: 'recommended'
    });
    options._readUserData(testUserDataReader(false));
    const structuredPipeline = new StructuredPipeline(
      pipeline,options
    );

    const proto = structuredPipeline._toProto(
      new JsonProtoSerializer(DatabaseId.empty(), false)
    );

    expect(proto).to.deep.equal({
      pipeline: {},
      options: {
        'index_mode': {
          stringValue: 'recommended'
        }
      }
    });

    expect((pipeline._toProto as sinon.SinonSpy).calledOnce).to.be.true;
  });

  it('should support unknown options', () => {
    const pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const options =
        new StructuredPipelineOptions({},
            {
              'foo_bar': 'baz'
            }
        );
    options._readUserData(testUserDataReader(false));
    const structuredPipeline = new StructuredPipeline(
      pipeline,
        options
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

  it('should support unknown nested options', () => {
    const pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const options =
        new StructuredPipelineOptions({},
            {
              'foo.bar': 'baz'
            }
        );
    options._readUserData(testUserDataReader(false));
    const structuredPipeline = new StructuredPipeline(
      pipeline,
        options
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

  it('should support options override', () => {
    const pipeline: ProtoSerializable<PipelineProto> = {
      _toProto: sinon.fake.returns({} as PipelineProto)
    };
    const options =
        new StructuredPipelineOptions({
              indexMode: 'recommended'
            },
            {
              'index_mode': 'baz'
            }
        );
    options._readUserData(testUserDataReader(false));
    const structuredPipeline = new StructuredPipeline(
      pipeline,
        options
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
});
