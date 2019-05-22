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

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import * as ProtobufJS from 'protobufjs';

/** Used by tests so we can match @grpc/proto-loader behavior. */
export const protoLoaderOptions: ProtobufJS.IConversionOptions = {
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
export function loadProtos(): grpc.GrpcObject {
  const root = path.resolve(
    __dirname,
    process.env.FIRESTORE_PROTO_ROOT || '../protos'
  );
  const firestoreProtoFile = path.join(
    root,
    'google/firestore/v1/firestore.proto'
  );

  const packageDefinition = protoLoader.loadSync(firestoreProtoFile, {
    ...protoLoaderOptions,
    includeDirs: [root]
  });

  return grpc.loadPackageDefinition(packageDefinition);
}

/** Used by tests so we can directly create ProtobufJS proto message objects from JSON protos. */
export function loadRawProtos(): ProtobufJS.Root {
  const root = path.resolve(
    __dirname,
    process.env.FIRESTORE_PROTO_ROOT || '../protos'
  );
  const firestoreProtoFile = path.join(
    root,
    'google/firestore/v1/firestore.proto'
  );

  const protoRoot = new ProtobufJS.Root();
  // Override the resolvePath function to look for protos in the 'root'
  // directory.
  protoRoot.resolvePath = (origin: string, target: string) => {
    if (path.isAbsolute(target)) {
      return target;
    }
    return path.join(root, target);
  };

  protoRoot.loadSync(firestoreProtoFile);
  protoRoot.resolveAll();
  return protoRoot;
}
