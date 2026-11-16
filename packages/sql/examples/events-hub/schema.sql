-- Copyright 2026 Google LLC
-- Licensed under the Apache License, Version 2.0
--
-- Reference PostgreSQL + PostGIS schema for Firebase SQL (`firebase/sql`) documentation examples.
-- Run this SQL script against your Cloud SQL PostgreSQL database before launching the example app.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Venues table (with PostGIS geography column for .geojson() examples)
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  coords geography(Point, 4326)
);

-- 2. Events table (with text[], jsonb, tstzrange, and generated tsvector columns)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'archived')),
  is_featured boolean NOT NULL DEFAULT false,
  ticket_price numeric(10, 2) NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule tstzrange,
  search_doc tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(code, '') || ' ' || coalesce(status, '') || ' ' || coalesce(metadata->>'description', '')
    )
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_search_doc_idx ON public.events USING GIN (search_doc);
CREATE INDEX IF NOT EXISTS events_tags_idx ON public.events USING GIN (tags);
CREATE INDEX IF NOT EXISTS events_metadata_idx ON public.events USING GIN (metadata);
CREATE INDEX IF NOT EXISTS events_schedule_idx ON public.events USING GIST (schedule);

-- 3. Registrations table (with composite UNIQUE constraint for .upsert() onConflict examples)
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_uid text NOT NULL DEFAULT 'anonymous',
  attendee_email text NOT NULL,
  role text NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee', 'speaker', 'organizer')),
  checked_in_at timestamptz,
  UNIQUE (event_id, attendee_email)
);

