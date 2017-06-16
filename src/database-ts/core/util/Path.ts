import { nameCompare } from "./util";
import { stringLength } from "../../../utils/utf8";
/**
 * An immutable object representing a parsed path.  It's immutable so that you
 * can pass them around to other functions without worrying about them changing
 * it.
 */

export class Path {
  pieces_;
  pieceNum_;

  /**
   * Singleton to represent an empty path
   *
   * @const
   */
  static get Empty() {
    return new Path('');
  }
  /**
   * @param {string|Array.<string>} pathOrString Path string to parse,
   *      or another path, or the raw tokens array
   * @param {number=} opt_pieceNum
   */
  constructor(pathOrString, opt_pieceNum?) {
    if (arguments.length == 1) {
      this.pieces_ = pathOrString.split('/');

      // Remove empty pieces.
      var copyTo = 0;
      for (var i = 0; i < this.pieces_.length; i++) {
        if (this.pieces_[i].length > 0) {
          this.pieces_[copyTo] = this.pieces_[i];
          copyTo++;
        }
      }
      this.pieces_.length = copyTo;

      this.pieceNum_ = 0;
    } else {
      this.pieces_ = pathOrString;
      this.pieceNum_ = opt_pieceNum;
    }
  }

  getFront() {
    if (this.pieceNum_ >= this.pieces_.length)
      return null;

    return this.pieces_[this.pieceNum_];
  }

  /**
   * @return {number} The number of segments in this path
   */
  getLength() {
    return this.pieces_.length - this.pieceNum_;
  }

  /**
   * @return {!Path}
   */
  popFront() {
    var pieceNum = this.pieceNum_;
    if (pieceNum < this.pieces_.length) {
      pieceNum++;
    }
    return new Path(this.pieces_, pieceNum);
  }

  /**
   * @return {?string}
   */
  getBack() {
    if (this.pieceNum_ < this.pieces_.length)
      return this.pieces_[this.pieces_.length - 1];

    return null;
  }

  toString() {
    var pathString = '';
    for (var i = this.pieceNum_; i < this.pieces_.length; i++) {
      if (this.pieces_[i] !== '')
        pathString += '/' + this.pieces_[i];
    }

    return pathString || '/';
  }

  toUrlEncodedString() {
    var pathString = '';
    for (var i = this.pieceNum_; i < this.pieces_.length; i++) {
      if (this.pieces_[i] !== '') 
        pathString += '/' + encodeURIComponent(String(this.pieces_[i]));
    }

    return pathString || '/';
  }

  /**
   * Shallow copy of the parts of the path.
   *
   * @param {number=} opt_begin
   * @return {!Array<string>}
   */
  slice(opt_begin) {
    var begin = opt_begin || 0;
    return this.pieces_.slice(this.pieceNum_ + begin);
  }

  /**
   * @return {?Path}
   */
  parent() {
    if (this.pieceNum_ >= this.pieces_.length)
      return null;

    var pieces = [];
    for (var i = this.pieceNum_; i < this.pieces_.length - 1; i++)
      pieces.push(this.pieces_[i]);

    return new Path(pieces, 0);
  }

  /**
   * @param {string|!Path} childPathObj
   * @return {!Path}
   */
  child(childPathObj) {
    var pieces = [];
    for (var i = this.pieceNum_; i < this.pieces_.length; i++)
      pieces.push(this.pieces_[i]);

    if (childPathObj instanceof Path) {
      for (i = childPathObj.pieceNum_; i < childPathObj.pieces_.length; i++) {
        pieces.push(childPathObj.pieces_[i]);
      }
    } else {
      var childPieces = childPathObj.split('/');
      for (i = 0; i < childPieces.length; i++) {
        if (childPieces[i].length > 0)
          pieces.push(childPieces[i]);
      }
    }

    return new Path(pieces, 0);
  }

  /**
   * @return {boolean} True if there are no segments in this path
   */
  isEmpty() {
    return this.pieceNum_ >= this.pieces_.length;
  }

