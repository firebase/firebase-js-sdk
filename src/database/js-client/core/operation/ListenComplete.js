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
goog.provide('fb.core.operation.ListenComplete');

/**
 * @param {!fb.core.OperationSource} source
 * @param {!fb.core.util.Path} path
 * @constructor
 * @implements {fb.core.Operation}
 */
fb.core.operation.ListenComplete = function(source, path) {
  /** @inheritDoc */
  this.type = fb.core.OperationType.LISTEN_COMPLETE;

  /** @inheritDoc */
  this.source = source;

  /** @inheritDoc */
  this.path = path;
};

/**
 * @inheritDoc
 */
fb.core.operation.ListenComplete.prototype.operationForChild = function(childName) {
  if (this.path.isEmpty()) {
    return new fb.core.operation.ListenComplete(this.source, fb.core.util.Path.Empty);
  } else {
    return new fb.core.operation.ListenComplete(this.source, this.path.popFront());
  }
};

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.operation.ListenComplete.prototype.toString = function() {
    return 'Operation(' + this.path + ': ' + this.source.toString() + ' listen_complete)';
  };
}
