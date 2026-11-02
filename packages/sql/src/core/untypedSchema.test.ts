/**
 * @license
 * Copyright 2026 Google LLC
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

import type {
  PostgrestClient,
  PostgrestClientOptions
} from '@supabase/postgrest-js';
import { describe, expect, it } from 'vitest';

import type {
  UntypedClientOptions,
  UntypedDatabase,
  UntypedSchema
} from './untypedSchema';

// Compile-time assignability assertions
type Assert<T extends true> = T;
type IsAssignable<Sub, Super> = [Sub] extends [Super] ? true : false;

// Verify UntypedClientOptions satisfies PostgREST client options
type _ClientOptionsAssignable = Assert<
  IsAssignable<UntypedClientOptions, PostgrestClientOptions>
>;

// Verify UntypedDatabase, UntypedClientOptions, string, UntypedSchema
// satisfy the generic constraints of PostgrestClient
type _PostgrestClientGenericsValid = Assert<
  IsAssignable<
    PostgrestClient<
      UntypedDatabase,
      UntypedClientOptions,
      string,
      UntypedSchema
    >,
    object
  >
>;

describe('untypedSchema PostgREST assignability', () => {
  it('satisfies PostgREST compile-time type assignability constraints', () => {
    expect(true).toBe(true);
  });
});
