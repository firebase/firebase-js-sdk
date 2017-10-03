/**
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

/**
 * BatchID is a locally assigned ID for a batch of mutations that have been
 * applied.
 */
export type BatchId = number;

/**
 * A locally-assigned ID used to refer to a target being watched via the
 * Watch service.
 */
export type TargetId = number;

// TODO(b/35918695): In GRPC / node, tokens are Uint8Array. In WebChannel,
// they're strings. We should probably (de-)serialize to a common internal type.
export type ProtoByteString = Uint8Array | string;

/** Describes the online state of the Firestore client */
export enum OnlineState {
  /**
   * The Firestore client is in an unknown online state. This means the client
   * is either not actively trying to establish a connection or it was
   * previously in an unknown state and is trying to establish a connection.
   */
  Unknown,

  /**
   * The client is connected and the connections are healthy. This state is
   * reached after a successful connection and there has been at least one
   * succesful message received from the backends.
   */
  Healthy,

  /**
   * The client has tried to establish a connection but has failed.
   * This state is reached after either a connection attempt failed or a
   * healthy stream was closed for unexpected reasons.
   */
  Failed
}
