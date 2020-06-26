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

import { loadSync } from '@grpc/proto-loader';
import { loadPackageDefinition, GrpcObject } from '@grpc/grpc-js';
import { join, resolve, isAbsolute } from 'path';
// only used in tests
// eslint-disable-next-line import/no-extraneous-dependencies
import { IConversionOptions, Root } from 'protobufjs';

/** Used by tests so we can match @grpc/proto-loader behavior. */
export const protoLoaderOptions: IConversionOptions = {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: false
};

/**
 * Loads the protocol buffer definitions for Firestore.
 *
 * @returns The GrpcObject representing our protos.
 */
export function loadProtos(): GrpcObject {
  const root = resolve(
    __dirname,
    process.env.FIRESTORE_PROTO_ROOT || '../../protos'
  );
  const firestoreProtoFile = join(root, 'google/firestore/v1/firestore.proto');

  const packageDefinition = loadSync(firestoreProtoFile, {
    ...protoLoaderOptions,
    includeDirs: [root]
  });

  return loadPackageDefinition(packageDefinition);
}

/** Used by tests so we can directly create ProtobufJS proto message objects from JSON protos. */
export function loadRawProtos(): Root {
  const root = resolve(
    __dirname,
    process.env.FIRESTORE_PROTO_ROOT || '../../protos'
  );
  const firestoreProtoFile = join(root, 'google/firestore/v1/firestore.proto');

  const protoRoot = new Root();
  // Override the resolvePath function to look for protos in the 'root'
  // directory.
  protoRoot.resolvePath = (origin: string, target: string) => {
    if (isAbsolute(target)) {
      return target;
    }
    return join(root, target);
  };

  protoRoot.loadSync(firestoreProtoFile);
  protoRoot.resolveAll();
  return protoRoot;
}
