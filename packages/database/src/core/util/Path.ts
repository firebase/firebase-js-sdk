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

import { stringLength } from '@firebase/util';

import { nameCompare } from './util';

/** Maximum key depth. */
const MAX_PATH_DEPTH = 32;

/** Maximum number of (UTF8) bytes in a Firebase path. */
const MAX_PATH_LENGTH_BYTES = 768;

/**
 * An immutable object representing a parsed path.  It's immutable so that you
 * can pass them around to other functions without worrying about them changing
 * it.
 */

export class Path {
  pieces_: string[];
  pieceNum_: number;

  /**
   * @param pathOrString - Path string to parse, or another path, or the raw
   * tokens array
   */
  constructor(pathOrString: string | string[], pieceNum?: number) {
    if (pieceNum === void 0) {
      this.pieces_ = (pathOrString as string).split('/');

      // Remove empty pieces.
      let copyTo = 0;
      for (let i = 0; i < this.pieces_.length; i++) {
        if (this.pieces_[i].length > 0) {
          this.pieces_[copyTo] = this.pieces_[i];
          copyTo++;
        }
      }
      this.pieces_.length = copyTo;

      this.pieceNum_ = 0;
    } else {
      this.pieces_ = pathOrString as string[];
      this.pieceNum_ = pieceNum;
    }
  }

  toString(): string {
    let pathString = '';
    for (let i = this.pieceNum_; i < this.pieces_.length; i++) {
      if (this.pieces_[i] !== '') {
        pathString += '/' + this.pieces_[i];
      }
    }

    return pathString || '/';
  }
}

export function newEmptyPath(): Path {
  return new Path('');
}

export function pathGetFront(path: Path): string | null {
  if (path.pieceNum_ >= path.pieces_.length) {
    return null;
  }

  return path.pieces_[path.pieceNum_];
}

/**
 * @returns The number of segments in this path
 */
export function pathGetLength(path: Path): number {
  return path.pieces_.length - path.pieceNum_;
}

export function pathPopFront(path: Path): Path {
  let pieceNum = path.pieceNum_;
  if (pieceNum < path.pieces_.length) {
    pieceNum++;
  }
  return new Path(path.pieces_, pieceNum);
}

export function pathGetBack(path: Path): string | null {
  if (path.pieceNum_ < path.pieces_.length) {
    return path.pieces_[path.pieces_.length - 1];
  }

  return null;
}

export function pathToUrlEncodedString(path: Path): string {
  let pathString = '';
  for (let i = path.pieceNum_; i < path.pieces_.length; i++) {
    if (path.pieces_[i] !== '') {
      pathString += '/' + encodeURIComponent(String(path.pieces_[i]));
    }
  }

  return pathString || '/';
}

/**
 * Shallow copy of the parts of the path.
 *
 */
export function pathSlice(path: Path, begin: number = 0): string[] {
  return path.pieces_.slice(path.pieceNum_ + begin);
}

export function pathParent(path: Path): Path | null {
  if (path.pieceNum_ >= path.pieces_.length) {
    return null;
  }

  const pieces = [];
  for (let i = path.pieceNum_; i < path.pieces_.length - 1; i++) {
    pieces.push(path.pieces_[i]);
  }

  return new Path(pieces, 0);
}

export function pathChild(path: Path, childPathObj: string | Path): Path {
  const pieces = [];
  for (let i = path.pieceNum_; i < path.pieces_.length; i++) {
    pieces.push(path.pieces_[i]);
  }

  if (childPathObj instanceof Path) {
    for (let i = childPathObj.pieceNum_; i < childPathObj.pieces_.length; i++) {
      pieces.push(childPathObj.pieces_[i]);
    }
  } else {
    const childPieces = childPathObj.split('/');
    for (let i = 0; i < childPieces.length; i++) {
      if (childPieces[i].length > 0) {
        pieces.push(childPieces[i]);
      }
    }
  }

  return new Path(pieces, 0);
}

/**
 * @returns True if there are no segments in this path
 */
export function pathIsEmpty(path: Path): boolean {
  return path.pieceNum_ >= path.pieces_.length;
}

/**
 * @returns The path from outerPath to innerPath
 */
