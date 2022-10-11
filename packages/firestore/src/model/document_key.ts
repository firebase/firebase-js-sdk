/**
 * @license
 * Copyright 2017 Google LLC
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

import { debugAssert } from '../util/assert';

import { ResourcePath } from './path';

/**
 * @internal
 */
export class DocumentKey {
  constructor(readonly path: ResourcePath) {
    debugAssert(
      DocumentKey.isDocumentKey(path),
      'Invalid DocumentKey with an odd number of segments: ' +
        path.toArray().join('/')
    );
  }

  static fromPath(path: string): DocumentKey {
    return new DocumentKey(ResourcePath.fromString(path));
  }

  static fromName(name: string): DocumentKey {
    return new DocumentKey(ResourcePath.fromString(name).popFirst(5));
  }

  static empty(): DocumentKey {
    return new DocumentKey(ResourcePath.emptyPath());
  }

  get collectionGroup(): string {
    debugAssert(
      !this.path.isEmpty(),
      'Cannot get collection group for empty key'
    );
    return this.path.popLast().lastSegment();
  }

  /** Returns true if the document is in the specified collectionId. */
  hasCollectionId(collectionId: string): boolean {
    return (
      this.path.length >= 2 &&
      this.path.get(this.path.length - 2) === collectionId
    );
  }

  /** Returns the collection group (i.e. the name of the parent collection) for this key. */
  getCollectionGroup(): string {
    debugAssert(
      !this.path.isEmpty(),
      'Cannot get collection group for empty key'
    );
    return this.path.get(this.path.length - 2);
  }

  /** Returns the fully qualified path to the parent collection. */
  getCollectionPath(): ResourcePath {
    return this.path.popLast();
  }

  isEqual(other: DocumentKey | null): boolean {
    return (
      other !== null && ResourcePath.comparator(this.path, other.path) === 0
    );
  }

  toString(): string {
    return this.path.toString();
  }

  static comparator(k1: DocumentKey, k2: DocumentKey): number {
    return ResourcePath.comparator(k1.path, k2.path);
  }

  static isDocumentKey(path: ResourcePath): boolean {
    return path.length % 2 === 0;
  }

  /**
   * Creates and returns a new document key with the given segments.
   *
   * @param segments - The segments of the path to the document
   * @returns A new instance of DocumentKey
   */
  static fromSegments(segments: string[]): DocumentKey {
    return new DocumentKey(new ResourcePath(segments.slice()));
  }
}
