/**
 * @license
 * Copyright 2017 Google LLC
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

import { assert } from '@firebase/util';

import {
  tryParseInt,
  MAX_NAME,
  MIN_NAME,
  INTEGER_32_MIN,
  INTEGER_32_MAX
} from '../util/util';

// Modeled after base64 web-safe chars, but ordered by ASCII.
const PUSH_CHARS =
  '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

const MIN_PUSH_CHAR = '-';

const MAX_PUSH_CHAR = 'z';

const MAX_KEY_LEN = 786;

/**
 * Fancy ID generator that creates 20-character string identifiers with the
 * following properties:
 *
 * 1. They're based on timestamp so that they sort *after* any existing ids.
 * 2. They contain 72-bits of random data after the timestamp so that IDs won't
 *    collide with other clients' IDs.
 * 3. They sort *lexicographically* (so the timestamp is converted to characters
 *    that will sort properly).
 * 4. They're monotonically increasing. Even if you generate more than one in
 *    the same timestamp, the latter ones will sort after the former ones. We do
 *    this by using the previous random bits but "incrementing" them by 1 (only
 *    in the case of a timestamp collision).
 */
export const nextPushId = (function () {
  // Timestamp of last push, used to prevent local collisions if you push twice
  // in one ms.
  let lastPushTime = 0;

  // We generate 72-bits of randomness which get turned into 12 characters and
  // appended to the timestamp to prevent collisions with other clients. We
  // store the last characters we generated because in the event of a collision,
  // we'll use those same characters except "incremented" by one.
  const lastRandChars: number[] = [];

  return function (now: number) {
    const duplicateTime = now === lastPushTime;
    lastPushTime = now;

    let i;
    const timeStampChars = new Array(8);
    for (i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
      // NOTE: Can't use << here because javascript will convert to int and lose
      // the upper bits.
      now = Math.floor(now / 64);
    }
    assert(now === 0, 'Cannot push at time == 0');

    let id = timeStampChars.join('');

    if (!duplicateTime) {
      for (i = 0; i < 12; i++) {
        lastRandChars[i] = Math.floor(Math.random() * 64);
      }
    } else {
      // If the timestamp hasn't changed since last push, use the same random
      // number, except incremented by 1.
      for (i = 11; i >= 0 && lastRandChars[i] === 63; i--) {
        lastRandChars[i] = 0;
      }
      lastRandChars[i]++;
    }
    for (i = 0; i < 12; i++) {
      id += PUSH_CHARS.charAt(lastRandChars[i]);
    }
    assert(id.length === 20, 'nextPushId: Length should be 20.');

    return id;
  };
})();

export const successor = function (key: string) {
  if (key === '' + INTEGER_32_MAX) {
    // See https://firebase.google.com/docs/database/web/lists-of-data#data-order
    return MIN_PUSH_CHAR;
  }
  const keyAsInt: number = tryParseInt(key);
  if (keyAsInt != null) {
    return '' + (keyAsInt + 1);
  }
  const next = new Array(key.length);

  for (let i = 0; i < next.length; i++) {
    next[i] = key.charAt(i);
  }

  if (next.length < MAX_KEY_LEN) {
    next.push(MIN_PUSH_CHAR);
    return next.join('');
  }

  let i = next.length - 1;

  while (i >= 0 && next[i] === MAX_PUSH_CHAR) {
    i--;
  }

  // `successor` was called on the largest possible key, so return the
  // MAX_NAME, which sorts larger than all keys.
  if (i === -1) {
    return MAX_NAME;
  }

  const source = next[i];
  const sourcePlusOne = PUSH_CHARS.charAt(PUSH_CHARS.indexOf(source) + 1);
  next[i] = sourcePlusOne;

  return next.slice(0, i + 1).join('');
};

// `key` is assumed to be non-empty.
export const predecessor = function (key: string) {
  if (key === '' + INTEGER_32_MIN) {
    return MIN_NAME;
  }
  const keyAsInt: number = tryParseInt(key);
  if (keyAsInt != null) {
    return '' + (keyAsInt - 1);
  }
  const next = new Array(key.length);
  for (let i = 0; i < next.length; i++) {
    next[i] = key.charAt(i);
  }
  // If `key` ends in `MIN_PUSH_CHAR`, the largest key lexicographically
  // smaller than `key`, is `key[0:key.length - 1]`. The next key smaller
  // than that, `predecessor(predecessor(key))`, is
  //
  // `key[0:key.length - 2] + (key[key.length - 1] - 1) + \
  //   { MAX_PUSH_CHAR repeated MAX_KEY_LEN - (key.length - 1) times }
  //
  // analogous to increment/decrement for base-10 integers.
  //
  // This works because lexigographic comparison works character-by-character,
  // using length as a tie-breaker if one key is a prefix of the other.
  if (next[next.length - 1] === MIN_PUSH_CHAR) {
    if (next.length === 1) {
      // See https://firebase.google.com/docs/database/web/lists-of-data#orderbykey
      return '' + INTEGER_32_MAX;
    }
    delete next[next.length - 1];
    return next.join('');
  }
  // Replace the last character with it's immediate predecessor, and
  // fill the suffix of the key with MAX_PUSH_CHAR. This is the
  // lexicographically largest possible key smaller than `key`.
  next[next.length - 1] = PUSH_CHARS.charAt(
    PUSH_CHARS.indexOf(next[next.length - 1]) - 1
  );
  return next.join('') + MAX_PUSH_CHAR.repeat(MAX_KEY_LEN - next.length);
};
