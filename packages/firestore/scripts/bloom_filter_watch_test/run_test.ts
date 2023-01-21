/**
 * @license
 * Copyright 2022 Google LLC
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

import { newConnection } from '../../src/platform/connection';
import {
  doc,
  DocumentReference,
  Firestore,
  collection,
  writeBatch,
  WriteBatch,
  DocumentData
} from '../../src';
import { AutoId } from '../../src/util/misc';
import { DatabaseId, DatabaseInfo } from '../../src/core/database_info';
import {
  DocumentChange,
  DocumentDelete,
  DocumentRemove,
  ExistenceFilter,
  ListenRequest,
  ListenResponse,
  TargetChange
} from '../../src/protos/firestore_proto_api';
import { Connection, Stream } from "../../src/remote/connection";
import { Deferred } from "../../test/util/promise";

const DOCUMENT_DATA_KEY = "BloomFilterWatchTest_GroupId";

export type LogFunction = (...args: Array<any>) => any;

export interface RunTestOptions {
  db: Firestore,
  projectId: string,
  host: {
    hostName: string,
    ssl: boolean
  },
  documentCreateCount: number | null,
  documentDeleteCount: number | null,
  collectionId: string | null,
  log: LogFunction;
}

class InvalidRunTestOptionsError extends Error {
  readonly name = "InvalidRunTestOptionsError";
}

export async function runTest(options: RunTestOptions): Promise<void> {
  const db = options.db;
  const projectId = options.projectId;
  const host = options.host.hostName;
  const ssl = options.host.ssl;
  const log = options.log;
  const uniqueId = AutoId.newId();
  const collectionId = options.collectionId ?? `bloom_filter_watch_test_${uniqueId}`;
  const documentCreateCount = options.documentCreateCount ?? 10;
  const documentDeleteCount = options.documentDeleteCount ?? 5;

  if (documentDeleteCount > documentCreateCount) {
    throw new InvalidRunTestOptionsError(
      `documentDeleteCount (${documentDeleteCount}) must be ` +
      `less than or equal to documentCreateCount (${documentCreateCount})`);
  }

  log("host:", host);
  log("projectId:", projectId);

  const createdDocumentRefs = await createDocuments(db, documentCreateCount, collectionId, uniqueId, log);
  const createdDocumentIds = createdDocumentRefs.map(documentRef => documentRef.id).sort();
  const documentRefsToDelete = createdDocumentRefs.slice(createdDocumentRefs.length - documentDeleteCount);
  const documentIdsToDelete = documentRefsToDelete.map(documentRef => documentRef.id);

  const watchStream = createWatchStream(projectId, host, ssl);
  await watchStream.open();
  try {
    log("Adding target to watch stream");
    await watchStream.addTarget({
      targetId: 1,
      projectId: projectId,
      collectionId,
      keyFilter: DOCUMENT_DATA_KEY,
      valueFilter: uniqueId
    });
    log("Added target to watch stream");

    log("Waiting for a snapshot from watch");
    const snapshot1 = await watchStream.getInitialSnapshot(1);
    const documentNames1 = Array.from(snapshot1.documentPaths).sort();
    const documentIds1 = documentNames1.map(documentIdFromDocumentPath);
    log(`Got ${documentIds1.length} documents: ${descriptionFromSortedStrings(documentIds1)}`);
    assertDeepEqual(documentIds1, createdDocumentIds);

    log("Removing target from watch stream");
    await watchStream.removeTarget(1);
    log("Removed target from watch stream");

    log(`Deleting ${documentDeleteCount} documents: ${descriptionFromSortedStrings(documentIdsToDelete)}`);
    await deleteDocuments(db, documentRefsToDelete);
    log(`Deleted ${documentDeleteCount} documents`);

    const resumeDeferSeconds = 10;
    log(`Waiting for ${resumeDeferSeconds} seconds so we get an existence filter upon resuming the query.`);
    await new Promise(resolve => setTimeout(resolve, resumeDeferSeconds * 1000));

    log("Resuming target in watch stream");
    await watchStream.addTarget({
      targetId: 2,
      projectId: projectId,
      collectionId,
      keyFilter: DOCUMENT_DATA_KEY,
      valueFilter: uniqueId,
      resumeFrom: snapshot1
    });
    log("Resumed target in watch stream");

    log("Waiting for a snapshot from watch stream");
    const snapshot2 = await watchStream.getInitialSnapshot(2);
    const documentNames2 = Array.from(snapshot2.documentPaths).sort();
    const documentIds2 = documentNames2.map(documentIdFromDocumentPath);
    log(`Got ${documentIds2.length} documents: ${descriptionFromSortedStrings(documentIds2)}`);
  } finally {
    log("Closing watch stream");
    await watchStream.close();
    log("Watch stream closed");
  }
}

function createWatchStream(projectId: string, host: string, ssl: boolean): WatchStream {
  const databaseInfo = createDatabaseInfo(projectId, host, ssl);
  const connection = newConnection(databaseInfo);
  return new WatchStream(connection, projectId);
}

function createDatabaseInfo(projectId: string, host: string, ssl: boolean): DatabaseInfo {
  return new DatabaseInfo(
    new DatabaseId(projectId),
    /*appId=*/"",
    /*persistenceKey=*/"[DEFAULT]",
    host,
    ssl,
    /*forceLongPolling=*/false,
    /*autoDetectLongPolling=*/false,
    /*useFetchStreams=*/true
  );
}

