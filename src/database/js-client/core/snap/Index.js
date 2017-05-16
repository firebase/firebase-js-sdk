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
goog.provide('fb.core.snap.Index');
goog.provide('fb.core.snap.KeyIndex');
goog.provide('fb.core.snap.PathIndex');
goog.provide('fb.core.snap.PriorityIndex');
goog.provide('fb.core.snap.ValueIndex');
goog.require('fb.core.util');



/**
 *
 * @constructor
 */
fb.core.snap.Index = function() { };


/**
 * @typedef {!Object}
 */
fb.core.snap.Index.FallbackType;


/**
 * @type {fb.core.snap.Index.FallbackType}
 */
fb.core.snap.Index.Fallback = {};


/**
 * @param {!fb.core.snap.NamedNode} a
 * @param {!fb.core.snap.NamedNode} b
 * @return {number}
 */
fb.core.snap.Index.prototype.compare = goog.abstractMethod;


/**
 * @param {!fb.core.snap.Node} node
 * @return {boolean}
 */
fb.core.snap.Index.prototype.isDefinedOn = goog.abstractMethod;


/**
 * @return {function(!fb.core.snap.NamedNode, !fb.core.snap.NamedNode):number} A standalone comparison function for
 * this index
 */
fb.core.snap.Index.prototype.getCompare = function() {
  return goog.bind(this.compare, this);
};


/**
 * Given a before and after value for a node, determine if the indexed value has changed. Even if they are different,
 * it's possible that the changes are isolated to parts of the snapshot that are not indexed.
 *
 * @param {!fb.core.snap.Node} oldNode
 * @param {!fb.core.snap.Node} newNode
 * @return {boolean} True if the portion of the snapshot being indexed changed between oldNode and newNode
 */
fb.core.snap.Index.prototype.indexedValueChanged = function(oldNode, newNode) {
  var oldWrapped = new fb.core.snap.NamedNode(fb.core.util.MIN_NAME, oldNode);
  var newWrapped = new fb.core.snap.NamedNode(fb.core.util.MIN_NAME, newNode);
  return this.compare(oldWrapped, newWrapped) !== 0;
};


/**
 * @return {!fb.core.snap.NamedNode} a node wrapper that will sort equal to or less than
 * any other node wrapper, using this index
 */
fb.core.snap.Index.prototype.minPost = function() {
  return fb.core.snap.NamedNode.MIN;
};


/**
 * @return {!fb.core.snap.NamedNode} a node wrapper that will sort greater than or equal to
 * any other node wrapper, using this index
 */
fb.core.snap.Index.prototype.maxPost = goog.abstractMethod;


/**
 * @param {*} indexValue
 * @param {string} name
 * @return {!fb.core.snap.NamedNode}
 */
fb.core.snap.Index.prototype.makePost = goog.abstractMethod;


/**
 * @return {!string} String representation for inclusion in a query spec
 */
fb.core.snap.Index.prototype.toString = goog.abstractMethod;



/**
 * @param {!fb.core.util.Path} indexPath
 * @constructor
 * @extends {fb.core.snap.Index}
 */
fb.core.snap.PathIndex = function(indexPath) {
  fb.core.snap.Index.call(this);

  fb.core.util.assert(!indexPath.isEmpty() && indexPath.getFront() !== '.priority',
      'Can\'t create PathIndex with empty path or .priority key');
  /**
   *
   * @type {!fb.core.util.Path}
   * @private
   */
  this.indexPath_ = indexPath;
};
goog.inherits(fb.core.snap.PathIndex, fb.core.snap.Index);


/**
 * @param {!fb.core.snap.Node} snap
 * @return {!fb.core.snap.Node}
 * @protected
 */
fb.core.snap.PathIndex.prototype.extractChild = function(snap) {
  return snap.getChild(this.indexPath_);
};


/**
 * @inheritDoc
 */
fb.core.snap.PathIndex.prototype.isDefinedOn = function(node) {
  return !node.getChild(this.indexPath_).isEmpty();
};


