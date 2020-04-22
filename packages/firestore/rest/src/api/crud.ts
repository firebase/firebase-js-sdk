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
import { debugAssert, hardAssert } from '../../../src/util/assert';

export type DocumentData = { [key: string]: any };

import * as api from '../api';

import { DocumentReference, DocumentSnapshot, Firestore } from './database';
import { Document } from '../../../src/model/document';

export interface Settings {
  host?: string;
  ssl?: boolean;
}

export function initializeFirestore(firstore: Firestore, settings?: Settings) {
  firstore._configureClient(settings ?? {});
}

export async function getDocument<T>(
  reference: api.DocumentReference<T>
): Promise<DocumentSnapshot> {
  typeAssert(reference instanceof DocumentReference);
  const firestore = reference.firestore;
  typeAssert(firestore instanceof Firestore);
  await firestore._ensureClientConfigured();
  const result = await firestore._datastore!.lookup([reference._key]);
  hardAssert(result.length == 1, 'Expected a single document result');
  const maybeDocument = result[0];
  return new DocumentSnapshot<DocumentData>(
    firestore,
    reference._key,
    maybeDocument instanceof Document ? maybeDocument : null
  );
}

function typeAssert(exp: boolean) : asserts exp {
  debugAssert(exp, 'Instance is not of the expected internal type');
}
