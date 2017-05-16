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
goog.provide('fb.core.stats.StatsManager');
goog.require('fb.core.stats.StatsCollection');
goog.require('fb.core.stats.StatsListener');
goog.require('fb.core.stats.StatsReporter');

fb.core.stats.StatsManager = { };

fb.core.stats.StatsManager.collections_ = { };
fb.core.stats.StatsManager.reporters_ = { };

fb.core.stats.StatsManager.getCollection = function(repoInfo) {
  var hashString = repoInfo.toString();
  if (!fb.core.stats.StatsManager.collections_[hashString]) {
    fb.core.stats.StatsManager.collections_[hashString] = new fb.core.stats.StatsCollection();
  }
  return fb.core.stats.StatsManager.collections_[hashString];
};

fb.core.stats.StatsManager.getOrCreateReporter = function(repoInfo, creatorFunction) {
  var hashString = repoInfo.toString();
  if (!fb.core.stats.StatsManager.reporters_[hashString]) {
    fb.core.stats.StatsManager.reporters_[hashString] = creatorFunction();
  }

  return fb.core.stats.StatsManager.reporters_[hashString];
};