  /**
   * @param {!Path} outerPath
   * @param {!Path} innerPath
   * @return {!Path} The path from outerPath to innerPath
   */
  static relativePath(outerPath, innerPath) {
    var outer = outerPath.getFront(), inner = innerPath.getFront();
    if (outer === null) {
      return innerPath;
    } else if (outer === inner) {
      return Path.relativePath(outerPath.popFront(),
                                            innerPath.popFront());
    } else {
      throw new Error('INTERNAL ERROR: innerPath (' + innerPath + ') is not within ' +
                      'outerPath (' + outerPath + ')');
    }
  }
  /**
   * @param {!Path} left
   * @param {!Path} right
   * @return {number} -1, 0, 1 if left is less, equal, or greater than the right.
   */
  static comparePaths(left, right) {
    var leftKeys = left.slice();
    var rightKeys = right.slice();
    for (var i = 0; i < leftKeys.length && i < rightKeys.length; i++) {
      var cmp = nameCompare(leftKeys[i], rightKeys[i]);
      if (cmp !== 0) return cmp;
    }
    if (leftKeys.length === rightKeys.length) return 0;
    return (leftKeys.length < rightKeys.length) ? -1 : 1;
  }

  /**
   *
   * @param {Path} other
   * @return {boolean} true if paths are the same.
   */
  equals(other) {
    if (this.getLength() !== other.getLength()) {
      return false;
    }

    for (var i = this.pieceNum_, j = other.pieceNum_; i <= this.pieces_.length; i++, j++) {
      if (this.pieces_[i] !== other.pieces_[j]) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {!Path} other
   * @return {boolean} True if this path is a parent (or the same as) other
   */
  contains(other) {
    var i = this.pieceNum_;
    var j = other.pieceNum_;
    if (this.getLength() > other.getLength()) {
      return false;
    }
    while (i < this.pieces_.length) {
      if (this.pieces_[i] !== other.pieces_[j]) {
        return false;
      }
      ++i;
      ++j;
    }
    return true;
  }
} // end Path

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
  /** @type {!Array<string>} */
  parts_;
  /** @type {number} Initialize to number of '/' chars needed in path. */
  byteLength_;
  /** @type {string} */
  errorPrefix_;

  /**
   * @param {!Path} path Initial Path.
   * @param {string} errorPrefix Prefix for any error messages.
   */
  constructor(path, errorPrefix) {
    /** @type {!Array<string>} */
    this.parts_ = path.slice();
    /** @type {number} Initialize to number of '/' chars needed in path. */
    this.byteLength_ = Math.max(1, this.parts_.length);
    /** @type {string} */
    this.errorPrefix_ = errorPrefix;

    for (var i = 0; i < this.parts_.length; i++) {
      this.byteLength_ += stringLength(this.parts_[i]);
    }
    this.checkValid_();
  }
  /** @const {number} Maximum key depth. */
  static get MAX_PATH_DEPTH() {
    return 32;
  }

  /** @const {number} Maximum number of (UTF8) bytes in a Firebase path. */
  static get MAX_PATH_LENGTH_BYTES() {
    return 768
  }

  /** @param {string} child */
  push(child) {
    // Count the needed '/'
    if (this.parts_.length > 0) {
      this.byteLength_ += 1;
    }
    this.parts_.push(child);
    this.byteLength_ += stringLength(child);
    this.checkValid_();
  }

  pop() {
    var last = this.parts_.pop();
    this.byteLength_ -= stringLength(last);
    // Un-count the previous '/'
    if (this.parts_.length > 0) {
      this.byteLength_ -= 1;
    }
  }

  checkValid_() {
    if (this.byteLength_ > ValidationPath.MAX_PATH_LENGTH_BYTES) {
      throw new Error(this.errorPrefix_ + 'has a key path longer than ' +
                      ValidationPath.MAX_PATH_LENGTH_BYTES + ' bytes (' +
                      this.byteLength_ + ').');
    }
    if (this.parts_.length > ValidationPath.MAX_PATH_DEPTH) {
      throw new Error(this.errorPrefix_ + 'path specified exceeds the maximum depth that can be written (' +
                      ValidationPath.MAX_PATH_DEPTH +
                      ') or object contains a cycle ' + this.toErrorString());
    }
  }

  /**
   * String for use in error messages - uses '.' notation for path.
   *
   * @return {string}
   */
  toErrorString() {
    if (this.parts_.length == 0) {
      return '';
    }
    return 'in property \'' + this.parts_.join('.') + '\'';
  }

}; // end fb.core.util.validation.ValidationPath
