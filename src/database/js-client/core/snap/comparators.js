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
goog.provide('fb.core.snap.comparators');

fb.core.snap.NAME_ONLY_COMPARATOR = function(left, right) {
  return fb.core.util.nameCompare(left.name, right.name);
};

fb.core.snap.NAME_COMPARATOR = function(left, right) {
  return fb.core.util.nameCompare(left, right);
};
