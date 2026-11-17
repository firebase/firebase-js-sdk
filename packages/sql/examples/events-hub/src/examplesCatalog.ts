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

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory,
  copySqlServiceSettings,
  getSql,
  terminate,
  type FilterOrOptions,
  type FilterTextSearchOptions,
  type FirebaseSqlRpcOptions,
  type QuerySelectOptions,
  type SqlServiceSettings,
  type TransformLimitOptions,
  type TransformOrderOptions,
  type TransformRangeOptions
} from 'firebase/sql';

import { getActiveConnection, getActiveSql, getFirebaseApp } from './firebase';
import type {
  DocExampleScenario,
  EventRow,
  GeoJsonFeatureCollection,
  Venue
} from './types';

const KEYNOTE_EVENT_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const MOSCONE_VENUE_ID = '8f14e45f-ceea-467a-9538-1536b58f2b01';

export const DOC_EXAMPLES_CATALOG: DocExampleScenario[] = [
  // =========================================================================
  // 1. Client & Settings
  // =========================================================================
  {
    id: 'client-getsql-cache',
    category: 'Client & Settings',
    title: '1. getSql() Default Schema & Instance Deduplication',
    apiSymbols: [
      'getSql',
      'FirebaseSql',
      'FirebaseSql.restUrl',
      'FirebaseSql.schemaName',
      'FirebaseSql.mutable',
      'SqlServiceSettings'
    ],
    description:
      'Obtains the FirebaseSql client for (serviceId, location) using the default schema, inspects restUrl/schemaName/mutable, and verifies instance caching.',
    code: `const sql = getSql(app, {
  serviceId: 'YOUR_SERVICE_ID',
  location: 'us-central1'
});
const cached = getSql(app, {
  serviceId: 'YOUR_SERVICE_ID',
  location: 'us-central1'
});
// sql === cached
const res = await sql.from('venues').select('id, slug, name, city');
// sql.restUrl, sql.schemaName, sql.mutable === false`,
    run: async () => {
      const sql = getActiveSql();
      const { serviceId, location } = getActiveConnection();
      const cached = getSql(sql.app, { serviceId, location });
      const sameInstance = sql === cached;
      const res = await sql
        .from('venues')
        .select('id, slug, name, city')
        .returns<Array<Pick<Venue, 'id' | 'slug' | 'name' | 'city'>>>();
      if (!res.success) {
        return {
          passed: false,
          status: res.status,
          summary: res.error.message,
          payload: res.error.toJSON()
        };
      }
      return {
        passed:
          sameInstance &&
          typeof sql.restUrl === 'string' &&
          !sql.mutable &&
          res.data.length > 0,
        status: res.status,
        summary: `Deduplicated instance (${sameInstance}); schema=${sql.schemaName ?? '(default)'}; fetched ${res.data.length} venues`,
        payload: {
          sameInstance,
          restUrl: sql.restUrl,
          schemaName: sql.schemaName ?? '(default)',
          mutable: sql.mutable,
          venues: res.data
        }
      };
    }
  },
  {
    id: 'client-copy-settings-schema',
    category: 'Client & Settings',
    title: '2. copySqlServiceSettings() & Explicit schemaName',
    apiSymbols: [
      'copySqlServiceSettings',
      'SqlServiceSettings',
      'SqlServiceSettings.schemaName',
      'FirebaseSql.schemaName',
      'FirebaseSql.restUrl'
    ],
    description:
      'Clones a SqlServiceSettings object with copySqlServiceSettings(), sets schemaName: "public", inspects restUrl and schemaName on the distinct client, and terminates it.',
    code: `const baseSettings: SqlServiceSettings = {
  serviceId: 'YOUR_SERVICE_ID',
  location: 'us-central1'
};
const nextSettings = copySqlServiceSettings(baseSettings);
nextSettings.schemaName = 'public';

const publicSql = getSql(sql.app, nextSettings);
// publicSql !== sql (explicit 'public' vs. undefined default)
// publicSql.schemaName === 'public', publicSql.restUrl
try {
  const res = await publicSql.from('venues').select('id, slug, name').limit(3);
} finally {
  if (publicSql !== sql) {
    await terminate(publicSql);
  }
}`,
    run: async () => {
      const sql = getActiveSql();
      const { serviceId, location } = getActiveConnection();
      const baseSettings: SqlServiceSettings = { serviceId, location };
      const nextSettings = copySqlServiceSettings(baseSettings);
      nextSettings.schemaName = 'public';

      const publicSql = getSql(sql.app, nextSettings);
      const distinctFromDefault = publicSql !== sql;
      try {
        const res = await publicSql
          .from('venues')
          .select('id, slug, name')
          .limit(3)
          .returns<Array<Pick<Venue, 'id' | 'slug' | 'name'>>>();
        if (!res.success) {
          return {
            passed: false,
            status: res.status,
            summary: res.error.message,
            payload: res.error.toJSON()
          };
        }
        return {
          passed:
            distinctFromDefault &&
            publicSql.schemaName === 'public' &&
            typeof publicSql.restUrl === 'string' &&
            res.data.length > 0,
          status: res.status,
          summary: `Cloned settings for schema "${publicSql.schemaName}" (distinct=${distinctFromDefault}); fetched ${res.data.length} venues`,
          payload: {
            distinctFromDefault,
            restUrl: publicSql.restUrl,
            schemaName: publicSql.schemaName,
            venues: res.data
          }
        };
      } finally {
        if (publicSql !== sql) {
          await terminate(publicSql);
        }
      }
    }
  },
  {
    id: 'client-terminate-lifecycle',
    category: 'Client & Settings',
    title: '3. terminate() & Code.NOT_INITIALIZED Lifecycle',
    apiSymbols: ['terminate', 'Code.NOT_INITIALIZED'],
    description:
      'Terminates an isolated client instance and verifies that builders created before termination settle with Code.NOT_INITIALIZED.',
    code: `const tempSql = getSql(app, {
  serviceId: 'YOUR_SERVICE_ID',
  location: 'us-central1',
  schemaName: 'ephemeral_session'
});
const pendingQuery = tempSql.from('events').select('id, title');
await terminate(tempSql);

const res = await pendingQuery;
// res.success === false && res.error.code === Code.NOT_INITIALIZED`,
    run: async () => {
      const app = getFirebaseApp();
      const { serviceId, location } = getActiveConnection();
      const tempSql = getSql(app, {
        serviceId,
        location,
        schemaName: 'ephemeral_session'
      });
      try {
        const pendingQuery = tempSql.from('events').select('id, title');
        await terminate(tempSql);
        const res = await pendingQuery;
        let syncThrowCode: string | null = null;
        try {
          tempSql.from('events');
        } catch (err) {
          if (err instanceof FirebaseSqlError) {
            syncThrowCode = err.code;
          }
        }
        const passed =
          !res.success &&
          res.error.code === Code.NOT_INITIALIZED &&
          syncThrowCode === Code.NOT_INITIALIZED;
        return {
          passed,
          status: res.status,
          summary: `Pending builder settled with ${!res.success ? res.error.code : 'success'}; sync from() threw ${syncThrowCode}`,
          payload: {
            pendingBuilderError: !res.success ? res.error.toJSON() : null,
            syncFromThrowCode: syncThrowCode
          }
        };
      } finally {
        await terminate(tempSql);
      }
    }
  },
  {
    id: 'client-setheaders-mutability',
    category: 'Client & Settings',
    title: '4. setHeaders(), mutable, restUrl, & Code.ALREADY_INITIALIZED',
    apiSymbols: [
      'FirebaseSql.setHeaders',
      'FirebaseSql.mutable',
      'FirebaseSql.restUrl',
      'FirebaseSql.schemaName',
      'Code.ALREADY_INITIALIZED'
    ],
    description:
      'Inspects restUrl, schemaName, and mutable === true on a fresh client, configures default headers via setHeaders(), runs a query (transitioning mutable to false), and verifies late setHeaders() throws Code.ALREADY_INITIALIZED.',
    code: `const scopedSql = getSql(app, {
  serviceId: 'YOUR_SERVICE_ID',
  location: 'us-central1',
  schemaName: 'public'
});
// scopedSql.mutable === true, scopedSql.restUrl, scopedSql.schemaName === 'public'
scopedSql.setHeaders({ 'x-Verify-Client': 'events-hub' });

const query = scopedSql.from('venues').select('id, slug, name').limit(2);
// scopedSql.mutable === false once from() or rpc() is called
const res = await query;

try {
  scopedSql.setHeaders({ 'x-Verify-Client': 'late-update' });
} catch (err) {
  // err instanceof FirebaseSqlError && err.code === Code.ALREADY_INITIALIZED
} finally {
  await terminate(scopedSql);
}`,
    run: async () => {
      const app = getFirebaseApp();
      const { serviceId, location } = getActiveConnection();
      const settings: SqlServiceSettings = {
        serviceId,
        location,
        schemaName: 'public'
      };
      const prior = getSql(app, settings);
      if (!prior.mutable) {
        await terminate(prior);
      }
      const scopedSql = getSql(app, settings);

      try {
        const initialRestUrl = scopedSql.restUrl;
        const initialSchemaName = scopedSql.schemaName;
        const initialMutable = scopedSql.mutable;

        scopedSql.setHeaders({ 'x-Verify-Client': 'events-hub' });

        const query = scopedSql
          .from('venues')
          .select('id, slug, name')
          .limit(2)
          .returns<Array<Pick<Venue, 'id' | 'slug' | 'name'>>>();
        const mutableAfterFrom = scopedSql.mutable;
        const res = await query;

        let alreadyInitializedCode: string | null = null;
        try {
          scopedSql.setHeaders({ 'x-Verify-Client': 'late-update' });
        } catch (err) {
          if (err instanceof FirebaseSqlError) {
            alreadyInitializedCode = err.code;
          }
        }

        if (!res.success) {
          return {
            passed: false,
            status: res.status,
            summary: res.error.message,
            payload: {
              restUrl: initialRestUrl,
              schemaName: initialSchemaName,
              initialMutable,
              mutableAfterFrom,
              alreadyInitializedCode,
              error: res.error.toJSON()
            }
          };
        }

        const passed =
          typeof initialRestUrl === 'string' &&
          initialRestUrl.includes('/postgrest') &&
          initialSchemaName === 'public' &&
          initialMutable === true &&
          mutableAfterFrom === false &&
          alreadyInitializedCode === Code.ALREADY_INITIALIZED &&
          res.data.length > 0;

        return {
          passed,
          status: res.status,
          summary: `mutable: ${initialMutable} -> ${mutableAfterFrom}; setHeaders() after from() threw ${alreadyInitializedCode}; fetched ${res.data.length} venues`,
          payload: {
            restUrl: initialRestUrl,
            schemaName: initialSchemaName,
            initialMutable,
            mutableAfterFrom,
            alreadyInitializedCode,
            venues: res.data
          }
        };
      } finally {
        await terminate(scopedSql);
      }
    }
  },

  // =========================================================================
  // 2. QueryBuilder Verbs
  // =========================================================================
  {
    id: 'qb-select-embed-count',
    category: 'QueryBuilder Verbs',
    title: '5. select() with Relational Embedding & Exact Count',
    apiSymbols: ['QueryBuilder.select', 'QuerySelectOptions'],
    description:
      'Reads published events with embedded parent venue and exact total row count.',
    code: `const selectOpts: QuerySelectOptions = { count: 'exact' };
const res = await sql
  .from('events')
  .select('id, code, title, ticket_price, venue:venues(slug, name, city)', selectOpts)
  .eq('status', 'published')
  .order('ticket_price', { ascending: true });`,
    run: async () => {
      const sql = getActiveSql();
      const selectOpts: QuerySelectOptions = { count: 'exact' };
      const res = await sql
        .from('events')
        .select(
          'id, code, title, ticket_price, venue:venues(slug, name, city)',
          selectOpts
        )
        .eq('status', 'published')
        .order('ticket_price', { ascending: true });
      if (!res.success) {
        return {
          passed: false,
          status: res.status,
          summary: res.error.message,
          payload: res.error.toJSON()
        };
      }
      return {
        passed: res.count !== null && res.data.length > 0,
        status: res.status,
        summary: `Returned ${res.data.length} published events (exact count=${res.count})`,
        payload: { count: res.count, data: res.data }
      };
    }
  },
  {
    id: 'qb-select-json-paths',
    category: 'QueryBuilder Verbs',
    title: '6. select() Column Aliasing & JSONB Path Extraction',
    apiSymbols: ['QueryBuilder.select', 'TransformBuilder.returns'],
    description:
      'Extracts JSONB properties metadata->>track (text) and metadata->level (JSON number) with column aliases.',
    code: `const res = await sql
  .from('events')
  .select('id, eventCode:code, track:metadata->>track, level:metadata->level')
  .eq('status', 'published')
  .returns<
    Array<{ id: string; eventCode: string; track: string | null; level: number | null }>
  >();`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('events')
        .select(
          'id, eventCode:code, track:metadata->>track, level:metadata->level'
        )
        .eq('status', 'published')
        .returns<
          Array<{
            id: string;
            eventCode: string;
            track: string | null;
            level: number | null;
          }>
        >();
      if (!res.success) {
        return {
          passed: false,
          status: res.status,
          summary: res.error.message,
          payload: res.error.toJSON()
        };
      }
      return {
        passed:
          res.data.length > 0 && typeof res.data[0].eventCode === 'string',
        status: res.status,
        summary: `Extracted JSONB fields across ${res.data.length} events`,
        payload: res.data
      };
    }
  },
  {
    id: 'qb-select-head-count',
    category: 'QueryBuilder Verbs',
    title: '7. select() Count-Only HEAD Request (head: true)',
    apiSymbols: ['QueryBuilder.select', 'QuerySelectOptions.head'],
    description:
      'Fetches the exact registration count via HTTP HEAD without transferring row JSON (data is null).',
    code: `const res = await sql
  .from('registrations')
  .select('*', { head: true, count: 'exact' })
  .eq('event_id', '${KEYNOTE_EVENT_ID}');`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('registrations')
        .select('*', { head: true, count: 'exact' })
        .eq('event_id', KEYNOTE_EVENT_ID);
      if (!res.success) {
        return {
          passed: false,
          status: res.status,
          summary: res.error.message,
          payload: res.error.toJSON()
        };
      }
      return {
        passed: (res.data as unknown) === null && typeof res.count === 'number',
        status: res.status,
        summary: `HEAD count=${res.count} (data === null)`,
        payload: { data: res.data, count: res.count, status: res.status }
      };
    }
  },
  {
    id: 'qb-crud-lifecycle',
    category: 'QueryBuilder Verbs',
    title: '8. insert(), update(), and delete() Full Write Lifecycle',
    apiSymbols: [
      'QueryBuilder.insert',
      'QueryBuilder.update',
      'QueryBuilder.delete',
      'TransformBuilder.maxAffected'
    ],
    description:
      'Inserts a temporary event returning its generated UUID, updates its ticket_price with .maxAffected(1), and deletes it cleanly.',
    code: `const { data: created } = await sql
  .from('events')
  .insert({
    venue_id: '${MOSCONE_VENUE_ID}',
    code: tempCode,
    title: 'Firebase SQL Live Verification Session',
    ticket_price: 49.0,
    tags: ['firebase', 'postgres'],
    metadata: { track: 'backend', level: 300 },
    schedule: '[2026-10-15T16:00:00Z,2026-10-15T18:00:00Z)'
  })
  .select('id, code, status, ticket_price')
  .single()
  .returns<{ id: string; code: string; status: string; ticket_price: number }>()
  .throwOnError();

const updated = await sql
  .from('events')
  .update({ ticket_price: 59.0 })
  .eq('id', created.id)
  .maxAffected(1)
  .select('id, ticket_price')
  .single()
  .throwOnError();

const deleted = await sql
  .from('events')
  .delete({ count: 'exact' })
  .eq('id', created.id)
  .maxAffected(1)
  .throwOnError();`,
    run: async () => {
      const sql = getActiveSql();
      const tempCode = `LIVE-VERIFY-${Date.now()}`;
      const { data: created, status: insertStatus } = await sql
        .from('events')
        .insert({
          venue_id: MOSCONE_VENUE_ID,
          code: tempCode,
          title: 'Firebase SQL Live Verification Session',
          ticket_price: 49.0,
          tags: ['firebase', 'postgres'],
          metadata: { track: 'backend', level: 300 },
          schedule: '[2026-10-15T16:00:00Z,2026-10-15T18:00:00Z)'
        })
        .select('id, code, status, ticket_price')
        .single()
        .returns<{
          id: string;
          code: string;
          status: string;
          ticket_price: number;
        }>()
        .throwOnError();

      const { data: updated } = await sql
        .from('events')
        .update({ ticket_price: 59.0 })
        .eq('id', created.id)
        .maxAffected(1)
        .select('id, ticket_price')
        .single()
        .returns<{ id: string; ticket_price: number }>()
        .throwOnError();

      const deleted = await sql
        .from('events')
        .delete({ count: 'exact' })
        .eq('id', created.id)
        .maxAffected(1)
        .throwOnError();

      return {
        passed: deleted.count === 1 && Number(updated.ticket_price) === 59,
        status: insertStatus,
        summary: `Inserted ${created.code}, updated price to $${updated.ticket_price}, deleted ${deleted.count} row`,
        payload: { created, updated, deletedCount: deleted.count }
      };
    }
  },
  {
    id: 'qb-upsert-conflict-modes',
    category: 'QueryBuilder Verbs',
    title: '9. upsert() Merge vs. ignoreDuplicates + maybeSingle()',
    apiSymbols: [
      'QueryBuilder.upsert',
      'QueryUpsertOptions.onConflict',
      'QueryUpsertOptions.ignoreDuplicates'
    ],
    description:
      'Demonstrates DO NOTHING (ignoreDuplicates: true -> data: null on existing composite key) vs. DO UPDATE on registrations.',
    code: `const ignored = await sql
  .from('registrations')
  .upsert(
    {
      event_id: '${KEYNOTE_EVENT_ID}',
      user_uid: 'uid_alice',
      attendee_email: 'alice@example.com'
    },
    { onConflict: 'event_id,attendee_email', ignoreDuplicates: true }
  )
  .select('id, role')
  .maybeSingle()
  .returns<{ id: string; role: string }>();`,
    run: async () => {
      const sql = getActiveSql();
      const ignored = await sql
        .from('registrations')
        .upsert(
          {
            event_id: KEYNOTE_EVENT_ID,
            user_uid: 'uid_alice',
            attendee_email: 'alice@example.com'
          },
          { onConflict: 'event_id,attendee_email', ignoreDuplicates: true }
        )
        .select('id, role')
        .maybeSingle()
        .returns<{ id: string; role: string }>();

      if (!ignored.success) {
        return {
          passed: false,
          status: ignored.status,
          summary: ignored.error.message,
          payload: ignored.error.toJSON()
        };
      }
      return {
        passed: ignored.data === null,
        status: ignored.status,
        summary:
          'Duplicate (event_id, attendee_email) safely ignored (data === null)',
        payload: ignored
      };
    }
  },

  // =========================================================================
  // 3. FilterBuilder Operators
  // =========================================================================
  {
    id: 'fb-scalar-comparisons',
    category: 'FilterBuilder Operators',
    title: '10. Scalar Comparisons: eq(), neq(), gt(), gte(), lt(), lte()',
    apiSymbols: [
      'FilterBuilder.eq',
      'FilterBuilder.neq',
      'FilterBuilder.gt',
      'FilterBuilder.gte',
      'FilterBuilder.lt',
      'FilterBuilder.lte'
    ],
    description:
      'Combines equality, inequality, and numeric/timestamp range comparisons on events and venues.',
    code: `const paidEvents = await sql
  .from('events')
  .select('code, title, ticket_price, status')
  .neq('status', 'cancelled')
  .gt('ticket_price', 0)
  .lte('ticket_price', 150);

const midVenues = await sql
  .from('venues')
  .select('slug, capacity')
  .gte('capacity', 900)
  .lt('capacity', 2400);`,
    run: async () => {
      const sql = getActiveSql();
      const paidEvents = await sql
        .from('events')
        .select('code, title, ticket_price, status')
        .neq('status', 'cancelled')
        .gt('ticket_price', 0)
        .lte('ticket_price', 150)
        .throwOnError();
      const midVenues = await sql
        .from('venues')
        .select('slug, capacity')
        .gte('capacity', 900)
        .lt('capacity', 2400)
        .throwOnError();
      return {
        passed: paidEvents.data.length > 0 && midVenues.data.length > 0,
        status: paidEvents.status,
        summary: `Matched ${paidEvents.data.length} paid events and ${midVenues.data.length} mid-size venues`,
        payload: { paidEvents: paidEvents.data, midVenues: midVenues.data }
      };
    }
  },
  {
    id: 'fb-like-ilike-quantified',
    category: 'FilterBuilder Operators',
    title:
      '11. Pattern Filters: like(), ilike(), likeAllOf(), likeAnyOf(), ilikeAllOf(), ilikeAnyOf()',
    apiSymbols: [
      'FilterBuilder.like',
      'FilterBuilder.ilike',
      'FilterBuilder.likeAllOf',
      'FilterBuilder.likeAnyOf',
      'FilterBuilder.ilikeAllOf',
      'FilterBuilder.ilikeAnyOf'
    ],
    description:
      'Exercises SQL LIKE and ILIKE single and quantified pattern operators on event codes, titles, and attendee emails.',
    code: `const byCode = await sql
  .from('events')
  .select('code, title')
  .like('code', '%2026')
  .ilikeAllOf('title', ['%sql%', '%keynote%']);

const byEmailDomain = await sql
  .from('registrations')
  .select('attendee_email, role')
  .ilikeAnyOf('attendee_email', ['%@example.com', '%@google.com']);`,
    run: async () => {
      const sql = getActiveSql();
      const byCode = await sql
        .from('events')
        .select('code, title')
        .like('code', '%2026')
        .ilikeAllOf('title', ['%sql%', '%keynote%'])
        .throwOnError();
      const likeAll = await sql
        .from('events')
        .select('code')
        .likeAllOf('code', ['FSQL-%', '%-2026'])
        .throwOnError();
      const likeAny = await sql
        .from('events')
        .select('code')
        .likeAnyOf('code', ['FSQL-%', 'PG-%'])
        .throwOnError();
      const byEmailDomain = await sql
        .from('registrations')
        .select('attendee_email, role')
        .ilikeAnyOf('attendee_email', ['%@example.com', '%@google.com'])
        .throwOnError();
      return {
        passed:
          byCode.data.length >= 1 &&
          likeAll.data.length >= 1 &&
          likeAny.data.length >= 2 &&
          byEmailDomain.data.length >= 1,
        status: byCode.status,
        summary: `ilikeAllOf=${byCode.data.length}, likeAllOf=${likeAll.data.length}, likeAnyOf=${likeAny.data.length}, ilikeAnyOf=${byEmailDomain.data.length}`,
        payload: {
          byCode: byCode.data,
          likeAny: likeAny.data,
          byEmailDomain: byEmailDomain.data
        }
      };
    }
  },
  {
    id: 'fb-posix-regex',
    category: 'FilterBuilder Operators',
    title: '12. POSIX Regular Expressions: regexMatch() & regexIMatch()',
    apiSymbols: ['FilterBuilder.regexMatch', 'FilterBuilder.regexIMatch'],
    description:
      'Filters event codes with case-sensitive POSIX ~ and titles with case-insensitive ~*.',
    code: `const res = await sql
  .from('events')
  .select('id, code, title')
  .regexMatch('code', '^(FSQL|PG)-[A-Z0-9-]+$')
  .regexIMatch('title', '(serverless|vector)');`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('events')
        .select('id, code, title')
        .regexMatch('code', '^(FSQL|PG)-[A-Z0-9-]+$')
        .regexIMatch('title', '(serverless|vector)')
        .throwOnError();
      return {
        passed: res.data.length >= 2,
        status: res.status,
        summary: `Matched ${res.data.length} events via POSIX ~ and ~*`,
        payload: res.data
      };
    }
  },
  {
    id: 'fb-null-and-distinct',
    category: 'FilterBuilder Operators',
    title:
      '13. NULL & Distinct Checks: is(), isDistinct(), and not("col", "is", null)',
    apiSymbols: [
      'FilterBuilder.is',
      'FilterBuilder.isDistinct',
      'FilterBuilder.not'
    ],
    description:
      'Checks IS NULL, IS DISTINCT FROM (null-safe inequality that includes NULL rows), and non-null column narrowing.',
    code: `const uncheckedIn = await sql
  .from('registrations')
  .select('id, attendee_email')
  .eq('event_id', '${KEYNOTE_EVENT_ID}')
  .is('checked_in_at', null);

const nonMosconeOrVirtual = await sql
  .from('events')
  .select('code, venue_id')
  .isDistinct('venue_id', '${MOSCONE_VENUE_ID}');

const inPersonEvents = await sql
  .from('events')
  .select('code, venue_id')
  .not('venue_id', 'is', null);`,
    run: async () => {
      const sql = getActiveSql();
      const uncheckedIn = await sql
        .from('registrations')
        .select('id, attendee_email')
        .eq('event_id', KEYNOTE_EVENT_ID)
        .is('checked_in_at', null)
        .throwOnError();
      const nonMosconeOrVirtual = await sql
        .from('events')
        .select('code, venue_id')
        .isDistinct('venue_id', MOSCONE_VENUE_ID)
        .throwOnError();
      const inPersonEvents = await sql
        .from('events')
        .select('code, venue_id')
        .not('venue_id', 'is', null)
        .throwOnError();
      return {
        passed:
          uncheckedIn.data.length >= 1 &&
          nonMosconeOrVirtual.data.some(row => row.venue_id === null) &&
          inPersonEvents.data.every(row => row.venue_id !== null),
        status: uncheckedIn.status,
        summary: `is(null)=${uncheckedIn.data.length}, isDistinct(includes NULL)=${nonMosconeOrVirtual.data.length}, not.is.null=${inPersonEvents.data.length}`,
        payload: {
          uncheckedIn: uncheckedIn.data,
          nonMosconeOrVirtual: nonMosconeOrVirtual.data,
          inPersonEventsCount: inPersonEvents.data.length
        }
      };
    }
  },
  {
    id: 'fb-in-notin',
    category: 'FilterBuilder Operators',
    title: '14. Set Membership: in() and notIn()',
    apiSymbols: ['FilterBuilder.in', 'FilterBuilder.notIn'],
    description:
      'Filters venues with in() and excludes terminal event statuses with notIn().',
    code: `const westCoastVenues = await sql
  .from('venues')
  .select('slug, city')
  .in('city', ['San Francisco', 'Seattle']);

const activeEvents = await sql
  .from('events')
  .select('code, status')
  .notIn('status', ['cancelled', 'archived']);`,
    run: async () => {
      const sql = getActiveSql();
      const westCoastVenues = await sql
        .from('venues')
        .select('slug, city')
        .in('city', ['San Francisco', 'Seattle'])
        .throwOnError();
      const activeEvents = await sql
        .from('events')
        .select('code, status')
        .notIn('status', ['cancelled', 'archived'])
        .throwOnError();
      return {
        passed:
          westCoastVenues.data.length >= 2 && activeEvents.data.length >= 3,
        status: activeEvents.status,
        summary: `in()=${westCoastVenues.data.length} venues; notIn()=${activeEvents.data.length} active events`,
        payload: {
          westCoastVenues: westCoastVenues.data,
          activeEvents: activeEvents.data
        }
      };
    }
  },
  {
    id: 'fb-array-jsonb-containment',
    category: 'FilterBuilder Operators',
    title:
      '15. Array & JSONB Containment: contains(), containedBy(), overlaps()',
    apiSymbols: [
      'FilterBuilder.contains',
      'FilterBuilder.containedBy',
      'FilterBuilder.overlaps'
    ],
    description:
      'Queries PostgreSQL text[] tags, jsonb metadata, and tstzrange schedules with @>, <@, and && operators.',
    code: `const backendPg = await sql
  .from('events')
  .select('code, tags, metadata')
  .contains('tags', ['firebase', 'postgres'])
  .contains('metadata', { track: 'backend' });

const dayOne = await sql
  .from('events')
  .select('code, schedule')
  .containedBy('schedule', '[2026-10-15T00:00:00Z,2026-10-16T00:00:00Z)');

const morningOverlap = await sql
  .from('events')
  .select('code, tags, schedule')
  .overlaps('tags', ['ai', 'serverless'])
  .overlaps('schedule', '[2026-10-15T09:30:00Z,2026-10-15T11:00:00Z)');`,
    run: async () => {
      const sql = getActiveSql();
      const backendPg = await sql
        .from('events')
        .select('code, tags, metadata')
        .contains('tags', ['firebase', 'postgres'])
        .contains('metadata', { track: 'backend' })
        .throwOnError();
      const dayOne = await sql
        .from('events')
        .select('code, schedule')
        .containedBy('schedule', '[2026-10-15T00:00:00Z,2026-10-16T00:00:00Z)')
        .throwOnError();
      const morningOverlap = await sql
        .from('events')
        .select('code, tags, schedule')
        .overlaps('tags', ['ai', 'serverless'])
        .overlaps('schedule', '[2026-10-15T09:30:00Z,2026-10-15T11:00:00Z)')
        .throwOnError();
      return {
        passed:
          backendPg.data.length >= 1 &&
          dayOne.data.length >= 2 &&
          morningOverlap.data.length >= 2,
        status: backendPg.status,
        summary: `contains=${backendPg.data.length}, containedBy=${dayOne.data.length}, overlaps=${morningOverlap.data.length}`,
        payload: {
          backendPg: backendPg.data,
          dayOne: dayOne.data,
          morningOverlap: morningOverlap.data
        }
      };
    }
  },
  {
    id: 'fb-range-operators',
    category: 'FilterBuilder Operators',
    title:
      '16. PostgreSQL Range Operators: rangeGt(), rangeGte(), rangeLt(), rangeLte(), rangeAdjacent()',
    apiSymbols: [
      'FilterBuilder.rangeGt',
      'FilterBuilder.rangeGte',
      'FilterBuilder.rangeLt',
      'FilterBuilder.rangeLte',
      'FilterBuilder.rangeAdjacent'
    ],
    description:
      'Tests >>, &>, <<, &<, and -|- range operators against events.schedule (tstzrange).',
    code: `const keynoteSlot = '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)';
const strictlyAfter = await sql.from('events').select('code').rangeGt('schedule', keynoteSlot);
const adjacentNext = await sql.from('events').select('code').rangeAdjacent('schedule', keynoteSlot);
const beforeEvening = await sql
  .from('events')
  .select('code')
  .rangeLt('schedule', '[2026-10-16T17:00:00Z,2026-10-16T18:00:00Z)');`,
    run: async () => {
      const sql = getActiveSql();
      const keynoteSlot = '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)';
      const strictlyAfter = await sql
        .from('events')
        .select('code')
        .rangeGt('schedule', keynoteSlot)
        .throwOnError();
      const notBefore = await sql
        .from('events')
        .select('code')
        .rangeGte('schedule', keynoteSlot)
        .throwOnError();
      const beforeEvening = await sql
        .from('events')
        .select('code')
        .rangeLt('schedule', '[2026-10-16T17:00:00Z,2026-10-16T18:00:00Z)')
        .throwOnError();
      const notExtendingPast = await sql
        .from('events')
        .select('code')
        .rangeLte('schedule', '[2026-10-15T09:00:00Z,2026-10-15T12:00:00Z)')
        .throwOnError();
      const adjacentNext = await sql
        .from('events')
        .select('code, schedule')
        .rangeAdjacent('schedule', keynoteSlot)
        .throwOnError();
      return {
        passed:
          strictlyAfter.data.length >= 1 &&
          notBefore.data.length >= 2 &&
          beforeEvening.data.length >= 3 &&
          notExtendingPast.data.length >= 2 &&
          adjacentNext.data.length >= 1,
        status: adjacentNext.status,
        summary: `rangeGt=${strictlyAfter.data.length}, rangeGte=${notBefore.data.length}, rangeLt=${beforeEvening.data.length}, rangeLte=${notExtendingPast.data.length}, rangeAdjacent=${adjacentNext.data.length}`,
        payload: {
          adjacentToKeynote: adjacentNext.data,
          strictlyAfterCount: strictlyAfter.data.length
        }
      };
    }
  },
  {
    id: 'fb-full-text-search',
    category: 'FilterBuilder Operators',
    title: '17. Full-Text Search: textSearch() with websearch Mode',
    apiSymbols: [
      'FilterBuilder.textSearch',
      'FilterTextSearchOptions',
      'FilterTextSearchType'
    ],
    description:
      'Queries the GIN-indexed events.search_doc tsvector column using PostgreSQL websearch_to_tsquery.',
    code: `const searchOpts: FilterTextSearchOptions = {
  type: 'websearch',
  config: 'english'
};
const res = await sql
  .from('events')
  .select('id, code, title')
  .textSearch('search_doc', '"vector search" or serverless -draft', searchOpts);`,
    run: async () => {
      const sql = getActiveSql();
      const searchOpts: FilterTextSearchOptions = {
        type: 'websearch',
        config: 'english'
      };
      const res = await sql
        .from('events')
        .select('id, code, title')
        .textSearch(
          'search_doc',
          '"vector search" or serverless -draft',
          searchOpts
        )
        .throwOnError();
      return {
        passed: res.data.length >= 2,
        status: res.status,
        summary: `Matched ${res.data.length} events via websearch FTS`,
        payload: res.data
      };
    }
  },
  {
    id: 'fb-match-or-filter',
    category: 'FilterBuilder Operators',
    title:
      '18. Compound Filters: match(), or() with referencedTable, and filter()',
    apiSymbols: [
      'FilterBuilder.match',
      'FilterBuilder.or',
      'FilterOrOptions',
      'FilterBuilder.filter'
    ],
    description:
      'Combines multi-column match(), embedded-relation disjunction via or(..., { referencedTable }), and raw PostgREST filter().',
    code: `const featuredPublished = await sql
  .from('events')
  .select('code, title')
  .match({ status: 'published', is_featured: true });

const orOpts: FilterOrOptions = { referencedTable: 'registrations' };
const withStaff = await sql
  .from('events')
  .select('code, registrations!inner(attendee_email, role)')
  .or('role.eq.speaker,role.eq.organizer', orOpts);

const rawFilter = await sql
  .from('registrations')
  .select('attendee_email, role')
  .filter('role', 'in', '(speaker,organizer)');`,
    run: async () => {
      const sql = getActiveSql();
      const featuredPublished = await sql
        .from('events')
        .select('code, title')
        .match({ status: 'published', is_featured: true })
        .throwOnError();
      const orOpts: FilterOrOptions = { referencedTable: 'registrations' };
      const withStaff = await sql
        .from('events')
        .select('code, registrations!inner(attendee_email, role)')
        .or('role.eq.speaker,role.eq.organizer', orOpts)
        .throwOnError();
      const rawFilter = await sql
        .from('registrations')
        .select('attendee_email, role')
        .filter('role', 'in', '(speaker,organizer)')
        .throwOnError();
      return {
        passed:
          featuredPublished.data.length >= 2 &&
          withStaff.data.length >= 2 &&
          rawFilter.data.length >= 2,
        status: withStaff.status,
        summary: `match=${featuredPublished.data.length}, or(referencedTable)=${withStaff.data.length}, filter=${rawFilter.data.length}`,
        payload: {
          featuredPublished: featuredPublished.data,
          withStaff: withStaff.data,
          rawFilter: rawFilter.data
        }
      };
    }
  },

  // =========================================================================
  // 4. TransformBuilder Modifiers
  // =========================================================================
  {
    id: 'tb-order-parent-and-embedded',
    category: 'TransformBuilder Modifiers',
    title: '19. order() by Foreign Table Column & Embedded Child Array',
    apiSymbols: ['TransformBuilder.order', 'TransformOrderOptions'],
    description:
      'Sorts parent events by many-to-one venues(name), and sorts nested registrations with nullsFirst: false.',
    code: `const byVenueName = await sql
  .from('events')
  .select('code, venues(name, city)')
  .order('venues(name)', { ascending: true });

const orderOpts: TransformOrderOptions = {
  referencedTable: 'registrations',
  ascending: false,
  nullsFirst: false
};
const nestedSorted = await sql
  .from('events')
  .select('code, registrations(attendee_email, checked_in_at)')
  .eq('id', '${KEYNOTE_EVENT_ID}')
  .order('checked_in_at', orderOpts)
  .single();`,
    run: async () => {
      const sql = getActiveSql();
      const byVenueName = await sql
        .from('events')
        .select('code, venues(name, city)')
        .order('venues(name)', { ascending: true })
        .throwOnError();
      const orderOpts: TransformOrderOptions = {
        referencedTable: 'registrations',
        ascending: false,
        nullsFirst: false
      };
      const nestedSorted = await sql
        .from('events')
        .select('code, registrations(attendee_email, checked_in_at)')
        .eq('id', KEYNOTE_EVENT_ID)
        .order('checked_in_at', orderOpts)
        .single()
        .throwOnError();
      return {
        passed: byVenueName.data.length >= 4,
        status: nestedSorted.status,
        summary: `Sorted ${byVenueName.data.length} parent events by venues(name) and nested registrations`,
        payload: {
          parentOrder: byVenueName.data,
          nestedOrder: nestedSorted.data
        }
      };
    }
  },
  {
    id: 'tb-limit-and-range-pagination',
    category: 'TransformBuilder Modifiers',
    title: '20. limit() and range() Pagination (Parent & Embedded)',
    apiSymbols: [
      'TransformBuilder.limit',
      'TransformLimitOptions',
      'TransformBuilder.range',
      'TransformRangeOptions'
    ],
    description:
      'Paginates parent venues with range(0, 1) and caps nested child registrations per event with limit(2, { referencedTable }).',
    code: `const page1 = await sql
  .from('venues')
  .select('slug, capacity', { count: 'exact' })
  .order('capacity', { ascending: false })
  .order('id', { ascending: true })
  .range(0, 1);

const limitOpts: TransformLimitOptions = { referencedTable: 'registrations' };
const rangeOpts: TransformRangeOptions = { referencedTable: 'registrations' };
const capped = await sql
  .from('events')
  .select('code, registrations(attendee_email)')
  .eq('id', '${KEYNOTE_EVENT_ID}')
  .limit(2, limitOpts)
  .range(0, 1, rangeOpts)
  .single();`,
    run: async () => {
      const sql = getActiveSql();
      const page1 = await sql
        .from('venues')
        .select('slug, capacity', { count: 'exact' })
        .order('capacity', { ascending: false })
        .order('id', { ascending: true })
        .range(0, 1)
        .throwOnError();
      const limitOpts: TransformLimitOptions = {
        referencedTable: 'registrations'
      };
      const rangeOpts: TransformRangeOptions = {
        referencedTable: 'registrations'
      };
      const capped = await sql
        .from('events')
        .select('code, registrations(attendee_email)')
        .eq('id', KEYNOTE_EVENT_ID)
        .limit(2, limitOpts)
        .range(0, 1, rangeOpts)
        .single()
        .returns<{
          code: string;
          registrations: Array<{ attendee_email: string }>;
        }>()
        .throwOnError();
      return {
        passed:
          page1.data.length === 2 && capped.data.registrations.length === 2,
        status: page1.status,
        summary: `Page 1 returned ${page1.data.length}/${page1.count} venues; embedded registrations capped to ${capped.data.registrations.length}`,
        payload: {
          page1: page1.data,
          totalCount: page1.count,
          capped: capped.data
        }
      };
    }
  },
  {
    id: 'tb-single-vs-maybesingle',
    category: 'TransformBuilder Modifiers',
    title: '21. single() (PGRST116 on 0 Rows) vs. maybeSingle() (data: null)',
    apiSymbols: ['TransformBuilder.single', 'TransformBuilder.maybeSingle'],
    description:
      'Compares single() (which fails with HTTP 406 PGRST116 when 0 rows match) against maybeSingle() (which resolves data: null).',
    code: `const singleMissing = await sql
  .from('venues')
  .select('id, slug')
  .eq('slug', 'non-existent-venue')
  .single();
// singleMissing.success === false && singleMissing.error.code === 'PGRST116'

const maybeMissing = await sql
  .from('venues')
  .select('id, slug')
  .eq('slug', 'non-existent-venue')
  .limit(2)
  .maybeSingle();
// maybeMissing.success === true && maybeMissing.data === null`,
    run: async () => {
      const sql = getActiveSql();
      const singleMissing = await sql
        .from('venues')
        .select('id, slug')
        .eq('slug', 'non-existent-venue')
        .single();
      const maybeMissing = await sql
        .from('venues')
        .select('id, slug')
        .eq('slug', 'non-existent-venue')
        .limit(2)
        .maybeSingle()
        .throwOnError();
      const passed =
        !singleMissing.success &&
        singleMissing.error.code === 'PGRST116' &&
        maybeMissing.data === null;
      return {
        passed,
        status: maybeMissing.status,
        summary: `single(0 rows) -> ${!singleMissing.success ? singleMissing.error.code : 'ok'}; maybeSingle(0 rows) -> data: null`,
        payload: {
          singleMissing: !singleMissing.success
            ? singleMissing.error.toJSON()
            : singleMissing,
          maybeMissing
        }
      };
    }
  },
  {
    id: 'tb-csv-export',
    category: 'TransformBuilder Modifiers',
    title: '22. csv() Export Serialization',
    apiSymbols: ['TransformBuilder.csv'],
    description:
      'Requests attendee registrations formatted directly as a CSV document (Accept: text/csv).',
    code: `const res = await sql
  .from('registrations')
  .select('attendee_email, role, checked_in_at')
  .eq('event_id', '${KEYNOTE_EVENT_ID}')
  .order('attendee_email', { ascending: true })
  .csv();`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('registrations')
        .select('attendee_email, role, checked_in_at')
        .eq('event_id', KEYNOTE_EVENT_ID)
        .order('attendee_email', { ascending: true })
        .csv()
        .throwOnError();
      const lines = res.data.trim().split('\n');
      return {
        passed:
          typeof res.data === 'string' &&
          lines[0].includes('attendee_email') &&
          lines.length >= 2,
        status: res.status,
        summary: `Exported CSV with header + ${lines.length - 1} data rows`,
        payload: res.data
      };
    }
  },
  {
    id: 'tb-geojson-postgis',
    category: 'TransformBuilder Modifiers',
    title: '23. geojson() PostGIS FeatureCollection',
    apiSymbols: ['TransformBuilder.geojson', 'Builder.returns'],
    description:
      'Serializes San Francisco venues with PostGIS geography(Point, 4326) coordinates as a GeoJSON FeatureCollection.',
    code: `const res = await sql
  .from('venues')
  .select('id, slug, name, capacity, coords')
  .eq('city', 'San Francisco')
  .geojson()
  .returns<GeoJsonFeatureCollection>();`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('venues')
        .select('id, slug, name, capacity, coords')
        .eq('city', 'San Francisco')
        .geojson()
        .returns<GeoJsonFeatureCollection>();
      if (!res.success) {
        return {
          passed: false,
          status: res.status,
          summary: res.error.message,
          payload: res.error.toJSON()
        };
      }
      return {
        passed:
          res.data.type === 'FeatureCollection' &&
          res.data.features.length >= 2,
        status: res.status,
        summary: `GeoJSON FeatureCollection with ${res.data.features.length} San Francisco venue features`,
        payload: res.data
      };
    }
  },
  {
    id: 'tb-max-affected-guard',
    category: 'TransformBuilder Modifiers',
    title: '24. maxAffected() Server-Side Row Cap (PGRST124 Rollback)',
    apiSymbols: ['TransformBuilder.maxAffected'],
    description:
      'Demonstrates PostgREST v13+ rolling back an overly broad UPDATE with HTTP 400 PGRST124 when affected rows exceed maxAffected(1).',
    code: `const res = await sql
  .from('events')
  .update({ is_featured: false })
  .eq('status', 'published')
  .maxAffected(1);
// 3 published rows match -> aborted with res.error.code === 'PGRST124'`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('events')
        .update({ is_featured: false })
        .eq('status', 'published')
        .maxAffected(1);
      const passed =
        !res.success && res.status === 400 && res.error.code === 'PGRST124';
      return {
        passed,
        status: res.status,
        summary: !res.success
          ? `Transaction safely aborted (${res.error.code}: ${res.error.message})`
          : 'Unexpectedly succeeded',
        payload: !res.success ? res.error.toJSON() : res
      };
    }
  },
  {
    id: 'tb-explain-plan',
    category: 'TransformBuilder Modifiers',
    title: '25. explain() Execution Plan & db-plan-enabled Check',
    apiSymbols: ['TransformBuilder.explain', 'TransformExplainOptions'],
    description:
      'Requests EXPLAIN output and gracefully handles HTTP 406 PGRST107 when db-plan-enabled is disabled on managed PostgREST.',
    code: `const res = await sql
  .from('events')
  .select('id, code, title')
  .eq('status', 'published')
  .explain({ format: 'json' });`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('events')
        .select('id, code, title')
        .eq('status', 'published')
        .explain({ format: 'json' });
      if (res.success) {
        return {
          passed: Array.isArray(res.data),
          status: res.status,
          summary: 'Received JSON EXPLAIN plan from PostgREST',
          payload: res.data
        };
      }
      return {
        passed: res.status === 406 && res.error.code === 'PGRST107',
        status: res.status,
        summary: `Verified managed gateway rejects plan media type (${res.error.code}, HTTP ${res.status}) when db-plan-enabled is off`,
        payload: res.error.toJSON()
      };
    }
  },
  {
    id: 'tb-abort-signal',
    category: 'TransformBuilder Modifiers',
    title: '26. abortSignal() Client Deadline & Manual Cancellation',
    apiSymbols: [
      'TransformBuilder.abortSignal',
      'FirebaseSqlErrorCategory.SQL_CLIENT'
    ],
    description:
      'Cancels a query via AbortController and verifies status === 0, category === "sql-client", and client-generated hint.',
    code: `const controller = new AbortController();
controller.abort('User navigated away');

const res = await sql
  .from('events')
  .select('id, code, title')
  .abortSignal(controller.signal);`,
    run: async () => {
      const sql = getActiveSql();
      const controller = new AbortController();
      controller.abort('User navigated away');
      const res = await sql
        .from('events')
        .select('id, code, title')
        .abortSignal(controller.signal);
      const passed =
        !res.success &&
        res.status === 0 &&
        res.error.category === FirebaseSqlErrorCategory.SQL_CLIENT &&
        res.error.code === Code.OTHER;
      return {
        passed,
        status: res.status,
        summary: !res.success
          ? `Aborted cleanly (${res.error.category} / ${res.error.code}, hint: "${res.error.hint ?? ''}")`
          : 'Unexpected success',
        payload: !res.success ? res.error.toJSON() : res
      };
    }
  },

  // =========================================================================
  // 5. Stored Functions (RPC)
  // =========================================================================
  {
    id: 'rpc-scalar-get',
    category: 'Stored Functions (RPC)',
    title: '27. rpc() Read-Only Scalar Function (remaining_seats via GET)',
    apiSymbols: [
      'FirebaseSql.rpc',
      'FirebaseSqlRpcOptions.get',
      'TransformBuilder.returns'
    ],
    description:
      'Invokes remaining_seats(target_event_id) over HTTP GET and types the scalar integer return value via returns<number>().',
    code: `const seatsRes = await sql
  .rpc(
    'remaining_seats',
    { target_event_id: '${KEYNOTE_EVENT_ID}' },
    { get: true }
  )
  .returns<number>();`,
    run: async () => {
      const sql = getActiveSql();
      const seatsRes = await sql
        .rpc(
          'remaining_seats',
          { target_event_id: KEYNOTE_EVENT_ID },
          { get: true }
        )
        .returns<number>();
      if (!seatsRes.success) {
        return {
          passed: false,
          status: seatsRes.status,
          summary: seatsRes.error.message,
          payload: seatsRes.error.toJSON()
        };
      }
      return {
        passed: typeof seatsRes.data === 'number' && seatsRes.data > 0,
        status: seatsRes.status,
        summary: `Remaining seats for keynote: ${seatsRes.data}`,
        payload: seatsRes
      };
    }
  },
  {
    id: 'rpc-setof-post-select',
    category: 'Stored Functions (RPC)',
    title: '28. rpc() Table-Returning Function (POST + .select() Projection)',
    apiSymbols: ['FirebaseSql.rpc', 'TransformBuilder.select'],
    description:
      'Calls list_events_by_city via POST and projects specific columns using .select("id, code, title").',
    code: `const { data, status } = await sql
  .rpc('list_events_by_city', { target_city: 'San Francisco' })
  .select('id, code, title')
  .returns<Array<{ id: string; code: string; title: string }>>()
  .throwOnError();`,
    run: async () => {
      const sql = getActiveSql();
      const { data, status } = await sql
        .rpc('list_events_by_city', { target_city: 'San Francisco' })
        .select('id, code, title')
        .returns<Array<{ id: string; code: string; title: string }>>()
        .throwOnError();
      return {
        passed: data.length >= 2,
        status,
        summary: `Projected ${data.length} San Francisco events from SETOF RPC`,
        payload: data
      };
    }
  },
  {
    id: 'rpc-setof-get-filtered',
    category: 'Stored Functions (RPC)',
    title: '29. rpc() SETOF Function + Chained Filters, Order & Exact Count',
    apiSymbols: ['FirebaseSql.rpc', 'FirebaseSqlRpcOptions'],
    description:
      'Chains .eq(), .overlaps(), .order(), and .limit() onto list_events_by_city in read-only GET mode.',
    code: `const rpcOpts: FirebaseSqlRpcOptions = { get: true, count: 'exact' };
const cityEvents = await sql
  .rpc('list_events_by_city', { target_city: 'Seattle' }, rpcOpts)
  .eq('status', 'published')
  .overlaps('tags', ['firebase', 'postgres'])
  .order('ticket_price', { ascending: true })
  .limit(10)
  .returns<EventRow[]>();`,
    run: async () => {
      const sql = getActiveSql();
      const rpcOpts: FirebaseSqlRpcOptions = { get: true, count: 'exact' };
      const cityEvents = await sql
        .rpc('list_events_by_city', { target_city: 'Seattle' }, rpcOpts)
        .eq('status', 'published')
        .overlaps('tags', ['firebase', 'postgres'])
        .order('ticket_price', { ascending: true })
        .limit(10)
        .returns<EventRow[]>()
        .throwOnError();
      return {
        passed: cityEvents.data.length >= 1 && cityEvents.count !== null,
        status: cityEvents.status,
        summary: `Matched ${cityEvents.data.length} of ${cityEvents.count} Seattle events`,
        payload: { count: cityEvents.count, data: cityEvents.data }
      };
    }
  },
  {
    id: 'rpc-head-count',
    category: 'Stored Functions (RPC)',
    title: '30. rpc() Count-Only HEAD Invocation (head: true)',
    apiSymbols: ['FirebaseSql.rpc', 'FirebaseSqlRpcOptions.head'],
    description:
      'Counts rows returned by list_events_by_city via HTTP HEAD without transferring row payloads.',
    code: `const headRes = await sql.rpc(
  'list_events_by_city',
  { target_city: 'San Francisco' },
  { head: true, count: 'exact' }
);`,
    run: async () => {
      const sql = getActiveSql();
      const headRes = await sql
        .rpc(
          'list_events_by_city',
          { target_city: 'San Francisco' },
          { head: true, count: 'exact' }
        )
        .throwOnError();
      return {
        passed: headRes.data === null && (headRes.count ?? 0) >= 2,
        status: headRes.status,
        summary: `HEAD RPC count=${headRes.count} (data === null)`,
        payload: { data: headRes.data, count: headRes.count }
      };
    }
  },

  // =========================================================================
  // 6. Builder & Errors
  // =========================================================================
  {
    id: 'builder-strip-nulls',
    category: 'Builder & Errors',
    title: '31. stripNulls() Sparse JSON Objects',
    apiSymbols: ['Builder.stripNulls', 'Builder.returns'],
    description:
      'Requests Accept: application/vnd.pgrst.object+json;nulls=stripped so null columns (checked_in_at) are omitted from the JSON object.',
    code: `const res = await sql
  .from('registrations')
  .select('id, attendee_email, checked_in_at')
  .eq('attendee_email', 'carol@example.com')
  .single()
  .stripNulls()
  .returns<{ id: string; attendee_email: string; checked_in_at?: string }>();`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('registrations')
        .select('id, attendee_email, checked_in_at')
        .eq('attendee_email', 'carol@example.com')
        .single()
        .stripNulls()
        .returns<{
          id: string;
          attendee_email: string;
          checked_in_at?: string;
        }>()
        .throwOnError();
      const omitted = !('checked_in_at' in res.data);
      return {
        passed: omitted,
        status: res.status,
        summary: `Returned keys [${Object.keys(res.data).join(', ')}] (checked_in_at omitted=${omitted})`,
        payload: res.data
      };
    }
  },
  {
    id: 'builder-setheader-and-guard',
    category: 'Builder & Errors',
    title: '32. setHeader() Correlation ID & Protected Header Rejection',
    apiSymbols: ['Builder.setHeader', 'Code.INVALID_ARGUMENT'],
    description:
      'Attaches a custom per-request header and verifies that setting protected Firebase headers throws Code.INVALID_ARGUMENT synchronously.',
    code: `const res = await sql
  .from('events')
  .select('id, code')
  .limit(1)
  .setHeader('x-correlation-id', 'docs-runner-trace-01');

// Attempting .setHeader('Authorization', 'Bearer ...') throws FirebaseSqlError (invalid-argument)`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('events')
        .select('id, code')
        .limit(1)
        .setHeader('x-correlation-id', 'docs-runner-trace-01')
        .throwOnError();

      let blockedCode: string | null = null;
      try {
        sql
          .from('events')
          .select('id')
          .setHeader('x-firebase-auth-token', 'manual-override');
      } catch (err) {
        if (err instanceof FirebaseSqlError) {
          blockedCode = err.code;
        }
      }
      return {
        passed: res.data.length === 1 && blockedCode === Code.INVALID_ARGUMENT,
        status: res.status,
        summary: `Custom header succeeded; protected header rejected with ${blockedCode}`,
        payload: { data: res.data, protectedHeaderBlockedWith: blockedCode }
      };
    }
  },
  {
    id: 'builder-retry-toggle',
    category: 'Builder & Errors',
    title: '33. retry(false) Fail-Fast Autocomplete Query',
    apiSymbols: ['Builder.retry'],
    description:
      'Disables automatic transient backoff retries on an interactive autocomplete query.',
    code: `const res = await sql
  .from('events')
  .select('id, code, title')
  .ilike('title', 'firebase%')
  .limit(5)
  .retry(false);`,
    run: async () => {
      const sql = getActiveSql();
      const res = await sql
        .from('events')
        .select('id, code, title')
        .ilike('title', 'firebase%')
        .limit(5)
        .retry(false)
        .throwOnError();
      return {
        passed: res.data.length >= 1,
        status: res.status,
        summary: `Autocomplete returned ${res.data.length} matching events with retry(false)`,
        payload: res.data
      };
    }
  },
  {
    id: 'builder-throw-on-error-catch',
    category: 'Builder & Errors',
    title: '34. throwOnError() Rejecting with Structured FirebaseSqlError',
    apiSymbols: [
      'Builder.throwOnError',
      'FirebaseSqlError',
      'FirebaseSqlError.toJSON'
    ],
    description:
      'Catches a PostgreSQL SQLSTATE 42P01 (undefined_table) rejection via throwOnError() and serializes the error with toJSON().',
    code: `try {
  await sql.from('nonexistent_table').select('id').throwOnError();
} catch (err) {
  if (err instanceof FirebaseSqlError) {
    console.error(err.toJSON());
  }
}`,
    run: async () => {
      const sql = getActiveSql();
      try {
        await sql.from('nonexistent_table').select('id').throwOnError();
        return {
          passed: false,
          status: 200,
          summary: 'Expected throwOnError() to reject',
          payload: null
        };
      } catch (err) {
        if (err instanceof FirebaseSqlError) {
          const serialized = err.toJSON();
          return {
            passed:
              err.category === FirebaseSqlErrorCategory.SQL_POSTGREST &&
              typeof err.code === 'string',
            status: err.status ?? 0,
            summary: `Caught FirebaseSqlError (${err.category} / ${err.code}, HTTP ${err.status})`,
            payload: serialized
          };
        }
        throw err;
      }
    }
  },
  {
    id: 'builder-returns-vs-overridetypes',
    category: 'Builder & Errors',
    title: '35. returns<T>() Full Types vs. overrideTypes<Partial>() Merges',
    apiSymbols: [
      'TransformBuilder.returns',
      'Builder.returns',
      'Builder.overrideTypes'
    ],
    description:
      'Uses returns<T>() for full row types and chains overrideTypes<PartialOverlay>() to refine a JSONB metadata column while keeping all other fields.',
    code: `const venue = await sql
  .from('venues')
  .select('id, slug, name')
  .eq('slug', 'moscone-west')
  .single()
  .returns<{ id: string; slug: string; name: string }>();

const refinedEvents = await sql
  .from('events')
  .select('id, code, title, metadata')
  .eq('status', 'published')
  .returns<Array<{ id: string; code: string; title: string; metadata: unknown }>>()
  .overrideTypes<Array<{ metadata: { track: string; level: number } }>>();`,
    run: async () => {
      const sql = getActiveSql();
      const venue = await sql
        .from('venues')
        .select('id, slug, name')
        .eq('slug', 'moscone-west')
        .single()
        .returns<{ id: string; slug: string; name: string }>()
        .throwOnError();
      const refinedEvents = await sql
        .from('events')
        .select('id, code, title, metadata')
        .eq('status', 'published')
        .returns<
          Array<{ id: string; code: string; title: string; metadata: unknown }>
        >()
        .overrideTypes<Array<{ metadata: { track: string; level: number } }>>()
        .throwOnError();
      const first = refinedEvents.data[0];
      return {
        passed:
          venue.data.slug === 'moscone-west' &&
          Boolean(first) &&
          typeof first.title === 'string' &&
          typeof first.metadata.track === 'string',
        status: refinedEvents.status,
        summary: `Full returns<T>() resolved "${venue.data.name}"; partial overrideTypes() narrowed ${refinedEvents.data.length} event metadata rows`,
        payload: {
          venue: venue.data,
          sampleRefinedEvent: first
        }
      };
    }
  }
];
