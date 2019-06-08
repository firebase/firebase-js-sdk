/**
 * @license
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

import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';

export const DOCUMENT_KEY_NAME = '__name__';

/**
 * Path represents an ordered sequence of string segments.
 */
abstract class Path {
  private segments: string[];
  private offset: number;
  private len: number;

  constructor(segments: string[], offset?: number, length?: number) {
    this.init(segments, offset, length);
  }

  /**
   * Returns a String representation.
   *
   * Implementing classes are required to provide deterministic implementations as
   * the String representation is used to obtain canonical Query IDs.
   */
  abstract toString(): string;

  /**
   * An initialization method that can be called from outside the constructor.
   * We need this so that we can have a non-static construct method that returns
   * the polymorphic `this` type.
   */
  private init(segments: string[], offset?: number, length?: number): void {
    if (offset === undefined) {
      offset = 0;
    } else if (offset > segments.length) {
      fail('offset ' + offset + ' out of range ' + segments.length);
    }

    if (length === undefined) {
      length = segments.length - offset;
    } else if (length > segments.length - offset) {
      fail('length ' + length + ' out of range ' + (segments.length - offset));
    }
    this.segments = segments;
    this.offset = offset;
    this.len = length;
  }

  /**
   * Constructs a new instance of Path using the same concrete type as `this`.
   * We need this instead of using the normal constructor, because polymorphic
   * `this` doesn't work on static methods.
   */
  private construct(
    segments: string[],
    offset?: number,
    length?: number
  ): this {
    const path: this = Object.create(Object.getPrototypeOf(this));
    path.init(segments, offset, length);
    return path;
  }

  get length(): number {
    return this.len;
  }

  isEqual(other: Path): boolean {
    return Path.comparator(this, other) === 0;
  }

  child(nameOrPath: string | this): this {
    const segments = this.segments.slice(this.offset, this.limit());
    if (nameOrPath instanceof Path) {
      nameOrPath.forEach(segment => {
        segments.push(segment);
      });
    } else if (typeof nameOrPath === 'string') {
      segments.push(nameOrPath);
    } else {
      fail('Unknown parameter type for Path.child(): ' + nameOrPath);
    }
    return this.construct(segments);
  }

  /** The index of one past the last segment of the path. */
  private limit(): number {
    return this.offset + this.length;
  }

  popFirst(size?: number): this {
    size = size === undefined ? 1 : size;
    assert(this.length >= size, "Can't call popFirst() with less segments");
    return this.construct(
      this.segments,
      this.offset + size,
      this.length - size
    );
  }

  popLast(): this {
    assert(!this.isEmpty(), "Can't call popLast() on empty path");
    return this.construct(this.segments, this.offset, this.length - 1);
  }

  firstSegment(): string {
    assert(!this.isEmpty(), "Can't call firstSegment() on empty path");
    return this.segments[this.offset];
  }

  lastSegment(): string {
    return this.get(this.length - 1);
  }

  get(index: number): string {
    assert(index < this.length, 'Index out of range');
    return this.segments[this.offset + index];
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  isPrefixOf(other: this): boolean {
    if (other.length < this.length) {
      return false;
    }

    for (let i = 0; i < this.length; i++) {
      if (this.get(i) !== other.get(i)) {
        return false;
      }
    }

    return true;
  }

  isImmediateParentOf(potentialChild: this): boolean {
    if (this.length + 1 !== potentialChild.length) {
      return false;
    }

    for (let i = 0; i < this.length; i++) {
      if (this.get(i) !== potentialChild.get(i)) {
        return false;
      }
    }

    return true;
  }

  forEach(fn: (segment: string) => void): void {
    for (let i = this.offset, end = this.limit(); i < end; i++) {
      fn(this.segments[i]);
    }
  }

  toArray(): string[] {
    return this.segments.slice(this.offset, this.limit());
  }

  static comparator(p1: Path, p2: Path): number {
    const len = Math.min(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const left = p1.get(i);
      const right = p2.get(i);
      if (left < right) {return -1;}
      if (left > right) {return 1;}
    }
    if (p1.length < p2.length) {return -1;}
    if (p1.length > p2.length) {return 1;}
    return 0;
  }
}

/**
 * A slash-separated path for navigating resources (documents and collections)
 * within Firestore.
 */
export class ResourcePath extends Path {
  canonicalString(): string {
    // NOTE: The client is ignorant of any path segments containing escape
    // sequences (e.g. __id123__) and just passes them through raw (they exist
    // for legacy reasons and should not be used frequently).

    return this.toArray().join('/');
  }

