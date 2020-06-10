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

import { Query } from './query';
import { SnapshotVersion } from './snapshot_version';
import { DbBundle, DbNamedQuery } from '../local/indexeddb_schema';
import * as bundleProto from '../protos/firestore_bundle_proto';
import { LocalSerializer } from '../local/local_serializer';

/**
 * Represents a Firestore bundle saved by the SDK in its local storage.
 */
export interface Bundle {
  readonly id: string;
  readonly version: number;
  // When the saved bundle is built from the server SDKs.
  readonly createTime: SnapshotVersion;
}

/**
 * Represents a Query saved by the SDK in its local storage.
 */
export interface NamedQuery {
  readonly name: string;
  readonly query: Query;
  // When the results for this query are read to the saved bundle.
  readonly readTime: SnapshotVersion;
}

/** Encodes a DbBundle to a Bundle. */
export function fromDbBundle(
  serializer: LocalSerializer,
  dbBundle: DbBundle
): Bundle {
  return {
    id: dbBundle.bundleId,
    createTime: serializer.fromDbTimestamp(dbBundle.createTime),
    version: dbBundle.version
  };
}

/** Encodes a BundleMetadata to a DbBundle. */
export function toDbBundle(
  serializer: LocalSerializer,
  metadata: bundleProto.BundleMetadata
): DbBundle {
  return {
    bundleId: metadata.id!,
    createTime: serializer.toDbTimestamp(
      serializer.remoteSerializer.fromVersion(metadata.createTime!)
    ),
    version: metadata.version!
  };
}

/** Encodes a DbNamedQuery to a NamedQuery. */
export function fromDbNamedQuery(
  serializer: LocalSerializer,
  dbNamedQuery: DbNamedQuery
): NamedQuery {
  return {
    name: dbNamedQuery.name,
    query: fromBundledQuery(serializer, dbNamedQuery.bundledQuery),
    readTime: serializer.fromDbTimestamp(dbNamedQuery.readTime)
  };
}

/** Encodes a NamedQuery from bundle proto to a DbNamedQuery. */
export function toDbNamedQuery(
  serializer: LocalSerializer,
  query: bundleProto.NamedQuery
): DbNamedQuery {
  return {
    name: query.name!,
    readTime: serializer.toDbTimestamp(
      serializer.remoteSerializer.fromVersion(query.readTime!)
    ),
    bundledQuery: query.bundledQuery!
  };
}

/**
 * Encodes a `BundledQuery` from bundle proto to a Query object.
 *
 * This reconstructs the original query used to build the bundle being loaded,
 * including features exists only in SDKs (for example: limit-to-last).
 */
export function fromBundledQuery(
  serializer: LocalSerializer,
  bundledQuery: bundleProto.BundledQuery
): Query {
  const query = serializer.remoteSerializer.convertQueryTargetToQuery({
    parent: bundledQuery.parent!,
    structuredQuery: bundledQuery.structuredQuery!
  });
  if (bundledQuery.limitType === 'LAST') {
    return query.withLimitToLast(query.limit);
  }
  return query;
}

/** Encodes a NamedQuery proto object to a NamedQuery model object. */
export function fromProtoNamedQuery(
  serializer: LocalSerializer,
  namedQuery: bundleProto.NamedQuery
): NamedQuery {
  return {
    name: namedQuery.name!,
    query: fromBundledQuery(serializer, namedQuery.bundledQuery!),
    readTime: serializer.remoteSerializer.fromVersion(namedQuery.readTime!)
  };
}

/** Encodes a BundleMetadata proto object to a Bundle model object. */
export function fromBundleMetadata(
  serializer: LocalSerializer,
  metadata: bundleProto.BundleMetadata
): Bundle {
  return {
    id: metadata.id!,
    version: metadata.version!,
    createTime: serializer.remoteSerializer.fromVersion(metadata.createTime!)
  };
}