/**
 * @inheritDoc
 */
fb.core.snap.PathIndex.prototype.compare = function(a, b) {
  var aChild = this.extractChild(a.node);
  var bChild = this.extractChild(b.node);
  var indexCmp = aChild.compareTo(bChild);
  if (indexCmp === 0) {
    return fb.core.util.nameCompare(a.name, b.name);
  } else {
    return indexCmp;
  }
};


/**
 * @inheritDoc
 */
fb.core.snap.PathIndex.prototype.makePost = function(indexValue, name) {
  var valueNode = fb.core.snap.NodeFromJSON(indexValue);
  var node = fb.core.snap.EMPTY_NODE.updateChild(this.indexPath_, valueNode);
  return new fb.core.snap.NamedNode(name, node);
};


/**
 * @inheritDoc
 */
fb.core.snap.PathIndex.prototype.maxPost = function() {
  var node = fb.core.snap.EMPTY_NODE.updateChild(this.indexPath_, fb.core.snap.MAX_NODE);
  return new fb.core.snap.NamedNode(fb.core.util.MAX_NAME, node);
};


/**
 * @inheritDoc
 */
fb.core.snap.PathIndex.prototype.toString = function() {
  return this.indexPath_.slice().join('/');
};



/**
 * @constructor
 * @extends {fb.core.snap.Index}
 * @private
 */
fb.core.snap.PriorityIndex_ = function() {
  fb.core.snap.Index.call(this);
};
goog.inherits(fb.core.snap.PriorityIndex_, fb.core.snap.Index);


/**
 * @inheritDoc
 */
fb.core.snap.PriorityIndex_.prototype.compare = function(a, b) {
  var aPriority = a.node.getPriority();
  var bPriority = b.node.getPriority();
  var indexCmp = aPriority.compareTo(bPriority);
  if (indexCmp === 0) {
    return fb.core.util.nameCompare(a.name, b.name);
  } else {
    return indexCmp;
  }
};


/**
 * @inheritDoc
 */
fb.core.snap.PriorityIndex_.prototype.isDefinedOn = function(node) {
  return !node.getPriority().isEmpty();
};


/**
 * @inheritDoc
 */
fb.core.snap.PriorityIndex_.prototype.indexedValueChanged = function(oldNode, newNode) {
  return !oldNode.getPriority().equals(newNode.getPriority());
};


/**
 * @inheritDoc
 */
fb.core.snap.PriorityIndex_.prototype.minPost = function() {
  return fb.core.snap.NamedNode.MIN;
};


/**
 * @inheritDoc
 */
fb.core.snap.PriorityIndex_.prototype.maxPost = function() {
  return new fb.core.snap.NamedNode(fb.core.util.MAX_NAME,
      new fb.core.snap.LeafNode('[PRIORITY-POST]', fb.core.snap.MAX_NODE));
};


/**
 * @param {*} indexValue
 * @param {string} name
 * @return {!fb.core.snap.NamedNode}
 */
fb.core.snap.PriorityIndex_.prototype.makePost = function(indexValue, name) {
  var priorityNode = fb.core.snap.NodeFromJSON(indexValue);
  return new fb.core.snap.NamedNode(name, new fb.core.snap.LeafNode('[PRIORITY-POST]', priorityNode));
};


/**
 * @return {!string} String representation for inclusion in a query spec
 */
fb.core.snap.PriorityIndex_.prototype.toString = function() {
  return '.priority';
};


/**
 * @type {!fb.core.snap.Index}
 */
fb.core.snap.PriorityIndex = new fb.core.snap.PriorityIndex_();



/**
 * @constructor
 * @extends {fb.core.snap.Index}
 * @private
 */
fb.core.snap.KeyIndex_ = function() {
  fb.core.snap.Index.call(this);
};
goog.inherits(fb.core.snap.KeyIndex_, fb.core.snap.Index);


/**
 * @inheritDoc
 */