class WatchError extends Error {
  name = "WatchError";
}

class TargetStateError extends Error {
  name = "TargetStateError";
}

class TargetSnapshot {
  constructor(readonly documentPaths: Set<string>, readonly resumeToken: string | Uint8Array) {
  }
}

class TargetState {
  private _added = false;
  private _removed = false;
  private _current = false;

  private readonly _accumulatedDocumentNames = new Set<string>();

  private readonly _addedDeferred = new Deferred<void>();
  private readonly _removedDeferred = new Deferred<void>();
  private readonly _initialSnapshotDeferred = new Deferred<TargetSnapshot>();

  constructor(readonly targetId: number, initialDocumentPaths?: Set<string>) {
    if (initialDocumentPaths) {
      for (const documentPath of initialDocumentPaths.values()) {
        this._accumulatedDocumentNames.add(documentPath);
      }
    }
  }

  get addedPromise(): Promise<void> {
    return this._addedDeferred.promise;
  }

  get removedPromise(): Promise<void> {
    return this._removedDeferred.promise;
  }

  get initialSnapshotPromise(): Promise<TargetSnapshot> {
    return this._initialSnapshotDeferred.promise;
  }

  onAdded(): void {
    if (this._added) {
      throw new TargetStateError(`onAdded() already invoked.`);
    }
    this._added = true;
    this._addedDeferred.resolve(null as unknown as void);
  }

  onRemoved(): void {
    if (this._removed) {
      throw new TargetStateError(`onRemoved() already invoked.`);
    }
    if (!this._added) {
      throw new TargetStateError(`onRemoved() invoked before onAdded().`);
    }
    this._removed = true;
    this._removedDeferred.resolve(null as unknown as void);
  }

  onCurrent(): void {
    if (!this._added) {
      throw new TargetStateError(`onCurrent() invoked before onAdded().`);
    }
    if (this._removed) {
      throw new TargetStateError(`onCurrent() invoked after onRemoved().`);
    }
    this._current = true;
  }

  onReset(): void {
    if (!this._added) {
      throw new TargetStateError(`onReset() invoked before onAdded().`);
    }
    if (this._removed) {
      throw new TargetStateError(`onReset() invoked after onRemoved().`);
    }
    this._current = false;
    this._accumulatedDocumentNames.clear();
  }

  onNoChange(resumeToken: string | Uint8Array | null): void {
    if (!this._added) {
      throw new TargetStateError(`onNoChange() invoked before onAdded().`);
    }
    if (this._removed) {
      throw new TargetStateError(`onNoChange() invoked after onRemoved().`);
    }
    if (this._current && resumeToken !== null) {
      const documentPaths = new Set(this._accumulatedDocumentNames);
      this._initialSnapshotDeferred.resolve({documentPaths, resumeToken});
    }
  }

