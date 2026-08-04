/**
 * @license
 * Copyright 2026 Google LLC
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

import { getModularInstance } from '@firebase/util';

import { ensureFirestoreConfigured, Firestore } from '../../src/api/database';
import {
  PartialObserver,
  NextFn,
  ErrorFn,
  CompleteFn,
  isPartialObserver
} from '../../src/api/observer';
import { RealtimePipeline } from '../../src/api/realtime_pipeline';
import {
  Unsubscribe,
  PipelineListenOptions,
  SnapshotListenOptions
} from '../../src/api/reference_impl';
import { RealtimePipelineSnapshot } from '../../src/api/snapshot';
import { ExpUserDataWriter } from '../../src/api/user_data_writer';
import { ListenerDataSource } from '../../src/core/event_manager';
import { firestoreClientListen } from '../../src/core/firestore_client';
import {
  canonifyPipeline as canonifyCorePipeline,
  pipelineEq as corePipelineEq,
  toCorePipeline
} from '../../src/core/pipeline-util';
import {
  PipelineInputOutput,
  runPipeline as runCorePipeline
} from '../../src/core/pipeline_run';
import { ViewSnapshot } from '../../src/core/view_snapshot';
import { Constant } from '../../src/lite-api/expressions';
import { Pipeline as LitePipeline } from '../../src/lite-api/pipeline';
import { Stage } from '../../src/lite-api/stage';
import {
  newUserDataReader,
  UserDataSource
} from '../../src/lite-api/user_data_reader';
import { FirestoreError } from '../../src/util/error';
import { cast } from '../../src/util/input_validation';

import { firestore } from './api_helpers';
import { testUserDataReader } from './helpers';

export function canonifyPipeline(p: LitePipeline): string {
  return canonifyCorePipeline(toCorePipeline(p));
}

export function pipelineEq(p1: LitePipeline, p2: LitePipeline): boolean {
  return corePipelineEq(toCorePipeline(p1), toCorePipeline(p2));
}

export function runPipeline(
  p: LitePipeline,
  inputs: PipelineInputOutput[]
): PipelineInputOutput[] {
  return runCorePipeline(toCorePipeline(p), inputs);
}

export function constantArray(...values: unknown[]): Constant {
  const constant = new Constant(values, 'constantArray');
  constant._readUserData(
    testUserDataReader(false).createContext(
      UserDataSource.ArrayArgument,
      'constantArray'
    )
  );
  return constant;
}

export function constantMap(values: Record<string, unknown>): Constant {
  const constant = new Constant(values, 'constantMap');
  constant._readUserData(
    testUserDataReader(false).createContext(
      UserDataSource.Argument,
      'constantMap'
    )
  );
  return constant;
}

export function pipelineFromStages(stages: Stage[]): RealtimePipeline {
  const db = firestore();
  return new RealtimePipeline(
    db,
    newUserDataReader(db),
    new ExpUserDataWriter(db),
    stages
  );
}

export function onPipelineSnapshot(
  query: RealtimePipeline,
  observer: {
    next?: (snapshot: RealtimePipelineSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onPipelineSnapshot(
  query: RealtimePipeline,
  options: PipelineListenOptions,
  observer: {
    next?: (snapshot: RealtimePipelineSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function onPipelineSnapshot(
  query: RealtimePipeline,
  onNext: (snapshot: RealtimePipelineSnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onPipelineSnapshot(
  query: RealtimePipeline,
  options: PipelineListenOptions,
  onNext: (snapshot: RealtimePipelineSnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function onPipelineSnapshot(
  reference: RealtimePipeline,
  ...args: unknown[]
): Unsubscribe {
  reference = getModularInstance(reference);

  let options: PipelineListenOptions = {
    includeMetadataChanges: false,
    source: 'default',
    serverTimestampBehavior: 'none'
  };
  let currArg = 0;
  if (typeof args[currArg] === 'object' && !isPartialObserver(args[currArg])) {
    options = args[currArg] as SnapshotListenOptions;
    currArg++;
  }

  const internalOptions = {
    includeMetadataChanges: options.includeMetadataChanges,
    source: options.source as ListenerDataSource,
    serverTimestampBehavior: options.serverTimestampBehavior
  };

  if (isPartialObserver(args[currArg])) {
    const userObserver = args[
      currArg
    ] as PartialObserver<RealtimePipelineSnapshot>;
    args[currArg] = userObserver.next?.bind(userObserver);
    args[currArg + 1] = userObserver.error?.bind(userObserver);
    args[currArg + 2] = userObserver.complete?.bind(userObserver);
  }

  // RealtimePipeline
  const firestore = cast(reference._db, Firestore);
  const internalQuery = toCorePipeline(reference, internalOptions);
  const observer = {
    next: (snapshot: ViewSnapshot) => {
      if (args[currArg]) {
        (args[currArg] as NextFn<RealtimePipelineSnapshot>)(
          new RealtimePipelineSnapshot(
            reference as RealtimePipeline,
            snapshot,
            internalOptions
          )
        );
      }
    },
    error: args[currArg + 1] as ErrorFn,
    complete: args[currArg + 2] as CompleteFn
  };

  const client = ensureFirestoreConfigured(firestore);
  return firestoreClientListen(
    client,
    internalQuery,
    internalOptions,
    observer
  );
}

export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  observer: {
    next?: (snapshot: RealtimePipelineSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  options: PipelineListenOptions,
  observer: {
    next?: (snapshot: RealtimePipelineSnapshot) => void;
    error?: (error: FirestoreError) => void;
    complete?: () => void;
  }
): Unsubscribe;
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  onNext: (snapshot: RealtimePipelineSnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  options: PipelineListenOptions,
  onNext: (snapshot: RealtimePipelineSnapshot) => void,
  onError?: (error: FirestoreError) => void,
  onCompletion?: () => void
): Unsubscribe;
export function _onRealtimePipelineSnapshot(
  pipeline: RealtimePipeline,
  ...args: unknown[]
): Unsubscribe {
  let options: PipelineListenOptions = {
    includeMetadataChanges: false,
    source: 'default',
    serverTimestampBehavior: 'none'
  };
  let currArg = 0;
  if (typeof args[currArg] === 'object' && !isPartialObserver(args[currArg])) {
    options = args[currArg] as SnapshotListenOptions;
    currArg++;
  }

  const internalOptions = {
    includeMetadataChanges: options.includeMetadataChanges,
    source: options.source as ListenerDataSource,
    serverTimestampBehavior: options.serverTimestampBehavior
  };

  let userObserver: PartialObserver<RealtimePipelineSnapshot>;
  if (isPartialObserver(args[currArg])) {
    userObserver = args[currArg] as PartialObserver<RealtimePipelineSnapshot>;
  } else {
    userObserver = {
      next: args[currArg] as NextFn<RealtimePipelineSnapshot>,
      error: args[currArg + 1] as ErrorFn,
      complete: args[currArg + 2] as CompleteFn
    };
  }

  const client = ensureFirestoreConfigured(pipeline._db as Firestore);
  const observer = {
    next: (snapshot: ViewSnapshot) => {
      if (userObserver.next) {
        userObserver.next(
          new RealtimePipelineSnapshot(pipeline, snapshot, internalOptions)
        );
      }
    },
    error: userObserver.error,
    complete: userObserver.complete
  };

  return firestoreClientListen(
    client,
    toCorePipeline(pipeline, internalOptions),
    internalOptions, // Pass parsed options here
    observer
  );
}
