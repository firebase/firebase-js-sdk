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

import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { assert } from '../../../src/util/assert';
import { addEqualityMatcher } from '../../util/equality_matcher';

import { SpecBuilder } from './spec_builder';
import { SpecStep } from './spec_test_runner';

// Disables all other tests; useful for debugging. Multiple tests can have
// this tag and they'll all be run (but all others won't).
const EXCLUSIVE_TAG = 'exclusive';
// Persistence-related tests.
const PERSISTENCE_TAG = 'persistence';
// Explicit per-platform disable flags.
const NO_WEB_TAG = 'no-web';
const NO_ANDROID_TAG = 'no-android';
const NO_IOS_TAG = 'no-ios';
const NO_LRU = 'no-lru';
const KNOWN_TAGS = [
  EXCLUSIVE_TAG,
  PERSISTENCE_TAG,
  NO_WEB_TAG,
  NO_ANDROID_TAG,
  NO_IOS_TAG,
  NO_LRU
];

const WEB_SPEC_TEST_FILTER = (tags: string[]) =>
  tags.indexOf(NO_WEB_TAG) === -1;

// The format of one describeSpec written to a JSON file.
interface SpecOutputFormat {
  describeName: string;
  itName: string;
  tags: string[];
  comment?: string;
  steps: SpecStep[];
}

// The name of the describeSpec that's currently running.
let describeName = '';

// Tags for the describeSpec that's current running.
let describeTags: string[] = [];

// A map of string name -> spec json for every `it` in this `describe`.
let specsInThisTest: { [name: string]: SpecOutputFormat };

// A function to write the specs with, if set.
let writeJSONFile: ((json: string) => void) | null = null;

/**
 * If you call this function before your describeSpec, then the spec test will
 * be written using the given function instead of running as a normal test.
 */
export function setSpecJSONHandler(writer: (json: string) => void): void {
  writeJSONFile = writer;
}

/**
 * Like it(), but for spec tests.
 * @param name A name to give the test.
 * @param tags Tags to apply to the test (e.g. 'exclusive' to only run
 *             individual tests)
 * @param builder A function that returns a spec.
 * If writeToJSONFile has been called, the spec will be stored in
 * `specsInThisTest`. Otherwise, it will be run, just as it() would run it.
 */
export function specTest(
  name: string,
  tags: string[],
  builder: () => SpecBuilder
): void;
export function specTest(
  name: string,
  tags: string[],
  comment: string,
  builder: () => SpecBuilder
): void;
export function specTest(
  name: string,
  tags: string[],
  commentOrBuilder: string | (() => SpecBuilder),
  maybeBuilder?: () => SpecBuilder
): void {
  let comment: string | undefined;
  let builder: () => SpecBuilder;
  if (typeof commentOrBuilder === 'string') {
    comment = commentOrBuilder;
    builder = maybeBuilder;
  } else {
    builder = commentOrBuilder;
  }
  assert(!!builder, 'Missing spec builder');
  // Union in the tags for the describeSpec().
  tags = tags.concat(describeTags);
  for (const tag of tags) {
    assert(
      KNOWN_TAGS.indexOf(tag) >= 0,
      'Unknown tag "' + tag + '" on test: ' + name
    );
  }

  if (!writeJSONFile) {
    const persistenceModes = IndexedDbPersistence.isAvailable()
      ? [true, false]
      : [false];
    for (const usePersistence of persistenceModes) {
      const spec = builder();
      let runner: Function;
      if (tags.indexOf(EXCLUSIVE_TAG) >= 0) {
        runner = it.only;
      } else if (!WEB_SPEC_TEST_FILTER(tags)) {
        runner = it.skip;
      } else if (usePersistence && tags.indexOf('no-lru') !== -1) {
        // spec should have a comment explaining why it is being skipped.
        runner = it.skip;
      } else {
        runner = it;
      }
      const mode = usePersistence ? '(Persistence)' : '(Memory)';
      const fullName = `${mode} ${name}`;
      runner(fullName, () => {
        return spec.runAsTest(fullName, usePersistence);
      });
    }
    return;
  }

  const spec = builder();

  const specJSON = spec.toJSON();

  const json = {
    describeName,
    itName: name,
    tags,
    comment,
    config: specJSON.config,
    steps: specJSON.steps
  };

  if (name in specsInThisTest) {
    throw new Error('duplicate spec test: "' + name + '"');
  }
  specsInThisTest[name] = json;
}

/**
 * Like describe, but for spec tests.
 * @param name A name to give the test.
 * @param tags Tags to apply to all tests in the spec (e.g. 'exclusive' to
 *             only run individual tests)
 * @param builder A function that calls specTest for each test case.
 * If writeToJSONFile has been called, the specs will be stored in
 * that file. Otherwise, they will be run, just as describe would run.
 */
export function describeSpec(
  name: string,
  tags: string[],
  builder: () => void
): void {
  describeTags = tags;
  describeName = name;

  if (!writeJSONFile) {
    describe(name, () => {
      addEqualityMatcher();
      return builder();
    });
  } else {
    specsInThisTest = {};
    builder();
    const output = JSON.stringify(specsInThisTest, null, 2);
    writeJSONFile(output);
  }
}
