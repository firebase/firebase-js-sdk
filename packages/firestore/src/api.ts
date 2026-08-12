/**
 * @license
 * Copyright 2021 Google LLC
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

export {
  aggregateFieldEqual,
  aggregateQuerySnapshotEqual,
  average,
  count,
  getAggregateFromServer,
  getCountFromServer,
  sum
} from './api/aggregate';

export {
  AggregateField,
  AggregateQuerySnapshot
} from './lite-api/aggregate_types';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module '/src/lite-api/aggregate_types.ts' does not provide an export named 'AggregateFieldType'"
export type {
  AggregateFieldType,
  AggregateSpec,
  AggregateSpecData,
  AggregateType
} from './lite-api/aggregate_types';

export {
  memoryEagerGarbageCollector,
  memoryLocalCache,
  memoryLruGarbageCollector,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager
} from './api/cache_config';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/cache_config' does not provide an export named 'FirestoreLocalCache'"
export type {
  FirestoreLocalCache,
  MemoryCacheSettings,
  MemoryEagerGarbageCollector,
  MemoryGarbageCollector,
  MemoryLocalCache,
  MemoryLruGarbageCollector,
  PersistentCacheSettings,
  PersistentLocalCache,
  PersistentMultipleTabManager,
  PersistentSingleTabManager,
  PersistentSingleTabManagerSettings,
  PersistentTabManager
} from './api/cache_config';

export { documentId, FieldPath } from './api/field_path';

export {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  disableNetwork,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  enableNetwork,
  ensureFirestoreConfigured,
  Firestore,
  getFirestore,
  initializeFirestore,
  loadBundle,
  namedQuery,
  terminate,
  waitForPendingWrites
} from './api/database';

// Export as type to avoid Vitest error:
// "SyntaxError: The requested module '@firebase/util' does not provide an export named 'EmulatorMockTokenOptions'"
export type { EmulatorMockTokenOptions } from './lite-api/database';

export {
  LoadBundleTask
} from './api/bundle';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/bundle' does not provide an export named 'LoadBundleTaskProgress'"
export type {
  LoadBundleTaskProgress,
  TaskState
} from './api/bundle';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/settings' does not provide an export named 'FirestoreSettings'"
export type { FirestoreSettings, PersistenceSettings } from './api/settings';
export type { PrivateSettings } from './lite-api/settings';
export type { ExperimentalLongPollingOptions } from './api/long_polling_options';

export {
  DocumentSnapshot,
  documentSnapshotFromJSON,
  QueryDocumentSnapshot,
  QuerySnapshot,
  querySnapshotFromJSON,
  snapshotEqual,
  SnapshotMetadata
} from './api/snapshot';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/snapshot' does not provide an export named 'DocumentChange'"
export type {
  DocumentChange,
  DocumentChangeType,
  FirestoreDataConverter,
  SnapshotOptions
} from './api/snapshot';

export {
  collection,
  collectionGroup,
  CollectionReference,
  doc,
  DocumentReference,
  Query,
  queryEqual,
  refEqual
} from './api/reference';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/reference' does not provide an export named 'SetOptions'"
export type {
  DocumentData,
  PartialWithFieldValue,
  SetOptions,
  UpdateData,
  WithFieldValue
} from './api/reference';

export {
  and,
  endAt,
  endBefore,
  limit,
  limitToLast,
  or,
  orderBy,
  query,
  QueryCompositeFilterConstraint,
  QueryConstraint,
  QueryEndAtConstraint,
  QueryFieldFilterConstraint,
  QueryLimitConstraint,
  QueryOrderByConstraint,
  QueryStartAtConstraint,
  startAfter,
  startAt,
  where
} from './api/filter';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/filter' does not provide an export named 'QueryFilterConstraint'"
export type {
  OrderByDirection,
  QueryConstraintType,
  QueryFilterConstraint,
  QueryNonFilterConstraint,
  WhereFilterOp
} from './api/filter';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/reference_impl' does not provide an export named 'ListenSource'"
export type {
  ListenSource,
  SnapshotListenOptions,
  Unsubscribe
} from './api/reference_impl';

export type { TransactionOptions } from './api/transaction_options';

export { runTransaction, Transaction } from './api/transaction';

export {
  addDoc,
  deleteDoc,
  executeWrite,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  onSnapshot,
  onSnapshotsInSync,
  onSnapshotResume,
  setDoc,
  updateDoc
} from './api/reference_impl';

export { FieldValue } from './api/field_value';

export {
  arrayRemove,
  arrayUnion,
  deleteField,
  increment,
  serverTimestamp,
  vector,
  minimum,
  maximum
} from './api/field_value_impl';

export { VectorValue } from './lite-api/vector_value';

export { setLogLevel } from './util/log';
export type { LogLevelString as LogLevel } from './util/log';

export { Bytes } from './api/bytes';

export { WriteBatch, writeBatch } from './api/write_batch';

export { GeoPoint } from './api/geo_point';

export { Timestamp } from './api/timestamp';

export { CACHE_SIZE_UNLIMITED } from './api/database';

export { FirestoreError } from './util/error';
// Export as type to avoid Vitest error:
// "SyntaxError: The requested module './util/error' does not provide an export named 'FirestoreErrorCode'"
export type { FirestoreErrorCode } from './util/error';

export { AbstractUserDataWriter } from './lite-api/user_data_writer';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module '../src/lite-api/types' does not provide an export named 'Primitive'"
export type {
  AddPrefixToKeys,
  ChildUpdateFields,
  NestedUpdateFields,
  Primitive,
  UnionToIntersection
} from '../src/lite-api/types';

export { setIndexConfiguration } from './api/index_configuration';

// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './api/index_configuration' does not provide an export named 'Index'"
export type {
  Index,
  IndexConfiguration,
  IndexField
} from './api/index_configuration';

export {
  PersistentCacheIndexManager,
  getPersistentCacheIndexManager,
  deleteAllPersistentCacheIndexes,
  enablePersistentCacheIndexAutoCreation,
  disablePersistentCacheIndexAutoCreation
} from './api/persistent_cache_index_manager';

/**
 * Internal exports
 */