export function newRelativePath(outerPath: Path, innerPath: Path): Path {
  const outer = pathGetFront(outerPath),
    inner = pathGetFront(innerPath);
  if (outer === null) {
    return innerPath;
  } else if (outer === inner) {
    return newRelativePath(pathPopFront(outerPath), pathPopFront(innerPath));
  } else {
    throw new Error(
      'INTERNAL ERROR: innerPath (' +
        innerPath +
        ') is not within ' +
        'outerPath (' +
        outerPath +
        ')'
    );
  }
}

/**
 * @returns -1, 0, 1 if left is less, equal, or greater than the right.
 */
export function pathCompare(left: Path, right: Path): number {
  const leftKeys = pathSlice(left, 0);
  const rightKeys = pathSlice(right, 0);
  for (let i = 0; i < leftKeys.length && i < rightKeys.length; i++) {
    const cmp = nameCompare(leftKeys[i], rightKeys[i]);
    if (cmp !== 0) {
      return cmp;
    }
  }
  if (leftKeys.length === rightKeys.length) {
    return 0;
  }
  return leftKeys.length < rightKeys.length ? -1 : 1;
}

/**
 * @returns true if paths are the same.
 */
export function pathEquals(path: Path, other: Path): boolean {
  if (pathGetLength(path) !== pathGetLength(other)) {
    return false;
  }

  for (
    let i = path.pieceNum_, j = other.pieceNum_;
    i <= path.pieces_.length;
    i++, j++
  ) {
    if (path.pieces_[i] !== other.pieces_[j]) {
      return false;
    }
  }

  return true;
}

/**
 * @returns True if this path is a parent (or the same as) other
 */
export function pathContains(path: Path, other: Path): boolean {
  let i = path.pieceNum_;
  let j = other.pieceNum_;
  if (pathGetLength(path) > pathGetLength(other)) {
    return false;
  }
  while (i < path.pieces_.length) {
    if (path.pieces_[i] !== other.pieces_[j]) {
      return false;
    }
    ++i;
    ++j;
  }
  return true;
}

/**
 * Dynamic (mutable) path used to count path lengths.
 *
 * This class is used to efficiently check paths for valid
 * length (in UTF8 bytes) and depth (used in path validation).
 *
 * Throws Error exception if path is ever invalid.
 *
 * The definition of a path always begins with '/'.
 */
export class ValidationPath {
  parts_: string[];
  /** Initialize to number of '/' chars needed in path. */
  byteLength_: number;

  /**
   * @param path - Initial Path.
   * @param errorPrefix_ - Prefix for any error messages.
   */
  constructor(path: Path, public errorPrefix_: string) {
    this.parts_ = pathSlice(path, 0);
    /** Initialize to number of '/' chars needed in path. */
    this.byteLength_ = Math.max(1, this.parts_.length);

    for (let i = 0; i < this.parts_.length; i++) {
      this.byteLength_ += stringLength(this.parts_[i]);
    }
    validationPathCheckValid(this);
  }
}

export function validationPathPush(
  validationPath: ValidationPath,
  child: string
): void {
  // Count the needed '/'
  if (validationPath.parts_.length > 0) {
    validationPath.byteLength_ += 1;
  }
  validationPath.parts_.push(child);
  validationPath.byteLength_ += stringLength(child);
  validationPathCheckValid(validationPath);
}

export function validationPathPop(validationPath: ValidationPath): void {
  const last = validationPath.parts_.pop();
  validationPath.byteLength_ -= stringLength(last);
  // Un-count the previous '/'
  if (validationPath.parts_.length > 0) {
    validationPath.byteLength_ -= 1;
  }
}

function validationPathCheckValid(validationPath: ValidationPath): void {
  if (validationPath.byteLength_ > MAX_PATH_LENGTH_BYTES) {
    throw new Error(
      validationPath.errorPrefix_ +
        'has a key path longer than ' +
        MAX_PATH_LENGTH_BYTES +
        ' bytes (' +
        validationPath.byteLength_ +
        ').'
    );
  }
  if (validationPath.parts_.length > MAX_PATH_DEPTH) {
    throw new Error(
      validationPath.errorPrefix_ +
        'path specified exceeds the maximum depth that can be written (' +
        MAX_PATH_DEPTH +
        ') or object contains a cycle ' +
        validationPathToErrorString(validationPath)
    );
  }
}

/**
 * String for use in error messages - uses '.' notation for path.
 */
export function validationPathToErrorString(
  validationPath: ValidationPath
): string {
  if (validationPath.parts_.length === 0) {
    return '';
  }
  return "in property '" + validationPath.parts_.join('.') + "'";
}