-- 4. Scalar stored function: remaining_seats(target_event_id uuid) -> integer
CREATE OR REPLACE FUNCTION public.remaining_seats(target_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(
    0,
    COALESCE((
      SELECT v.capacity
      FROM public.events e
      LEFT JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = target_event_id
    ), 0) - (
      SELECT COUNT(*)::integer
      FROM public.registrations r
      WHERE r.event_id = target_event_id
    )
  );
$$;

-- 5. Set-returning stored function: list_events_by_city(target_city text) -> SETOF events
CREATE OR REPLACE FUNCTION public.list_events_by_city(target_city text)
RETURNS SETOF public.events
LANGUAGE sql
STABLE
AS $$
  SELECT e.*
  FROM public.events e
  INNER JOIN public.venues v ON v.id = e.venue_id
  WHERE v.city ILIKE target_city
  ORDER BY e.created_at DESC;
$$;

-- 6. Idempotent reset helper RPC used by the demo UI & test runner
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.registrations;
  DELETE FROM public.events;
  DELETE FROM public.venues;

  INSERT INTO public.venues (id, slug, name, city, capacity, coords) VALUES
    ('8f14e45f-ceea-467a-9538-1536b58f2b01', 'moscone-west', 'Moscone West', 'San Francisco', 2400, ST_GeogFromText('SRID=4326;POINT(-122.4030 37.7831)')),
    ('11111111-1111-1111-1111-111111111111', 'bell-harbor', 'Bell Harbor Conference Center', 'Seattle', 900, ST_GeogFromText('SRID=4326;POINT(-122.3475 47.6114)')),
    ('22222222-2222-2222-2222-222222222222', 'austin-conv', 'Austin Convention Center', 'Austin', 1500, ST_GeogFromText('SRID=4326;POINT(-97.7394 30.2636)')),
    ('550e8400-e29b-41d4-a716-446655440000', 'pier-27-sf', 'Pier 27 Embarcadero', 'San Francisco', 1200, ST_GeogFromText('SRID=4326;POINT(-122.4014 37.8065)'));

  INSERT INTO public.events (id, venue_id, code, title, status, is_featured, ticket_price, tags, metadata, schedule, created_at) VALUES
    (
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '8f14e45f-ceea-467a-9538-1536b58f2b01',
      'FSQL-KEYNOTE-2026',
      'Firebase SQL Serverless Keynote',
      'published',
      true,
      0.00,
      ARRAY['firebase', 'postgres', 'serverless'],
      '{"track": "backend", "level": 100, "description": "Cloud SQL and PostgREST architecture overview with vector search."}'::jsonb,
      '[2026-10-15T09:00:00Z,2026-10-15T10:00:00Z)',
      '2026-09-01T16:00:00Z'
    ),
    (
      '7ca7b810-9dad-11d1-80b4-00c04fd430c9',
      '8f14e45f-ceea-467a-9538-1536b58f2b01',
      'PG-VECTOR-LAB-2026',
      'AI Agents & Vector Search Hands-On Lab',
      'published',
      true,
      99.00,
      ARRAY['firebase', 'postgres', 'ai'],
      '{"track": "ai", "level": 300, "description": "Build hybrid vector search and full-text search with Cloud SQL."}'::jsonb,
      '[2026-10-15T10:00:00Z,2026-10-15T12:00:00Z)',
      '2026-09-02T16:00:00Z'
    ),
    (
      '8da7b810-9dad-11d1-80b4-00c04fd430ca',
      '11111111-1111-1111-1111-111111111111',
      'SEATTLE-CLOUD-SQL-2026',
      'Cloud SQL High Availability Workshop',
      'published',
      false,
      49.00,
      ARRAY['postgres', 'serverless'],
      '{"track": "backend", "level": 200, "description": "Zero-downtime Cloud SQL migrations and read replicas."}'::jsonb,
      '[2026-10-15T13:00:00Z,2026-10-15T15:30:00Z)',
      '2026-09-03T16:00:00Z'
    ),
    (
      '9ea7b810-9dad-11d1-80b4-00c04fd430cb',
      '22222222-2222-2222-2222-222222222222',
      'AUSTIN-RLS-SECURITY',
      'Row-Level Security with Firebase Auth',
      'draft',
      false,
      129.00,
      ARRAY['firebase', 'security'],
      '{"track": "security", "level": 300, "description": "Draft session on PostgreSQL RLS policies and App Check."}'::jsonb,
      '[2026-10-16T09:00:00Z,2026-10-16T11:00:00Z)',
      '2026-09-04T16:00:00Z'
    ),
    (
      'aea7b810-9dad-11d1-80b4-00c04fd430cc',
      NULL,
      'VIRTUAL-LIVESTREAM-2026',
      'Global Online Office Hours',
      'cancelled',
      false,
      0.00,
      ARRAY['community'],
      '{"track": "community", "level": 100, "description": "Cancelled livestream session."}'::jsonb,
      '[2026-10-16T17:00:00Z,2026-10-16T18:00:00Z)',
      '2026-09-05T16:00:00Z'
    );

  INSERT INTO public.registrations (id, event_id, user_uid, attendee_email, role, checked_in_at) VALUES
    ('c9a646d3-9c61-4cb7-bfcd-ee2522c8f633', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'uid_alice', 'alice@example.com', 'attendee', '2026-10-15T08:45:00Z'),
    ('d9a646d3-9c61-4cb7-bfcd-ee2522c8f634', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'uid_bob', 'bob@google.com', 'speaker', '2026-10-15T08:30:00Z'),
    ('e9a646d3-9c61-4cb7-bfcd-ee2522c8f635', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'uid_carol', 'carol@example.com', 'attendee', NULL),
    ('f9a646d3-9c61-4cb7-bfcd-ee2522c8f636', '7ca7b810-9dad-11d1-80b4-00c04fd430c9', 'uid_dana', 'dana@google.com', 'organizer', '2026-10-15T09:50:00Z'),
    ('09a646d3-9c61-4cb7-bfcd-ee2522c8f637', '8da7b810-9dad-11d1-80b4-00c04fd430ca', 'uid_eli', 'eli@example.com', 'attendee', NULL);

  RETURN jsonb_build_object('venues', 4, 'events', 5, 'registrations', 5);
END;
$$;

-- Grants for PostgREST roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

SELECT public.reset_demo_data();
NOTIFY pgrst, 'reload schema';
