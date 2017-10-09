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

// Imports firebase via the raw sources and re-exports it.
// This file exists so that the "<repo-root>/integration/firestore" test suite
// can replace this file reference with a reference to the minified sources
// instead.

import firebase from '@firebase/app';
import '../../../index';

// TODO(b/66917182): This "as any" removes all of our type-checking in tests and
// is therefore pretty bad. But I can't figure out how to avoid it right now.
export default firebase as any;
