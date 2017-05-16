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
goog.provide('fb.core.operation.Overwrite');

/**
 * @param {!fb.core.OperationSource} source
 * @param {!fb.core.util.Path} path
 * @param {!fb.core.snap.Node} snap
 * @constructor
 * @implements {fb.core.Operation}
 */
fb.core.operation.Overwrite = function(source, path, snap) {
  /** @inheritDoc */
  this.type = fb.core.OperationType.OVERWRITE;

  /** @inheritDoc */
  this.source = source;

  /** @inheritDoc */
  this.path = path;

  /**
   * @type {!fb.core.snap.Node}
   */
  this.snap = snap;
};

/**
 * @inheritDoc
 */
fb.core.operation.Overwrite.prototype.operationForChild = function(childName) {
  if (this.path.isEmpty()) {
    return new fb.core.operation.Overwrite(this.source, fb.core.util.Path.Empty,
        this.snap.getImmediateChild(childName));
  } else {
    return new fb.core.operation.Overwrite(this.source, this.path.popFront(), this.snap);
  }
};

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.operation.Overwrite.prototype.toString = function() {
    return 'Operation(' + this.path + ': ' + this.source.toString() + ' overwrite: ' + this.snap.toString() + ')';
  };
}
