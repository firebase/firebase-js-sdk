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

import { describe, expect, it } from 'vitest';

import { Code, FirebaseSqlError, FirebaseSqlErrorCategory } from './error';
import { mapPostgrestFailureToFirebaseSqlError } from './errorMapper';

describe('mapPostgrestFailureToFirebaseSqlError', () => {
  it('returns an existing FirebaseSqlError instance unchanged', () => {
    const existing = new FirebaseSqlError(
      Code.NOT_INITIALIZED,
      'Already terminated',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
    expect(mapPostgrestFailureToFirebaseSqlError(existing, 0, '')).toBe(
      existing
    );
  });

  describe('client / network / abort errors (status === 0)', () => {
    it('maps PostgrestBuilder network failure (status 0) to SQL_CLIENT Code.OTHER without status', () => {
      const mapped = mapPostgrestFailureToFirebaseSqlError(
        {
          message: 'TypeError: fetch failed',
          details: 'TypeError: fetch failed\n\nCaused by: Error: ENOTFOUND',
          hint: '',
          code: ''
        },
        0,
        ''
      );

      expect(mapped).toBeInstanceOf(FirebaseSqlError);
      expect(mapped.code).toBe(Code.OTHER);
      expect(mapped.category).toBe(FirebaseSqlErrorCategory.SQL_CLIENT);
      expect(mapped.message).toBe('TypeError: fetch failed');
      expect(mapped.details).toContain('Caused by: Error: ENOTFOUND');
      expect(mapped.hint).toBeUndefined();
      expect(mapped.status).toBeUndefined();
    });

    it('preserves AbortError hint on status 0 and handles missing rawError fields', () => {
      const aborted = mapPostgrestFailureToFirebaseSqlError(
        {
          message: 'AbortError: The operation was aborted',
          details: '',
          hint: 'Request was aborted (timeout or manual cancellation)',
          code: ''
        },
        0,
        ''
      );

      expect(aborted.code).toBe(Code.OTHER);
      expect(aborted.category).toBe(FirebaseSqlErrorCategory.SQL_CLIENT);
      expect(aborted.details).toBeUndefined();
      expect(aborted.hint).toBe(
        'Request was aborted (timeout or manual cancellation)'
      );
      expect(aborted.status).toBeUndefined();

      const empty = mapPostgrestFailureToFirebaseSqlError(null, 0, '');
      expect(empty.code).toBe(Code.OTHER);
      expect(empty.category).toBe(FirebaseSqlErrorCategory.SQL_CLIENT);
      expect(empty.message).toBe('Network request failed.');
      expect(empty.status).toBeUndefined();
    });
  });

  describe('Google OnePlatform nested error envelopes (SQL_PLATFORM)', () => {
    it('unwraps 401 UNAUTHENTICATED and 403 PERMISSION_DENIED to Code.UNAUTHORIZED', () => {
      const unauth = mapPostgrestFailureToFirebaseSqlError(
        {
          error: {
            code: 401,
            message: 'Firebase App Check token is invalid.',
            status: 'UNAUTHENTICATED'
          }
        },
        401,
        'Unauthorized'
      );

      expect(unauth.code).toBe(Code.UNAUTHORIZED);
      expect(unauth.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(unauth.message).toBe('Firebase App Check token is invalid.');
      expect(unauth.details).toBeUndefined();
      expect(unauth.hint).toBeUndefined();
      expect(unauth.status).toBe(401);

      const permDenied = mapPostgrestFailureToFirebaseSqlError(
        {
          error: {
            code: 403,
            message: 'Permission denied on resource.',
            status: 'PERMISSION_DENIED'
          }
        },
        403,
        'Forbidden'
      );

      expect(permDenied.code).toBe(Code.UNAUTHORIZED);
      expect(permDenied.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(permDenied.status).toBe(403);
    });

    it('maps 400 INVALID_ARGUMENT / FAILED_PRECONDITION to Code.INVALID_ARGUMENT and stringifies array details', () => {
      const detailsList = [
        {
          '@type': 'type.googleapis.com/google.rpc.PreconditionFailure',
          violations: [{ type: 'MISSING_SCHEMA' }]
        }
      ];
      const mapped = mapPostgrestFailureToFirebaseSqlError(
        {
          error: {
            code: 400,
            message: 'Service schema is not configured.',
            status: 'FAILED_PRECONDITION',
            details: detailsList
          }
        },
        400,
        'Bad Request'
      );

      expect(mapped.code).toBe(Code.INVALID_ARGUMENT);
      expect(mapped.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(mapped.message).toBe('Service schema is not configured.');
      expect(mapped.details).toBe(JSON.stringify(detailsList));
      expect(mapped.status).toBe(400);
    });

    it('maps 501 UNIMPLEMENTED to Code.NOT_SUPPORTED and 404 NOT_FOUND to Code.OTHER', () => {
      const notImpl = mapPostgrestFailureToFirebaseSqlError(
        {
          error: {
            code: 501,
            message: 'PostgrestService is not enabled.',
            status: 'UNIMPLEMENTED'
          }
        },
        501,
        'Not Implemented'
      );
      expect(notImpl.code).toBe(Code.NOT_SUPPORTED);
      expect(notImpl.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(notImpl.status).toBe(501);

      const notFound = mapPostgrestFailureToFirebaseSqlError(
        {
          error: {
            code: 404,
            message: 'Resource projects/p/locations/l/services/s was not found',
            status: 'NOT_FOUND'
          }
        },
        404,
        'Not Found'
      );
      expect(notFound.code).toBe(Code.OTHER);
      expect(notFound.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(notFound.status).toBe(404);
    });
  });

  describe('PostgREST and PostgreSQL flat errors (SQL_POSTGREST)', () => {
    it('preserves PGRST wire codes and normalizes null details and hint to undefined', () => {
      const mapped = mapPostgrestFailureToFirebaseSqlError(
        {
          code: 'PGRST205',
          details: null,
          hint: null,
          message:
            "Could not find the table 'public.missing' in the schema cache"
        },
        404,
        'Not Found'
      );

      expect(mapped.code).toBe('PGRST205');
      expect(mapped.category).toBe(FirebaseSqlErrorCategory.SQL_POSTGREST);
      expect(mapped.message).toBe(
        "Could not find the table 'public.missing' in the schema cache"
      );
      expect(mapped.details).toBeUndefined();
      expect(mapped.hint).toBeUndefined();
      expect(mapped.status).toBe(404);
    });

    it('preserves PostgreSQL SQLSTATE codes on 401/403 RLS errors and stringifies PGRST201 array details on 300', () => {
      const anonRls = mapPostgrestFailureToFirebaseSqlError(
        {
          code: '42501',
          details: null,
          hint: 'Grant privileges to anon',
          message: 'permission denied for table users'
        },
        401,
        'Unauthorized'
      );

      expect(anonRls.code).toBe('42501');
      expect(anonRls.category).toBe(FirebaseSqlErrorCategory.SQL_POSTGREST);
      expect(anonRls.hint).toBe('Grant privileges to anon');
      expect(anonRls.status).toBe(401);

      const relDetails = [
        { cardinality: 'many-to-one', embedding: 'users with posts' }
      ];
      const ambiguous = mapPostgrestFailureToFirebaseSqlError(
        {
          code: 'PGRST201',
          details: relDetails,
          hint: "Try changing 'posts' to one of the following...",
          message:
            'Could not embed because more than one relationship was found'
        },
        300,
        'Multiple Choices'
      );

      expect(ambiguous.code).toBe('PGRST201');
      expect(ambiguous.category).toBe(FirebaseSqlErrorCategory.SQL_POSTGREST);
      expect(ambiguous.details).toBe(JSON.stringify(relDetails));
      expect(ambiguous.status).toBe(300);
    });

    it('maps client-generated PGRST116 (.maybeSingle() multiple rows) to SQL_POSTGREST with status 406', () => {
      const maybeSingleErr = mapPostgrestFailureToFirebaseSqlError(
        {
          code: 'PGRST116',
          details:
            'Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row',
          hint: null,
          message: 'JSON object requested, multiple (or no) rows returned'
        },
        406,
        'Not Acceptable'
      );

      expect(maybeSingleErr.code).toBe('PGRST116');
      expect(maybeSingleErr.category).toBe(
        FirebaseSqlErrorCategory.SQL_POSTGREST
      );
      expect(maybeSingleErr.details).toContain('Results contain 2 rows');
      expect(maybeSingleErr.hint).toBeUndefined();
      expect(maybeSingleErr.status).toBe(406);
    });
  });

  describe('non-JSON HTTP and 2xx body parse fallbacks (SQL_PLATFORM)', () => {
    it('maps non-JSON HTTP error bodies and 2xx parse failures to SQL_PLATFORM with HTTP-derived Code', () => {
      const plain500 = mapPostgrestFailureToFirebaseSqlError(
        { message: 'Something went wrong' },
        500,
        'Internal Server Error'
      );
      expect(plain500.code).toBe(Code.OTHER);
      expect(plain500.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(plain500.message).toBe('Something went wrong');
      expect(plain500.status).toBe(500);

      const empty502 = mapPostgrestFailureToFirebaseSqlError(
        { message: '' },
        502,
        'Bad Gateway'
      );
      expect(empty502.code).toBe(Code.OTHER);
      expect(empty502.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(empty502.message).toBe('Bad Gateway');
      expect(empty502.status).toBe(502);

      const html200 = mapPostgrestFailureToFirebaseSqlError(
        { message: '<html>proxy login</html>' },
        200,
        'OK'
      );
      expect(html200.code).toBe(Code.OTHER);
      expect(html200.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(html200.message).toBe('<html>proxy login</html>');
      expect(html200.status).toBe(200);

      const text403 = mapPostgrestFailureToFirebaseSqlError(
        { message: 'Forbidden by WAF' },
        403,
        'Forbidden'
      );
      expect(text403.code).toBe(Code.UNAUTHORIZED);
      expect(text403.category).toBe(FirebaseSqlErrorCategory.SQL_PLATFORM);
      expect(text403.status).toBe(403);
    });
  });
});
