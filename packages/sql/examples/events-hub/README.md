# Firebase SQL — Events & Venues Hub + Live Docs Runner

Interactive browser application demonstrating the `firebase/sql` (`@firebase/sql`) SDK against a live Firebase SQL PostgREST service using the shared **Events & Venues** PostgreSQL + PostGIS reference schema (`venues`, `events`, `registrations`, `remaining_seats`, `list_events_by_city`).

## Features

1. **Interactive Events & Venues Hub:**
   - Full-text search (`textSearch` with `'websearch'`), status/city/tag/featured filtering (`eq`, `in`, `overlaps`, `match`), sorting (`order`), relational embedding (`venue:venues(...)`, `registrations(...)`), and pagination (`range`).
   - Create events (`insert().select().single()`), update prices/statuses with row-count safety (`update().eq().maxAffected(1)`), delete events (`delete().eq().maxAffected(1)`), manage attendee registrations via idempotent `upsert()` (`onConflict: 'event_id,attendee_email'`), toggle check-ins, export CSV (`.csv()`), inspect PostGIS GeoJSON (`.geojson()`), and compute live remaining capacity (`rpc('remaining_seats')`).
   - Live **SDK Query Inspector** showing the exact `firebase/sql` code snippet, HTTP status, latency, and JSON result for every UI interaction.
2. **Comprehensive Docs Examples Suite (35 Live Scenarios):**
   - Executes end-to-end verification of all public `firebase/sql` APIs documented in TSDoc:
     - Client initialization (`getSql`, `FirebaseSql.restUrl`, `FirebaseSql.schemaName`), `copyServiceConfig`, `FirebaseSql.setHeaders()` / `FirebaseSql.mutable` (`Code.ALREADY_INITIALIZED`), and `terminate()` lifecycle (`Code.NOT_INITIALIZED`)
     - `QueryBuilder` verbs (`select`, `insert`, `upsert`, `update`, `delete`)
     - All `FilterBuilder` operator families (`eq`/`neq`/`gt`/`gte`/`lt`/`lte`, `like`/`ilike`/`likeAllOf`/`likeAnyOf`/`regexMatch`/`regexIMatch`, `is`/`isDistinct`, `in`/`notIn`, `contains`/`containedBy`, `rangeGt`/`rangeGte`/`rangeLt`/`rangeLte`/`rangeAdjacent`, `overlaps`, `textSearch`, `match`, `not`, `or`, `filter`)
     - All `TransformBuilder` modifiers (`order`, `limit`, `range`, `abortSignal`, `single`, `maybeSingle`, `csv`, `geojson`, `explain`, `maxAffected`)
     - `FirebaseSql.rpc` (`GET` scalar, `POST` `SETOF`, `GET` `SETOF` + filters, `HEAD` count)
     - `Builder` terminal modifiers (`stripNulls`, `setHeader`, `retry`, `throwOnError`, `returns`, `overrideTypes`) and `FirebaseSqlError` inspection.

## Quick Start

1. Provision your Cloud SQL PostgreSQL database by running [`schema.sql`](./schema.sql).
2. Configure your local connection settings by copying `.env.example` to `.env` (which is gitignored):
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_SQL_SERVICE_ID`, and `VITE_SQL_LOCATION` (or enter them directly in the UI connection bar).
3. Build `@firebase/sql` from the repository root (if not already built):
   ```bash
   npm run --prefix packages/sql build
   ```
4. Start the Vite development server from `packages/sql/examples/events-hub`:
   ```bash
   cd packages/sql/examples/events-hub
   npm run dev
   ```
5. Typecheck and build for production:
   ```bash
   npm run build
   ```
