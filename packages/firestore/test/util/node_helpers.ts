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

import { expect } from 'chai';

import {
  loadRawProtos,
  protoLoaderOptions
} from '../../src/platform_node/load_protos';
import * as api from '../../src/protos/firestore_proto_api';

const protos = loadRawProtos();
// tslint:disable-next-line:variable-name
const ValueMessage = protos.lookupType('google.firestore.v1.Value');

/**
 * Verifies full round-trip of JSON protos through ProtobufJs.
 */
export function verifyProtobufJsRoundTrip(jsonValue: api.Value): void {
  const protobufJsEncocdedProto = ValueMessage.fromObject(jsonValue);
  const protobufJsDecocdedProto = ValueMessage.toObject(
    protobufJsEncocdedProto,
    protoLoaderOptions
  );
  expect(protobufJsDecocdedProto).to.deep.equal(jsonValue);
}
