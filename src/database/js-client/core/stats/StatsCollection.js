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
goog.provide('fb.core.stats.StatsCollection');
goog.require('fb.util.obj');
goog.require('goog.array');
goog.require('goog.object');

/**
 * Tracks a collection of stats.
 *
 * @constructor
 */
fb.core.stats.StatsCollection = function() {
  this.counters_ = { };
};

fb.core.stats.StatsCollection.prototype.incrementCounter = function(name, amount) {
  if (!goog.isDef(amount))
    amount = 1;

  if (!fb.util.obj.contains(this.counters_, name))
    this.counters_[name] = 0;

  this.counters_[name] += amount;
};

fb.core.stats.StatsCollection.prototype.get = function() {
  return goog.object.clone(this.counters_);
};
