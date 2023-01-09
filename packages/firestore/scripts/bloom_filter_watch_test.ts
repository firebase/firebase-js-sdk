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

// To execute this script run the following command in the parent directory:
// yarn build:scripts && node scripts/bloom_filter_watch_test.js

import * as yargs from 'yargs';
import { assert } from 'chai';

import { newConnection } from '../src/platform/connection';
import {
  doc,
  DocumentReference,
  Firestore,
  setLogLevel,
  collection,
  writeBatch,
  WriteBatch,
  DocumentData
} from '../src';
import { AutoId } from '../src/util/misc';
import { DatabaseId, DatabaseInfo } from '../src/core/database_info';
import {
  DocumentChange,
  DocumentDelete,
  DocumentRemove,
  ExistenceFilter,
  ListenRequest,
  ListenResponse,
  TargetChange
} from '../src/protos/firestore_proto_api';
import { Connection, Stream } from "../src/remote/connection";
import { Deferred } from "../test/util/promise";
import { newTestFirestore } from "../test/util/api_helpers";

// Import the following modules despite not using them. This forces them to get
// transpiled by tsc. Without these imports they do not get transpiled because
// they are imported dynamically, causing in MODULE_NOT_FOUND errors at runtime.
import * as node_dom from '../src/platform/node/dom';
import * as node_base64 from '../src/platform/node/base64';
import * as node_connection from '../src/platform/node/connection';
import * as node_format_json from '../src/platform/node/format_json';
import * as node_random_bytes from '../src/platform/node/random_bytes';

async function main(): Promise<void> {
  const parsedArgs = parseArgs();

  if (parsedArgs.debugLoggingEnabled) {
    setLogLevel("debug");
  }

  const uniqueId = AutoId.newId();
  const collectionId = parsedArgs.collectionId ?? `bloom_filter_watch_test_${uniqueId}`;
  const databaseInfo = createDatabaseInfo(parsedArgs.projectId, parsedArgs.host, parsedArgs.ssl);

  await run(databaseInfo, collectionId, parsedArgs.documentCreateCount, parsedArgs.documentDeleteCount, uniqueId);
}

async function run(databaseInfo: DatabaseInfo, collectionId: string, documentCreateCount: number, documentDeleteCount: number, documentIdPrefix: string): Promise<void> {
  log("host:", databaseInfo.host);
  log("projectId:", databaseInfo.databaseId.projectId);
  log("collectionId:", collectionId);
  log("documentCreateCount:", documentCreateCount);
  log("documentDeleteCount:", documentDeleteCount);
  log("documentIdPrefix:", documentIdPrefix);

  const db = newTestFirestore(databaseInfo.databaseId.projectId);
  db._setSettings({
    host: databaseInfo.host,
    ssl: databaseInfo.ssl
  });

  const createdDocumentRefs = await createDocuments(db, documentCreateCount, collectionId, documentIdPrefix);
  const createdDocumentIds = createdDocumentRefs.map(documentRef => documentRef.id).sort();
  const documentRefsToDelete = createdDocumentRefs.slice(createdDocumentRefs.length - documentDeleteCount);
  const documentIdsToDelete = documentRefsToDelete.map(documentRef => documentRef.id);

  const connection = newConnection(databaseInfo);
  const watchStream = new WatchStream(connection, databaseInfo.databaseId.projectId);
  await watchStream.open();
  try {
    log("Adding target to watch stream");
    watchStream.addTarget(1, collectionId, "TestKey", documentIdPrefix);
    log("Waiting for a snapshot from watch");
    const snapshot = await watchStream.getSnapshot(1);
    const documentNames = Array.from(snapshot).sort();
    const documentIds = documentNames.map(documentIdFromDocumentPath);
    log(`Got ${documentNames.length} documents: ${descriptionFromSortedStrings(documentIds)}`);
    assert.deepEqual(createdDocumentIds, documentIds);

    log("Removing target from watch stream");
    await watchStream.removeTarget(1);
    log("Removed target from watch stream");

    log(`Deleting ${documentDeleteCount} documents: ${descriptionFromSortedStrings(documentIdsToDelete)}`);
    await deleteDocuments(db, documentRefsToDelete);
    log(`Deleted ${documentDeleteCount} documents`);
  } finally {
    log("Closing watch stream");
    await watchStream.close();
    log("Watch stream closed");
  }
}

interface ParsedArgs {
  projectId: string;
  host: string;
  ssl: boolean;
  collectionId: string | null;
  documentCreateCount: number;
  documentDeleteCount: number;
  iterationCount: number;
  debugLoggingEnabled: boolean;
}