  onDocumentChanged(documentName: string): void {
    if (!this._added) {
      throw new TargetStateError(`onDocumentChanged() invoked when not added.`);
    }
    if (this._removed) {
      throw new TargetStateError(`onDocumentChanged() invoked after onRemoved().`);
    }
    this._current = false;
    this._accumulatedDocumentNames.add(documentName);
  }

  onDocumentRemoved(documentName: string): void {
    if (!this._added) {
      throw new TargetStateError(`onDocumentRemoved() invoked when not added.`);
    }
    if (this._removed) {
      throw new TargetStateError(`onDocumentRemoved() invoked after onRemoved().`);
    }
    this._current = false;
    this._accumulatedDocumentNames.delete(documentName);
  }

  onExistenceFilter(existenceFilter: ExistenceFilter): void {
    if (!this._added) {
      throw new TargetStateError(`onExistenceFilter() invoked when not added.`);
    }
    if (this._removed) {
      throw new TargetStateError(`onExistenceFilter() invoked after onRemoved().`);
    }
    // TODO: implement this
  }
}

class WatchStream {

  private _stream: Stream<unknown, unknown> | null = null;
  private _closed = false;
  private _closedDeferred = new Deferred<void>();

  private _targets = new Map<number, TargetState>();

  constructor(
    private readonly _connection: Connection,
    private readonly _projectId: string) {
  }

  open(): Promise<void> {
    if (this._stream) {
      throw new WatchError("open() may only be called once");
    } else if (this._closed) {
      throw new WatchError("open() may not be called after close()");
    }

    const deferred = new Deferred<void>();

    const stream = this._connection.openStream("Listen", null, null);
    try {
      stream.onOpen(() => {
        deferred.resolve(null as unknown as void);
      });

      stream.onClose(err => {
        if (err) {
          deferred.reject(err as Error);
          this._closedDeferred.reject(err as Error);
        } else {
          deferred.resolve(null as unknown as void);
          this._closedDeferred.resolve(null as unknown as void);
        }
      });

      stream.onMessage(msg => {
        this._onMessageReceived(msg as ListenResponse);
      });
    } catch (err) {
      stream.close();
      throw err;
    }

    this._stream = stream;

    return deferred.promise;
  }

  close(): Promise<void> {
    this._closed = true;

    if (! this._stream) {
      return Promise.resolve();
    }

    this._stream.close();

    return this._closedDeferred.promise;
  }

  addTarget(targetInfo: { targetId: number, projectId: string, collectionId: string, keyFilter: string, valueFilter: string, resumeFrom?: TargetSnapshot }): Promise<void> {
    if (!this._stream) {
      throw new WatchError("open() must be called before addTarget()");
    } else if (this._closed) {
      throw new WatchError("addTarget() may not be called after close()");
    } else if (this._targets.has(targetInfo.targetId)) {
      throw new WatchError(`targetId ${targetInfo.targetId} is already used`);
    }

    const listenRequest: ListenRequest = {
      addTarget: {
        targetId: targetInfo.targetId,
        query: {
          parent: `projects/${targetInfo.projectId}/databases/(default)/documents`,
          structuredQuery: {
            from: [{collectionId: targetInfo.collectionId}],
            where: {
              fieldFilter: {
                field: {
                  fieldPath: targetInfo.keyFilter
                },
                op: "EQUAL",
                value: {
                  stringValue: targetInfo.valueFilter
                }
              }
            },
            orderBy: [
              { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }
            ]
          },
        },
      }
    };

    const resumeFrom = targetInfo?.resumeFrom;
    if (resumeFrom !== undefined) {
      listenRequest.addTarget!.resumeToken = resumeFrom.resumeToken;
      listenRequest.addTarget!.expectedCount = resumeFrom.documentPaths.size;
    }

    const targetState = new TargetState(targetInfo.targetId, resumeFrom?.documentPaths);
    this._targets.set(targetInfo.targetId, targetState);
    this.sendListenRequest(listenRequest);

    return targetState.addedPromise;
  }

