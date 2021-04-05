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

import { getModularInstance, Deferred } from '@firebase/util';

import { repoStartTransaction } from '../core/Repo';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { Node } from '../core/snap/Node';
import { validateWritablePath } from '../core/util/validation';

import { Reference } from './Reference';
import { DataSnapshot, onValue, ReferenceImpl } from './Reference_impl';

export interface TransactionOptions {
  readonly applyLocally?: boolean;
}

export class TransactionResult {
  /**
   * A type for the resolve value of Firebase.transaction.
   */
  constructor(readonly committed: boolean, readonly snapshot: DataSnapshot) {}

  toJSON(): object {
    return { committed: this.committed, snapshot: this.snapshot.toJSON() };
  }
}

export function runTransaction(
  ref: Reference,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionUpdate: (currentData: any) => unknown,
  options?: TransactionOptions
): Promise<TransactionResult> {
  ref = getModularInstance(ref);

  validateWritablePath('Reference.transaction', ref._path);

  if (ref.key === '.length' || ref.key === '.keys') {
    throw (
      'Reference.transaction failed: ' + ref.key + ' is a read-only object.'
    );
  }

  const applyLocally = options?.applyLocally ?? true;
  const deferred = new Deferred<TransactionResult>();

  const promiseComplete = (
    error: Error | null,
    committed: boolean,
    node: Node | null
  ) => {
    let dataSnapshot: DataSnapshot | null = null;
    if (error) {
      deferred.reject(error);
    } else {
      dataSnapshot = new DataSnapshot(
        node,
        new ReferenceImpl(ref._repo, ref._path),
        PRIORITY_INDEX
      );
      deferred.resolve(new TransactionResult(committed, dataSnapshot));
    }
  };

  // Add a watch to make sure we get server updates.
  const unwatcher = onValue(ref, () => {});

  repoStartTransaction(
    ref._repo,
    ref._path,
    transactionUpdate,
    promiseComplete,
    unwatcher,
    applyLocally
  );

  return deferred.promise;
}