function parseArgs(): ParsedArgs {
  const parsedArgs = yargs
    .strict()
    .config()
    .options({
      projectId: {
        demandOption: true,
        type: "string",
        describe: "The Firebase project ID to use."
      },
      host: {
        type: "string",
        default: "firestore.googleapis.com",
        describe: "The Firestore server to which to connect."
      },
      ssl: {
        type: "boolean",
        default: true,
        describe: "Whether to use SSL when connecting to the Firestore server."
      },
      collection: {
        type: "string",
        describe: "The ID of the Firestore collection to use; " +
          "an auto-generated ID will be used if not specified."
      },
      creates: {
        type: "number",
        default: 10,
        describe: "The number of Firestore documents to create."
      },
      deletes: {
        type: "number",
        default: 5,
        describe: "The number of documents to delete."
      },
      iterations: {
        type: "number",
        default: 20,
        describe: "The number of iterations to run."
      },
      debug: {
        type: "boolean",
        default: false,
        describe: "Enable Firestore debug logging."
      }
    })
    .help()
    .parseSync();

  return {
    projectId: parsedArgs.projectId,
    host: parsedArgs.host,
    ssl: parsedArgs.ssl,
    collectionId: parsedArgs.collection ?? null,
    documentCreateCount: parsedArgs.creates,
    documentDeleteCount: parsedArgs.deletes,
    iterationCount: parsedArgs.iterations,
    debugLoggingEnabled: parsedArgs.debug
  };
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

function log(...args: Array<any>): void {
  console.log(...args);
}

class WatchError extends Error {
  name = "WatchError";
}

class TargetStateError extends Error {
  name = "TargetStateError";
}

class TargetState {
  private _added = false;
  private _current = false;
  private _resumeToken: string | Uint8Array | null = null;
  private _documentNames = new Set<string>();
  private _snapshot: Set<string> | null = null;
  private _onSnapshotDeferred: Deferred<Set<string>> | null = null;
  private _onRemoveDeferred: Deferred<void> | null = null;

  onAdded(): void {
    if (this._added) {
      throw new TargetStateError(`onAdded() invoked when already added.`);
    }
    this._added = true;
    this._current = false;
  }

  onRemoved(): void {
    if (!this._added) {
      throw new TargetStateError(`onRemoved() invoked when not added.`);
    }
    this._added = false;
    this._current = false;
    this._onRemoveDeferred?.resolve(null as unknown as void);
    this._onRemoveDeferred = null;
  }

  onCurrent(): void {
    if (!this._added) {
      throw new TargetStateError(`onCurrent() invoked when not added.`);
    }
    this._current = true;
  }

  onReset(): void {
    if (!this._added) {
      throw new TargetStateError(`onReset() invoked when not added.`);
    }
    this._current = false;
    this._documentNames.clear();
  }

  onNoChange(resumeToken: string | Uint8Array | null): void {
    if (!this._added) {
      throw new TargetStateError(`onNoChange() invoked when not added.`);
    }
    if (this._current && resumeToken !== null) {
      this._resumeToken = resumeToken;
      this._snapshot = new Set(this._documentNames);
      this._onSnapshotDeferred?.resolve(new Set(this._snapshot));
      this._onSnapshotDeferred = null;
    }
  }

  onDocumentChanged(documentName: string): void {
    if (!this._added) {
      throw new TargetStateError(`onDocumentAdded() invoked when not added.`);
    }
    this._current = false;
    this._documentNames.add(documentName);
  }

  onDocumentRemoved(documentName: string): void {
    if (!this._added) {
      throw new TargetStateError(`onDocumentRemoved() invoked when not added.`);
    }
    this._current = false;
    this._documentNames.delete(documentName);
  }

  getSnapshot(): Promise<Set<string>> {
    if (this._snapshot !== null) {
      return Promise.resolve(this._snapshot);
    }
    if (this._onSnapshotDeferred === null) {
      this._onSnapshotDeferred = new Deferred();
    }
    return this._onSnapshotDeferred.promise;
  }

  getOnRemovePromise(): Promise<void> {
    if (this._onRemoveDeferred === null) {
      this._onRemoveDeferred = new Deferred();
    }
    return this._onRemoveDeferred.promise;
  }
}

class WatchStream {

  private _stream: Stream<unknown, unknown> | null = null;
  private _closed = false;
  private _closedDeferred = new Deferred();

  private _targets = new Map<number, TargetState>();

  constructor(
    private readonly _connection: Connection,
    private readonly _projectId: string) {
  }

  async open(): Promise<void> {
    if (this._stream) {
      throw new WatchError("open() may only be called once");
    } else if (this._closed) {
      throw new WatchError("open() may not be called after close()");
    }

    const deferred = new Deferred();

    const stream = this._connection.openStream("Listen", null, null);
    try {
      stream.onOpen(() => {
        deferred.resolve(null);
      });

      stream.onClose(err => {
        if (err) {
          deferred.reject(err as Error);
          this._closedDeferred.reject(err as Error);
        } else {
          deferred.resolve(null);
          this._closedDeferred.resolve(null);
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

    await deferred.promise;
  }

  async close(): Promise<void> {
    if (this._closed) {
      return;
    }
    this._closed = true;

    if (! this._stream) {
      return;
    }

    this._stream.close();
    await this._closedDeferred.promise;
  }

  addTarget(targetId: number, collectionId: string, keyFilter: string, valueFilter: string): void {
    if (!this._stream) {
      throw new WatchError("open() must be called before addTarget()");
    } else if (this._closed) {
      throw new WatchError("addTarget() may not be called after close()");
    } else if (this._targets.has(targetId)) {
      throw new WatchError(`targetId ${targetId} is already used`);
    }

    this.sendListenRequest({
      addTarget: {
        targetId: targetId,
        query: {
          parent: `projects/${this._projectId}/databases/(default)/documents`,
          structuredQuery: {
            from: [{collectionId: collectionId}],
            where: {
              fieldFilter: {
                field: {
                  fieldPath: keyFilter
                },
                op: "EQUAL",
                value: {
                  stringValue: valueFilter
                }
              }
            },
            orderBy: [
              { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }
            ]
          },
        },
      }
    });

    this._targets.set(targetId, new TargetState());
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

    return targetState.getOnRemovePromise();
  }

  private sendListenRequest(listenRequest: ListenRequest): void {
    this._stream!.send({
        database: `projects/${this._projectId}/databases/(default)`,
        ...listenRequest
      }
    );
  }

  async getSnapshot(targetId: number): Promise<Set<string>> {
    const targetState = this._targets.get(targetId);
    if (targetState === undefined) {
      throw new WatchError(`unknown targetId: ${targetId}`);
    }
    return await targetState.getSnapshot();
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
    const targetStates = this._targetStatesForTargetIds(targetChange.targetIds!, true);
    for (const targetState of targetStates) {
      switch (targetChange.targetChangeType) {
        case "ADD":
          targetState.onAdded();
          break;
        case "REMOVE":
          targetState.onRemoved();
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
    for (const targetState of this._targetStatesForTargetIds(documentChange.targetIds!, true)) {
      targetState.onDocumentChanged(documentChange.document!.name!);
    }
    for (const targetState of this._targetStatesForTargetIds(documentChange.removedTargetIds!, false)) {
      targetState.onDocumentRemoved(documentChange.document!.name!);
    }
  }

  private _onDocumentRemove(documentRemove: DocumentRemove): void {
    for (const targetState of this._targetStatesForTargetIds(documentRemove.removedTargetIds!, false)) {
      targetState.onDocumentRemoved(documentRemove.document!);
    }
  }

  private _onDocumentDelete(documentDelete: DocumentDelete): void {
    for (const targetState of this._targetStatesForTargetIds(documentDelete.removedTargetIds!, false)) {
      targetState.onDocumentRemoved(documentDelete.document!);
    }
  }

  private _onExistenceFilter(existenceFilter: ExistenceFilter): void {
    const targetId = existenceFilter.targetId;
    const targetState = this._targets.get(targetId!);
    if (targetState === undefined) {
      throw new WatchError(`ExistenceFilter specified an unknown targetId: ${targetId}`);
    }
  }
}

function* generateRangeZeroPadded(count: number): IterableIterator<string> {
  const numLeadingZeroes = 1 + Math.floor(Math.log10(count));
  for (let i=1; i<=count; i++) {
    yield `0000000000000000000${i}`.slice(-numLeadingZeroes);
  }
}

async function createDocuments(db: Firestore, documentCreateCount:number, collectionId: string, documentIdPrefix: string): Promise<Array<DocumentReference>> {
  const collectionRef = collection(db, collectionId);
  const documentRefs = Array.from(generateRangeZeroPadded(documentCreateCount)).map(documentIdSuffix => `${documentIdPrefix}_doc${documentIdSuffix}`).map(documentId => doc(collectionRef, documentId));
  const descriptionRefsDescription = descriptionFromSortedStrings(documentRefs.map(documentRef => documentRef.id).sort());

  log(`Creating ${documentRefs.length} documents in collection ${collectionRef.id}: ${descriptionRefsDescription}`);
  const writeBatches = createWriteBatchesForCreate(db, documentRefs, { TestKey: documentIdPrefix });
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
  return `${sortedStrings[0]} ... ${sortedStrings[sortedStrings.length-1]}`;
}

main();