export { isBase64Available as _isBase64Available } from './platform/base64';
export { DatabaseId as _DatabaseId } from './core/database_info';
export {
  _internalQueryToProtoQueryTarget,
  _internalAggregationQueryToProtoRunAggregationQueryRequest
} from './remote/internal_serializer';
export {
  cast as _cast,
  validateIsNotUsedTogether as _validateIsNotUsedTogether
} from './util/input_validation';
export { DocumentKey as _DocumentKey } from './model/document_key';
export { debugAssert as _debugAssert } from './util/assert';
export { FieldPath as _FieldPath } from './model/path';
export type { ResourcePath as _ResourcePath } from './model/path';
export { ByteString as _ByteString } from './util/byte_string';
export { logWarn as _logWarn } from './util/log';
export { AutoId as _AutoId } from './util/misc';
export type {
  AuthTokenFactory,
  FirstPartyCredentialsSettings
} from './api/credentials';
export { EmptyAuthCredentialsProvider as _EmptyAuthCredentialsProvider } from './api/credentials';
export { EmptyAppCheckTokenProvider as _EmptyAppCheckTokenProvider } from './api/credentials';
export { TestingHooks as _TestingHooks } from './util/testing_hooks';
// Export as types to avoid Vitest error:
// "SyntaxError: The requested module './util/testing_hooks' does not provide an export named 'ExistenceFilterMismatchCallback'"
export type { ExistenceFilterMismatchCallback as _TestingHooksExistenceFilterMismatchCallback } from './util/testing_hooks';
export type { ExistenceFilterMismatchInfo as _TestingHooksExistenceFilterMismatchInfo } from './util/testing_hooks_spi';