  removeTarget(targetId: number): Promise<void> {
    if (!this._stream) {
      throw new WatchError("open() must be called before removeTarget()");
    } else if (this._closed) {
      throw new WatchError("removeTarget() may not be called after close()");
    }

    const targetState = this._targets.get(targetId);
    if (targetState === undefined) {
      throw new WatchError(`targetId ${targetId} has not been added by addTarget()`);
    }

    this.sendListenRequest({
      removeTarget: targetId
    });

    return targetState.removedPromise;
  }

  private sendListenRequest(listenRequest: ListenRequest): void {
    this._stream!.send({
        database: `projects/${this._projectId}/databases/(default)`,
        ...listenRequest
      }
    );
  }

  getInitialSnapshot(targetId: number): Promise<TargetSnapshot> {
    const targetState = this._targets.get(targetId);
    if (targetState === undefined) {
      throw new WatchError(`unknown targetId: ${targetId}`);
    }
    return targetState.initialSnapshotPromise;
  }

  private _onMessageReceived(msg: ListenResponse): void {
    if (msg.targetChange) {
      this._onTargetChange(msg.targetChange);
    } else if (msg.documentChange) {
      this._onDocumentChange(msg.documentChange);
    } else if (msg.documentRemove) {
      this._onDocumentRemove(msg.documentRemove);
    } else if (msg.documentDelete) {
      this._onDocumentDelete(msg.documentDelete);
    } else if (msg.filter) {
      this._onExistenceFilter(msg.filter);
    }
  }

  private _targetStatesForTargetIds(targetIds: Array<number>, allTargetsIfEmpty: boolean): Array<TargetState> {
    const targetStates = Array.from(targetIds, targetId => {
      const targetState = this._targets.get(targetId);
      if (targetState === undefined) {
        throw new WatchError(`TargetChange specifies an unknown targetId: ${targetId}`);
      }
      return targetState;
    });

    if (targetStates.length > 0 || !allTargetsIfEmpty) {
      return targetStates;
    }

    // If an empty list of target IDs was specified, then this means that the
    // event applies to _all_ targets.
    return Array.from(this._targets.values());
  }

  private _onTargetChange(targetChange: TargetChange): void {
    const targetStates = this._targetStatesForTargetIds(targetChange.targetIds ?? [], true);
    for (const targetState of targetStates) {
      switch (targetChange.targetChangeType ?? "NO_CHANGE") {
        case "ADD":
          targetState.onAdded();
          break;
        case "REMOVE":
          targetState.onRemoved();
          this._targets.delete(targetState.targetId);
          break;
        case "CURRENT":
          targetState.onCurrent();
          break;
        case "RESET":
          targetState.onReset();
          break;
        case "NO_CHANGE":
          targetState.onNoChange(targetChange.resumeToken ?? null);
          break;
        default:
          throw new WatchError(`unknown targetChangeType: ${targetChange.targetChangeType}`);
      }
    }
  }

  private _onDocumentChange(documentChange: DocumentChange): void {
    for (const targetState of this._targetStatesForTargetIds(documentChange.targetIds ?? [], true)) {
      targetState.onDocumentChanged(documentChange.document!.name!);
    }
    for (const targetState of this._targetStatesForTargetIds(documentChange.removedTargetIds ?? [], false)) {
      targetState.onDocumentRemoved(documentChange.document!.name!);
    }
  }

  private _onDocumentRemove(documentRemove: DocumentRemove): void {
    for (const targetState of this._targetStatesForTargetIds(documentRemove.removedTargetIds ?? [], false)) {
      targetState.onDocumentRemoved(documentRemove.document!);
    }
  }

  private _onDocumentDelete(documentDelete: DocumentDelete): void {
    for (const targetState of this._targetStatesForTargetIds(documentDelete.removedTargetIds ?? [], false)) {
      targetState.onDocumentRemoved(documentDelete.document!);
    }
  }

  private _onExistenceFilter(existenceFilter: ExistenceFilter): void {
    const targetId = existenceFilter.targetId;
    const targetState = this._targets.get(targetId!);
    if (targetState === undefined) {
      throw new WatchError(`ExistenceFilter specified an unknown targetId: ${targetId}`);
    }
    targetState.onExistenceFilter(existenceFilter);
  }

}

