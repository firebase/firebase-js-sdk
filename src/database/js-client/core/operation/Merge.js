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
goog.provide('fb.core.operation.Merge');
goog.require('fb.core.util');

/**
 * @param {!fb.core.OperationSource} source
 * @param {!fb.core.util.Path} path
 * @param {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>} children
 * @constructor
 * @implements {fb.core.Operation}
 */
fb.core.operation.Merge = function(source, path, children) {
  /** @inheritDoc */
  this.type = fb.core.OperationType.MERGE;

  /** @inheritDoc */
  this.source = source;

  /** @inheritDoc */
  this.path = path;

  /**
   * @type {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>}
   */
  this.children = children;
};

/**
 * @inheritDoc
 */
fb.core.operation.Merge.prototype.operationForChild = function(childName) {
  if (this.path.isEmpty()) {
    var childTree = this.children.subtree(new fb.core.util.Path(childName));
    if (childTree.isEmpty()) {
      // This child is unaffected
      return null;
    } else if (childTree.value) {
      // We have a snapshot for the child in question.  This becomes an overwrite of the child.
      return new fb.core.operation.Overwrite(this.source, fb.core.util.Path.Empty, childTree.value);
    } else {
      // This is a merge at a deeper level
      return new fb.core.operation.Merge(this.source, fb.core.util.Path.Empty, childTree);
    }
  } else {
    fb.core.util.assert(this.path.getFront() === childName,
                        'Can\'t get a merge for a child not on the path of the operation');
    return new fb.core.operation.Merge(this.source, this.path.popFront(), this.children);
  }
};

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.operation.Merge.prototype.toString = function() {
    return 'Operation(' + this.path + ': ' + this.source.toString() + ' merge: ' + this.children.toString() + ')';
  };
}
