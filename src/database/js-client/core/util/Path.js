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
goog.provide('fb.core.util.Path');
goog.provide('fb.core.util.ValidationPath');

goog.require('fb.core.util');
goog.require('fb.util.utf8');
goog.require('goog.string');


/**
 * An immutable object representing a parsed path.  It's immutable so that you
 * can pass them around to other functions without worrying about them changing
 * it.
 */
fb.core.util.Path = goog.defineClass(null, {
  /**
   * @param {string|Array.<string>} pathOrString Path string to parse,
   *      or another path, or the raw tokens array
   * @param {number=} opt_pieceNum
   */
  constructor: function(pathOrString, opt_pieceNum) {
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
  },

  getFront: function() {
    if (this.pieceNum_ >= this.pieces_.length)
      return null;

    return this.pieces_[this.pieceNum_];
  },

  /**
   * @return {number} The number of segments in this path
   */
  getLength: function() {
    return this.pieces_.length - this.pieceNum_;
  },

  /**
   * @return {!fb.core.util.Path}
   */
  popFront: function() {
    var pieceNum = this.pieceNum_;
    if (pieceNum < this.pieces_.length) {
      pieceNum++;
    }
    return new fb.core.util.Path(this.pieces_, pieceNum);
  },

  /**
   * @return {?string}
   */
  getBack: function() {
    if (this.pieceNum_ < this.pieces_.length)
      return this.pieces_[this.pieces_.length - 1];

    return null;
  },

  toString: function() {
    var pathString = '';
    for (var i = this.pieceNum_; i < this.pieces_.length; i++) {
      if (this.pieces_[i] !== '')
        pathString += '/' + this.pieces_[i];
    }

    return pathString || '/';
  },

  toUrlEncodedString: function() {
    var pathString = '';
    for (var i = this.pieceNum_; i < this.pieces_.length; i++) {
      if (this.pieces_[i] !== '')
        pathString += '/' + goog.string.urlEncode(this.pieces_[i]);
    }

    return pathString || '/';
  },

  /**
   * Shallow copy of the parts of the path.
   *
   * @param {number=} opt_begin
   * @return {!Array<string>}
   */
  slice: function(opt_begin) {
    var begin = opt_begin || 0;
    return this.pieces_.slice(this.pieceNum_ + begin);
  },

  /**
   * @return {?fb.core.util.Path}
   */
  parent: function() {
    if (this.pieceNum_ >= this.pieces_.length)
      return null;

    var pieces = [];
    for (var i = this.pieceNum_; i < this.pieces_.length - 1; i++)
      pieces.push(this.pieces_[i]);

    return new fb.core.util.Path(pieces, 0);
  },

  /**
   * @param {string|!fb.core.util.Path} childPathObj
   * @return {!fb.core.util.Path}
   */
  child: function(childPathObj) {
    var pieces = [];
    for (var i = this.pieceNum_; i < this.pieces_.length; i++)
      pieces.push(this.pieces_[i]);

    if (childPathObj instanceof fb.core.util.Path) {
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

    return new fb.core.util.Path(pieces, 0);
  },

  /**
   * @return {boolean} True if there are no segments in this path
   */
  isEmpty: function() {
    return this.pieceNum_ >= this.pieces_.length;
  },

  statics: {
    /**
     * @param {!fb.core.util.Path} outerPath
     * @param {!fb.core.util.Path} innerPath
     * @return {!fb.core.util.Path} The path from outerPath to innerPath
     */
    relativePath: function(outerPath, innerPath) {
      var outer = outerPath.getFront(), inner = innerPath.getFront();
      if (outer === null) {
        return innerPath;
      } else if (outer === inner) {
        return fb.core.util.Path.relativePath(outerPath.popFront(),
                                              innerPath.popFront());
      } else {
        throw new Error('INTERNAL ERROR: innerPath (' + innerPath + ') is not within ' +
                        'outerPath (' + outerPath + ')');
      }
    },
    /**
     * @param {!fb.core.util.Path} left
     * @param {!fb.core.util.Path} right
     * @return {number} -1, 0, 1 if left is less, equal, or greater than the right.
     */
    comparePaths: function(left, right) {
      var leftKeys = left.slice();
      var rightKeys = right.slice();
      for (var i = 0; i < leftKeys.length && i < rightKeys.length; i++) {
        var cmp = fb.core.util.nameCompare(leftKeys[i], rightKeys[i]);
        if (cmp !== 0) return cmp;
      }
      if (leftKeys.length === rightKeys.length) return 0;
      return (leftKeys.length < rightKeys.length) ? -1 : 1;
    }
  },

  /**
   *
   * @param {fb.core.util.Path} other
   * @return {boolean} true if paths are the same.
   */
  equals: function(other) {
    if (this.getLength() !== other.getLength()) {
      return false;
    }

    for (var i = this.pieceNum_, j = other.pieceNum_; i <= this.pieces_.length; i++, j++) {
      if (this.pieces_[i] !== other.pieces_[j]) {
        return false;
      }
    }

    return true;
  },

  /**
   *
   * @param {!fb.core.util.Path} other
   * @return {boolean} True if this path is a parent (or the same as) other
   */
  contains: function(other) {
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
}); // end fb.core.util.Path


/**
 * Singleton to represent an empty path
 *
 * @const
 */
fb.core.util.Path.Empty = new fb.core.util.Path('');


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
fb.core.util.ValidationPath = goog.defineClass(null, {
  /**
   * @param {!fb.core.util.Path} path Initial Path.
   * @param {string} errorPrefix Prefix for any error messages.
   */
  constructor: function(path, errorPrefix) {
    /** @type {!Array<string>} */
    this.parts_ = path.slice();
    /** @type {number} Initialize to number of '/' chars needed in path. */
    this.byteLength_ = Math.max(1, this.parts_.length);
    /** @type {string} */
    this.errorPrefix_ = errorPrefix;

    for (var i = 0; i < this.parts_.length; i++) {
      this.byteLength_ += fb.util.utf8.stringLength(this.parts_[i]);
    }
    this.checkValid_();
  },

  statics: {
    /** @const {number} Maximum key depth. */
    MAX_PATH_DEPTH: 32,
    /** @const {number} Maximum number of (UTF8) bytes in a Firebase path. */
    MAX_PATH_LENGTH_BYTES: 768
  },

  /** @param {string} child */
  push: function(child) {
    // Count the needed '/'
    if (this.parts_.length > 0) {
      this.byteLength_ += 1;
    }
    this.parts_.push(child);
    this.byteLength_ += fb.util.utf8.stringLength(child);
    this.checkValid_();
  },

  pop: function() {
    var last = this.parts_.pop();
    this.byteLength_ -= fb.util.utf8.stringLength(last);
    // Un-count the previous '/'
    if (this.parts_.length > 0) {
      this.byteLength_ -= 1;
    }
  },

  checkValid_: function() {
    if (this.byteLength_ > fb.core.util.ValidationPath.MAX_PATH_LENGTH_BYTES) {
      throw new Error(this.errorPrefix_ + 'has a key path longer than ' +
                      fb.core.util.ValidationPath.MAX_PATH_LENGTH_BYTES + ' bytes (' +
                      this.byteLength_ + ').');
    }
    if (this.parts_.length > fb.core.util.ValidationPath.MAX_PATH_DEPTH) {
      throw new Error(this.errorPrefix_ + 'path specified exceeds the maximum depth that can be written (' +
                      fb.core.util.ValidationPath.MAX_PATH_DEPTH +
                      ') or object contains a cycle ' + this.toErrorString());
    }
  },

  /**
   * String for use in error messages - uses '.' notation for path.
   *
   * @return {string}
   */
  toErrorString: function() {
    if (this.parts_.length == 0) {
      return '';
    }
    return 'in property \'' + this.parts_.join('.') + '\'';
  }

}); // end fb.core.util.validation.ValidationPath