fb.core.snap.KeyIndex_.prototype.compare = function(a, b) {
  return fb.core.util.nameCompare(a.name, b.name);
};


/**
 * @inheritDoc
 */
fb.core.snap.KeyIndex_.prototype.isDefinedOn = function(node) {
  // We could probably return true here (since every node has a key), but it's never called
  // so just leaving unimplemented for now.
  throw fb.core.util.assertionError('KeyIndex.isDefinedOn not expected to be called.');
};


/**
 * @inheritDoc
 */
fb.core.snap.KeyIndex_.prototype.indexedValueChanged = function(oldNode, newNode) {
  return false; // The key for a node never changes.
};


/**
 * @inheritDoc
 */
fb.core.snap.KeyIndex_.prototype.minPost = function() {
  return fb.core.snap.NamedNode.MIN;
};


/**
 * @inheritDoc
 */
fb.core.snap.KeyIndex_.prototype.maxPost = function() {
  // TODO: This should really be created once and cached in a static property, but
  // NamedNode isn't defined yet, so I can't use it in a static.  Bleh.
  return new fb.core.snap.NamedNode(fb.core.util.MAX_NAME, fb.core.snap.EMPTY_NODE);
};


/**
 * @param {*} indexValue
 * @param {string} name
 * @return {!fb.core.snap.NamedNode}
 */
fb.core.snap.KeyIndex_.prototype.makePost = function(indexValue, name) {
  fb.core.util.assert(goog.isString(indexValue), 'KeyIndex indexValue must always be a string.');
  // We just use empty node, but it'll never be compared, since our comparator only looks at name.
  return new fb.core.snap.NamedNode(/** @type {!string} */ (indexValue), fb.core.snap.EMPTY_NODE);
};


/**
 * @return {!string} String representation for inclusion in a query spec
 */
fb.core.snap.KeyIndex_.prototype.toString = function() {
  return '.key';
};


/**
 * KeyIndex singleton.
 *
 * @type {!fb.core.snap.Index}
 */
fb.core.snap.KeyIndex = new fb.core.snap.KeyIndex_();



/**
 * @constructor
 * @extends {fb.core.snap.Index}
 * @private
 */
fb.core.snap.ValueIndex_ = function() {
  fb.core.snap.Index.call(this);
};
goog.inherits(fb.core.snap.ValueIndex_, fb.core.snap.Index);


/**
 * @inheritDoc
 */
fb.core.snap.ValueIndex_.prototype.compare = function(a, b) {
  var indexCmp = a.node.compareTo(b.node);
  if (indexCmp === 0) {
    return fb.core.util.nameCompare(a.name, b.name);
  } else {
    return indexCmp;
  }
};


/**
 * @inheritDoc
 */
fb.core.snap.ValueIndex_.prototype.isDefinedOn = function(node) {
  return true;
};


/**
 * @inheritDoc
 */
fb.core.snap.ValueIndex_.prototype.indexedValueChanged = function(oldNode, newNode) {
  return !oldNode.equals(newNode);
};


/**
 * @inheritDoc
 */
fb.core.snap.ValueIndex_.prototype.minPost = function() {
  return fb.core.snap.NamedNode.MIN;
};


/**
 * @inheritDoc
 */
fb.core.snap.ValueIndex_.prototype.maxPost = function() {
  return fb.core.snap.NamedNode.MAX;
};


/**
 * @param {*} indexValue
 * @param {string} name
 * @return {!fb.core.snap.NamedNode}
 */
fb.core.snap.ValueIndex_.prototype.makePost = function(indexValue, name) {
  var valueNode = fb.core.snap.NodeFromJSON(indexValue);
  return new fb.core.snap.NamedNode(name, valueNode);
};


/**
 * @return {!string} String representation for inclusion in a query spec
 */
fb.core.snap.ValueIndex_.prototype.toString = function() {
  return '.value';
};


/**
 * ValueIndex singleton.
 *
 * @type {!fb.core.snap.Index}
 */
fb.core.snap.ValueIndex = new fb.core.snap.ValueIndex_();
