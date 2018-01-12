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

import { assert } from '../util/assert';

import { ResourcePath } from './path';

export class DocumentKey {
  constructor(readonly path: ResourcePath) {
    assert(
      DocumentKey.isDocumentKey(path),
      'Invalid DocumentKey with an odd number of segments: ' +
        path.toArray().join('/')
    );
  }

  isEqual(other: DocumentKey | null): boolean {
    return (
      other !== null && ResourcePath.comparator(this.path, other.path) === 0
    );
  }

  toString(): string {
    return this.path.toString();
  }

  static EMPTY = new DocumentKey(new ResourcePath([]));

  static comparator(k1: DocumentKey, k2: DocumentKey): number {
    return ResourcePath.comparator(k1.path, k2.path);
  }

  static isDocumentKey(path: ResourcePath): boolean {
    return path.length % 2 === 0;
  }

  /**
   * Creates and returns a new document key with the given segments.
   *
   * @param path The segments of the path to the document
   * @return A new instance of DocumentKey
   */
  static fromSegments(segments: string[]): DocumentKey {
    return new DocumentKey(new ResourcePath(segments.slice()));
  }

  /**
   * Creates and returns a new document key using '/' to split the string into
   * segments.
   *
   * @param path The slash-separated path string to the document
   * @return A new instance of DocumentKey
   */
  static fromPathString(path: string): DocumentKey {
    return new DocumentKey(ResourcePath.fromString(path));
  }
}
