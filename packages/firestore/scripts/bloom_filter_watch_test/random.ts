/**
 * @license
 * Copyright 2023 Google LLC
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

import {Alea} from "./alea";

const RANDOM_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class AleaRandom {

  private readonly alea: Alea;

  constructor(seed: any) {
    this.alea = new Alea(seed);
  }

  /** Returns a random 20-character alphanumeric ID. */
  randomId(): string {
    let result = '';
    for (let i=0; i<20; i++) {
      const charIndex = Math.floor(this.next() * RANDOM_ID_ALPHABET.length);
      result += RANDOM_ID_ALPHABET[charIndex];
    }
    return result;
  }

  /** Returns random 20-character alphanumeric ID. */
  randomIds(count: number): Array<string> {
    const results: Array<string> = [];
    for (let i=0; i<count; i++) {
      results.push(this.randomId());
    }
    return results;
  }

  /** Returns a random real number between 0 and 1. */
  private next(): number {
    return this.alea.next();
  }

}
