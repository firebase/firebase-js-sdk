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

import { FirebaseError } from '@firebase/util';
import { expect } from 'vitest';

import {
  FirebaseSqlErrorCategory,
  Code,
  FirebaseSqlError,
  SerializedFirebaseSqlError
} from './error';

describe('FirebaseSqlError', () => {
  it('satisfies instanceof hierarchy for FirebaseSqlError, FirebaseError, and Error', () => {
    const error = new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'Invalid parameter value.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );

    expect(error).toBeInstanceOf(FirebaseSqlError);
    expect(error).toBeInstanceOf(FirebaseError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('FirebaseSqlError');
  });

  it('formats toString() with optional details and hint', () => {
    const basicError = new FirebaseSqlError(
      Code.UNAUTHORIZED,
      'Missing auth token',
      FirebaseSqlErrorCategory.SQL_PLATFORM
    );
    expect(basicError.toString()).toBe(
      'FirebaseSqlError[code=unauthorized]: Missing auth token'
    );

    const detailedError = new FirebaseSqlError(
      '23505',
      'duplicate key value violates unique constraint',
      FirebaseSqlErrorCategory.SQL_POSTGREST,
      'Key (id)=(1) already exists.',
      'Supply a unique primary key.',
      409
    );
    expect(detailedError.toString()).toBe(
      'FirebaseSqlError[code=23505]: duplicate key value violates unique constraint (details: Key (id)=(1) already exists.) (hint: Supply a unique primary key.)'
    );
  });

  it('serializes cleanly via toJSON(), and JSON.stringify() and supports round-trip re-instantiation', () => {
    const minimalError = new FirebaseSqlError(
      Code.NOT_INITIALIZED,
      'Service not initialized',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
    const minimalJson = minimalError.toJSON();

    expect(minimalJson).toEqual({
      name: 'FirebaseSqlError',
      code: 'not-initialized',
      message: 'Service not initialized',
      category: 'sql-client'
    });
    expect(minimalError.toJSON()).toEqual(minimalJson);
    expect('details' in minimalJson).toBe(false);
    expect('hint' in minimalJson).toBe(false);
    expect('status' in minimalJson).toBe(false);
    expect(JSON.parse(JSON.stringify(minimalError))).toEqual(minimalJson);

    const fullError = new FirebaseSqlError(
      'PGRST204',
      'Column not found in schema cache',
      FirebaseSqlErrorCategory.SQL_POSTGREST,
      'Could not find the column in the schema cache',
      'Reload schema cache',
      400
    );
    const parsed: SerializedFirebaseSqlError = JSON.parse(
      JSON.stringify(fullError)
    );
    expect(parsed).toEqual({
      name: 'FirebaseSqlError',
      code: 'PGRST204',
      message: 'Column not found in schema cache',
      category: 'sql-postgrest',
      details: 'Could not find the column in the schema cache',
      hint: 'Reload schema cache',
      status: 400
    });
    expect(fullError.toJSON()).toEqual(parsed);

    const roundTripped = new FirebaseSqlError(
      parsed.code,
      parsed.message,
      parsed.category,
      parsed.details,
      parsed.hint,
      parsed.status
    );
    expect(roundTripped).toBeInstanceOf(FirebaseSqlError);
    expect(roundTripped).toBeInstanceOf(FirebaseError);
    expect(roundTripped).toBeInstanceOf(Error);
    expect(roundTripped.toJSON()).toEqual(fullError.toJSON());
  });
});
