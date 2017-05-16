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
goog.provide('fb.core.stats.StatsListener');

/**
 * Returns the delta from the previous call to get stats.
 *
 * @param collection The collection to "listen" to.
 * @constructor
 */
fb.core.stats.StatsListener = function(collection) {
  this.collection_ = collection;
  this.last_ = null;
};

fb.core.stats.StatsListener.prototype.get = function() {
  var newStats = this.collection_.get();

  var delta = goog.object.clone(newStats);
  if (this.last_) {
    for (var stat in this.last_) {
      delta[stat] = delta[stat] - this.last_[stat];
    }
  }
  this.last_ = newStats;

  return delta;
};