function* generateIds(count: number): IterableIterator<string> {
  for (let i=1; i<=count; i++) {
    yield AutoId.newId();
  }
}

async function createDocuments(db: Firestore, documentCreateCount:number, collectionId: string, uniqueValue: string, log: LogFunction): Promise<Array<DocumentReference>> {
  const collectionRef = collection(db, collectionId);
  const documentRefs = Array.from(generateIds(documentCreateCount)).map(documentId => doc(collectionRef, documentId));
  const descriptionRefsDescription = descriptionFromSortedStrings(documentRefs.map(documentRef => documentRef.id).sort());

  log(`Creating ${documentRefs.length} documents in collection ${collectionRef.id}: ${descriptionRefsDescription}`);
  const writeBatches = createWriteBatchesForCreate(db, documentRefs, { [DOCUMENT_DATA_KEY]: uniqueValue });
  await Promise.all(writeBatches.map(batch => batch.commit()));
  log(`${documentRefs.length} documents created successfully.`);

  return documentRefs;
}

async function deleteDocuments(db: Firestore, documentRefs: Array<DocumentReference>): Promise<void> {
  const writeBatches = createWriteBatchesForDelete(db, documentRefs);
  await Promise.all(writeBatches.map(batch => batch.commit()));
}

function createWriteBatchesForCreate(db: Firestore, documentRefs: Array<DocumentReference>, documentData: DocumentData): Array<WriteBatch> {
  const writeBatches: Array<WriteBatch> = [];
  let writeBatch_ = writeBatch(db);
  let currentWriteBatchDocumentCount = 0;

  for (const documentRef of documentRefs) {
    if (currentWriteBatchDocumentCount === 500) {
      writeBatches.push(writeBatch_);
      writeBatch_ = writeBatch(db);
      currentWriteBatchDocumentCount = 0;
    }
    writeBatch_.set(documentRef, documentData);
    currentWriteBatchDocumentCount++;
  }

  if (currentWriteBatchDocumentCount > 0) {
    writeBatches.push(writeBatch_);
  }

  return writeBatches;
}

function createWriteBatchesForDelete(db: Firestore, documentRefs: Array<DocumentReference>): Array<WriteBatch> {
  const writeBatches: Array<WriteBatch> = [];
  let writeBatch_ = writeBatch(db);
  let currentWriteBatchDocumentCount = 0;

  for (const documentRef of documentRefs) {
    if (currentWriteBatchDocumentCount === 500) {
      writeBatches.push(writeBatch_);
      writeBatch_ = writeBatch(db);
      currentWriteBatchDocumentCount = 0;
    }
    writeBatch_.delete(documentRef);
    currentWriteBatchDocumentCount++;
  }

  if (currentWriteBatchDocumentCount > 0) {
    writeBatches.push(writeBatch_);
  }

  return writeBatches;
}

function documentIdFromDocumentPath(documentPath: string): string {
  const lastSlashIndex = documentPath.lastIndexOf('/');
  return (lastSlashIndex < 0) ? documentPath : documentPath.slice(lastSlashIndex+1);
}

function descriptionFromSortedStrings(sortedStrings: Array<string>): string {
  if (sortedStrings.length === 0) {
    return "";
  }
  if (sortedStrings.length === 1) {
    return sortedStrings[0];
  }
  if (sortedStrings.length === 2) {
    return `${sortedStrings[0]} and ${sortedStrings[1]}`;
  }
  return `${sortedStrings[0]} ... ${sortedStrings[sortedStrings.length-1]}`;
}

class AssertDeepEqualError extends Error {
  name = "AssertDeepEqualError";
}

function assertDeepEqual<T>(actual: Array<T>, expected: Array<T>): void {
  if (actual.length !== expected.length) {
    throw new AssertDeepEqualError(`expected length ${expected.length}, but got ${actual.length}`);
  }
  for (let i=0; i<actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new AssertDeepEqualError(`incorrect element at index ${i}: ${actual[i]} (expected ${expected[i]}`);
    }
  }
}
