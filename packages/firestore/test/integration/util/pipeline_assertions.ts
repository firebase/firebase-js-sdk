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

import { DocumentData } from './firebase_export';
import { PipelineSnapshot } from './pipeline_export';

/**
 * Asserts that a pipeline snapshot contains exactly the given documents, in
 * order, matched either by document ID or by document data.
 */
export function expectResults(
  snapshot: PipelineSnapshot,
  ...docs: string[]
): void;
export function expectResults(
  snapshot: PipelineSnapshot,
  ...data: DocumentData[]
): void;

export function expectResults(
  snapshot: PipelineSnapshot,
  ...data: DocumentData[] | string[]
): void {
  const docs = snapshot.results;

  expect(docs.length).toBe(data.length);

  if (data.length > 0) {
    if (typeof data[0] === 'string') {
      const actualIds = docs.map(doc => doc.id);
      expect(actualIds).toEqual(data);
    } else {
      docs.forEach(r => {
        expect(r.data()).toEqual(data.shift());
      });
    }
  }
}