  toString(): string {
    return this.canonicalString();
  }

  /**
   * Creates a resource path from the given slash-delimited string.
   */
  static fromString(path: string): ResourcePath {
    // NOTE: The client is ignorant of any path segments containing escape
    // sequences (e.g. __id123__) and just passes them through raw (they exist
    // for legacy reasons and should not be used frequently).

    if (path.indexOf('//') >= 0) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid path (${path}). Paths must not contain // in them.`
      );
    }

    // We may still have an empty segment at the beginning or end if they had a
    // leading or trailing slash (which we allow).
    const segments = path.split('/').filter(segment => segment.length > 0);

    return new ResourcePath(segments);
  }

  static EMPTY_PATH = new ResourcePath([]);
}

const identifierRegExp = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/** A dot-separated path for navigating sub-objects within a document. */
export class FieldPath extends Path {
  /**
   * Returns true if the string could be used as a segment in a field path
   * without escaping.
   */
  private static isValidIdentifier(segment: string): boolean {
    return identifierRegExp.test(segment);
  }

  canonicalString(): string {
    return this.toArray()
      .map(str => {
        str = str.replace('\\', '\\\\').replace('`', '\\`');
        if (!FieldPath.isValidIdentifier(str)) {
          str = '`' + str + '`';
        }
        return str;
      })
      .join('.');
  }

  toString(): string {
    return this.canonicalString();
  }

  /**
   * Returns true if this field references the key of a document.
   */
  isKeyField(): boolean {
    return this.length === 1 && this.get(0) === DOCUMENT_KEY_NAME;
  }

  /**
   * The field designating the key of a document.
   */
  static keyField(): FieldPath {
    return new FieldPath([DOCUMENT_KEY_NAME]);
  }

  /**
   * Parses a field string from the given server-formatted string.
   *
   * - Splitting the empty string is not allowed (for now at least).
   * - Empty segments within the string (e.g. if there are two consecutive
   *   separators) are not allowed.
   *
   * TODO(b/37244157): we should make this more strict. Right now, it allows
   * non-identifier path components, even if they aren't escaped.
   */
  static fromServerFormat(path: string): FieldPath {
    const segments: string[] = [];
    let current = '';
    let i = 0;

    const addCurrentSegment = (): void => {
      if (current.length === 0) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid field path (${path}). Paths must not be empty, begin ` +
            `with '.', end with '.', or contain '..'`
        );
      }
      segments.push(current);
      current = '';
    };

    let inBackticks = false;

    while (i < path.length) {
      const c = path[i];
      if (c === '\\') {
        if (i + 1 === path.length) {
          throw new FirestoreError(
            Code.INVALID_ARGUMENT,
            'Path has trailing escape character: ' + path
          );
        }
        const next = path[i + 1];
        if (!(next === '\\' || next === '.' || next === '`')) {
          throw new FirestoreError(
            Code.INVALID_ARGUMENT,
            'Path has invalid escape sequence: ' + path
          );
        }
        current += next;
        i += 2;
      } else if (c === '`') {
        inBackticks = !inBackticks;
        i++;
      } else if (c === '.' && !inBackticks) {
        addCurrentSegment();
        i++;
      } else {
        current += c;
        i++;
      }
    }
    addCurrentSegment();

    if (inBackticks) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Unterminated ` in path: ' + path
      );
    }

    return new FieldPath(segments);
  }

  static EMPTY_PATH = new FieldPath([]);
}
