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

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';
export type RegistrationRole = 'attendee' | 'speaker' | 'organizer';

export interface Venue {
  id: string;
  slug: string;
  name: string;
  city: string;
  capacity: number;
}

export interface EventMetadata {
  track?: string;
  level?: number;
  description?: string;
}

export interface EventRow {
  id: string;
  venue_id: string | null;
  code: string;
  title: string;
  status: EventStatus;
  is_featured: boolean;
  ticket_price: number;
  tags: string[];
  metadata: EventMetadata;
  schedule: string | null;
  created_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  user_uid: string;
  attendee_email: string;
  role: RegistrationRole;
  checked_in_at: string | null;
}

export interface EventWithRelations extends EventRow {
  venue: Venue | null;
  registrations: Array<
    Pick<Registration, 'id' | 'attendee_email' | 'role' | 'checked_in_at'>
  >;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: number[];
    };
    properties: Record<string, unknown>;
  }>;
}

export type ExampleCategory =
  | 'Client & ServiceConfig'
  | 'QueryBuilder Verbs'
  | 'FilterBuilder Operators'
  | 'TransformBuilder Modifiers'
  | 'Stored Functions (RPC)'
  | 'Builder & Errors';

export interface ExampleOutcome {
  passed: boolean;
  status: number;
  durationMs: number;
  summary: string;
  payload: unknown;
}

export interface DocExampleScenario {
  id: string;
  category: ExampleCategory;
  title: string;
  apiSymbols: string[];
  description: string;
  code: string;
  run: () => Promise<Omit<ExampleOutcome, 'durationMs'>>;
}
