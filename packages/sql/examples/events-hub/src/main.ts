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

import './styles.css';

import { DOC_EXAMPLES_CATALOG } from './examplesCatalog';
import {
  getActiveConnection,
  getActiveSql,
  isConnectionConfigured,
  updateActiveConnection
} from './firebase';
import type {
  EventStatus,
  EventWithRelations,
  ExampleCategory,
  ExampleOutcome,
  GeoJsonFeatureCollection,
  RegistrationRole,
  Venue
} from './types';

interface AppState {
  activeTab: 'hub' | 'runner';
  loadingHub: boolean;
  venues: Venue[];
  events: EventWithRelations[];
  totalEventCount: number | null;
  selectedEventId: string | null;
  remainingSeats: number | null;
  searchQuery: string;
  statusFilter: 'all' | EventStatus;
  cityFilter: string;
  featuredOnly: boolean;
  sortOrder: 'price_asc' | 'price_desc' | 'newest';
  lastInspectorCode: string;
  lastInspectorStatus: string;
  lastInspectorPayload: unknown;
  selectedScenarioId: string;
  runningAll: boolean;
  runningScenarioId: string | null;
  outcomes: Record<string, ExampleOutcome>;
}

const state: AppState = {
  activeTab: 'hub',
  loadingHub: false,
  venues: [],
  events: [],
  totalEventCount: null,
  selectedEventId: null,
  remainingSeats: null,
  searchQuery: '',
  statusFilter: 'all',
  cityFilter: 'all',
  featuredOnly: false,
  sortOrder: 'newest',
  lastInspectorCode:
    '// Copy .env.example to .env (or enter Project ID & Service ID above) and click Connect.',
  lastInspectorStatus: 'Idle',
  lastInspectorPayload: null,
  selectedScenarioId: DOC_EXAMPLES_CATALOG[0].id,
  runningAll: false,
  runningScenarioId: null,
  outcomes: {}
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recordInspector(
  code: string,
  statusLabel: string,
  payload: unknown
): void {
  state.lastInspectorCode = code;
  state.lastInspectorStatus = statusLabel;
  state.lastInspectorPayload = payload;
}

async function loadVenuesAndEvents(): Promise<void> {
  if (!isConnectionConfigured()) {
    state.loadingHub = false;
    render();
    return;
  }
  state.loadingHub = true;
  render();
  const sql = getActiveSql();
  const started = performance.now();

  const venuesRes = await sql
    .from('venues')
    .select('id, slug, name, city, capacity')
    .order('name', { ascending: true })
    .returns<Venue[]>();

  const venueSelectFragment =
    state.cityFilter !== 'all'
      ? 'venue:venues!inner(id, slug, name, city, capacity)'
      : 'venue:venues(id, slug, name, city, capacity)';

  let query = sql
    .from('events')
    .select(
      `id, venue_id, code, title, status, is_featured, ticket_price, tags, metadata, schedule, created_at, ${venueSelectFragment}, registrations(id, attendee_email, role, checked_in_at)`,
      { count: 'exact' }
    );

  const snippetLines: string[] = [
    `let query = sql`,
    `  .from('events')`,
    `  .select('..., ${venueSelectFragment}, registrations(...)', { count: 'exact' })`
  ];

  if (state.statusFilter !== 'all') {
    query = query.eq('status', state.statusFilter);
    snippetLines.push(`  .eq('status', '${state.statusFilter}')`);
  }
  if (state.cityFilter !== 'all') {
    query = query.eq('venue.city', state.cityFilter);
    snippetLines.push(`  .eq('venue.city', '${state.cityFilter}')`);
  }
  if (state.featuredOnly) {
    query = query.match({ is_featured: true });
    snippetLines.push(`  .match({ is_featured: true })`);
  }
  if (state.searchQuery.trim().length > 0) {
    const q = state.searchQuery.trim();
    query = query.textSearch('search_doc', q, {
      type: 'websearch',
      config: 'english'
    });
    snippetLines.push(
      `  .textSearch('search_doc', ${JSON.stringify(q)}, { type: 'websearch', config: 'english' })`
    );
  }

  if (state.sortOrder === 'price_asc') {
    query = query.order('ticket_price', { ascending: true });
    snippetLines.push(`  .order('ticket_price', { ascending: true })`);
  } else if (state.sortOrder === 'price_desc') {
    query = query.order('ticket_price', { ascending: false });
    snippetLines.push(`  .order('ticket_price', { ascending: false })`);
  } else {
    query = query.order('created_at', { ascending: false });
    snippetLines.push(`  .order('created_at', { ascending: false })`);
  }
  snippetLines.push(`  .returns<EventWithRelations[]>();`);

  const eventsRes = await query.returns<EventWithRelations[]>();
  const elapsed = Math.round(performance.now() - started);

  if (venuesRes.success) {
    state.venues = venuesRes.data;
  }
  if (eventsRes.success) {
    state.events = eventsRes.data;
    state.totalEventCount = eventsRes.count;
    if (
      !state.selectedEventId ||
      !state.events.some(ev => ev.id === state.selectedEventId)
    ) {
      state.selectedEventId = state.events[0]?.id ?? null;
    }
    recordInspector(
      snippetLines.join('\n'),
      `HTTP ${eventsRes.status} (${elapsed}ms) • count=${eventsRes.count}`,
      { count: eventsRes.count, events: eventsRes.data }
    );
  } else {
    recordInspector(
      snippetLines.join('\n'),
      `ERROR ${eventsRes.error.code} (${elapsed}ms)`,
      eventsRes.error.toJSON()
    );
  }

  state.loadingHub = false;
  await refreshRemainingSeats();
  render();
}

async function refreshRemainingSeats(): Promise<void> {
  if (!state.selectedEventId) {
    state.remainingSeats = null;
    return;
  }
  const sql = getActiveSql();
  const res = await sql
    .rpc(
      'remaining_seats',
      { target_event_id: state.selectedEventId },
      { get: true }
    )
    .returns<number>();
  state.remainingSeats = res.success ? res.data : null;
}

async function handleResetDemoData(): Promise<void> {
  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql.rpc('reset_demo_data');
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql.rpc('reset_demo_data');`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms)`
      : `ERROR ${res.error.code}`,
    res.success ? res.data : res.error.toJSON()
  );
  await loadVenuesAndEvents();
}

async function handleCreateEvent(form: HTMLFormElement): Promise<void> {
  const fd = new FormData(form);
  const code = String(fd.get('code') || '').trim();
  const title = String(fd.get('title') || '').trim();
  const venueId = String(fd.get('venue_id') || '').trim() || null;
  const price = Number(fd.get('ticket_price') || 0);
  const status = (fd.get('status') || 'published') as EventStatus;
  const tagsRaw = String(fd.get('tags') || 'firebase,postgres');
  const tags = tagsRaw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  if (!code || !title) {
    return;
  }

  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql
    .from('events')
    .insert({
      venue_id: venueId,
      code,
      title,
      status,
      is_featured: fd.get('is_featured') === 'on',
      ticket_price: price,
      tags,
      metadata: { track: 'custom', level: 200 },
      schedule: '[2026-10-15T15:00:00Z,2026-10-15T16:30:00Z)'
    })
    .select('id, code, title, status')
    .single()
    .returns<{
      id: string;
      code: string;
      title: string;
      status: EventStatus;
    }>();
  const elapsed = Math.round(performance.now() - started);

  recordInspector(
    `const res = await sql\n  .from('events')\n  .insert({ code: ${JSON.stringify(code)}, title: ${JSON.stringify(title)}, status: '${status}', ticket_price: ${price}, tags: ${JSON.stringify(tags)} })\n  .select('id, code, title, status')\n  .single();`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms)`
      : `ERROR ${res.error.code} (${elapsed}ms)`,
    res.success ? res.data : res.error.toJSON()
  );

  if (res.success) {
    state.selectedEventId = res.data.id;
    form.reset();
    await loadVenuesAndEvents();
  } else {
    render();
  }
}

async function handleStatusChange(
  eventId: string,
  nextStatus: EventStatus
): Promise<void> {
  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql
    .from('events')
    .update({ status: nextStatus })
    .eq('id', eventId)
    .maxAffected(1)
    .select('id, code, status')
    .single();
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql\n  .from('events')\n  .update({ status: '${nextStatus}' })\n  .eq('id', '${eventId}')\n  .maxAffected(1)\n  .select('id, code, status')\n  .single();`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms)`
      : `ERROR ${res.error.code}`,
    res.success ? res.data : res.error.toJSON()
  );
  await loadVenuesAndEvents();
}

async function handleDeleteEvent(eventId: string): Promise<void> {
  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql
    .from('events')
    .delete({ count: 'exact' })
    .eq('id', eventId)
    .maxAffected(1);
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql\n  .from('events')\n  .delete({ count: 'exact' })\n  .eq('id', '${eventId}')\n  .maxAffected(1);`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms) • deleted=${res.count}`
      : `ERROR ${res.error.code}`,
    res.success ? { count: res.count } : res.error.toJSON()
  );
  if (state.selectedEventId === eventId) {
    state.selectedEventId = null;
  }
  await loadVenuesAndEvents();
}

async function handleUpsertRegistration(
  eventId: string,
  form: HTMLFormElement
): Promise<void> {
  const fd = new FormData(form);
  const email = String(fd.get('attendee_email') || '').trim();
  const role = (fd.get('role') || 'attendee') as RegistrationRole;
  if (!email) {
    return;
  }
  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql
    .from('registrations')
    .upsert(
      {
        event_id: eventId,
        user_uid: `web_${email.split('@')[0]}`,
        attendee_email: email,
        role
      },
      { onConflict: 'event_id,attendee_email', count: 'exact' }
    )
    .select('id, attendee_email, role, checked_in_at')
    .single();
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql\n  .from('registrations')\n  .upsert({ event_id: '${eventId}', attendee_email: ${JSON.stringify(email)}, role: '${role}' }, { onConflict: 'event_id,attendee_email', count: 'exact' })\n  .select('id, attendee_email, role, checked_in_at')\n  .single();`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms)`
      : `ERROR ${res.error.code}`,
    res.success ? res.data : res.error.toJSON()
  );
  form.reset();
  await loadVenuesAndEvents();
}

async function handleToggleCheckIn(
  regId: string,
  currentlyCheckedIn: boolean
): Promise<void> {
  const sql = getActiveSql();
  const nextVal = currentlyCheckedIn ? null : new Date().toISOString();
  const started = performance.now();
  const res = await sql
    .from('registrations')
    .update({ checked_in_at: nextVal })
    .eq('id', regId)
    .maxAffected(1)
    .select('id, attendee_email, checked_in_at')
    .single();
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql\n  .from('registrations')\n  .update({ checked_in_at: ${JSON.stringify(nextVal)} })\n  .eq('id', '${regId}')\n  .maxAffected(1)\n  .select('id, attendee_email, checked_in_at')\n  .single();`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms)`
      : `ERROR ${res.error.code}`,
    res.success ? res.data : res.error.toJSON()
  );
  await loadVenuesAndEvents();
}

async function handleExportCsv(eventId: string): Promise<void> {
  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql
    .from('registrations')
    .select('attendee_email, role, checked_in_at')
    .eq('event_id', eventId)
    .order('attendee_email', { ascending: true })
    .csv();
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql\n  .from('registrations')\n  .select('attendee_email, role, checked_in_at')\n  .eq('event_id', '${eventId}')\n  .order('attendee_email', { ascending: true })\n  .csv();`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms) • text/csv`
      : `ERROR ${res.error.code}`,
    res.success ? res.data : res.error.toJSON()
  );
  render();
}

async function handleInspectGeoJson(): Promise<void> {
  const sql = getActiveSql();
  const started = performance.now();
  const res = await sql
    .from('venues')
    .select('id, slug, name, city, capacity, coords')
    .geojson()
    .returns<GeoJsonFeatureCollection>();
  const elapsed = Math.round(performance.now() - started);
  recordInspector(
    `const res = await sql\n  .from('venues')\n  .select('id, slug, name, city, capacity, coords')\n  .geojson()\n  .returns<GeoJsonFeatureCollection>();`,
    res.success
      ? `HTTP ${res.status} (${elapsed}ms) • FeatureCollection (${res.data.features.length} features)`
      : `ERROR ${res.error.code}`,
    res.success ? res.data : res.error.toJSON()
  );
  render();
}

async function runSingleScenario(scenarioId: string): Promise<void> {
  const scenario = DOC_EXAMPLES_CATALOG.find(item => item.id === scenarioId);
  if (!scenario) {
    return;
  }
  state.runningScenarioId = scenario.id;
  state.selectedScenarioId = scenario.id;
  render();

  const started = performance.now();
  try {
    const res = await scenario.run();
    state.outcomes[scenario.id] = {
      ...res,
      durationMs: Math.round(performance.now() - started)
    };
  } catch (err) {
    state.outcomes[scenario.id] = {
      passed: false,
      status: 0,
      durationMs: Math.round(performance.now() - started),
      summary: err instanceof Error ? err.message : String(err),
      payload: err
    };
  }
  state.runningScenarioId = null;
  render();
}

async function runAllScenarios(): Promise<void> {
  if (state.runningAll) {
    return;
  }
  state.runningAll = true;
  render();

  const sql = getActiveSql();
  await sql.rpc('reset_demo_data');

  for (const scenario of DOC_EXAMPLES_CATALOG) {
    await runSingleScenario(scenario.id);
  }

  await sql.rpc('reset_demo_data');
  state.runningAll = false;
  render();
}

function renderHubView(): string {
  const cities = Array.from(new Set(state.venues.map(v => v.city))).sort();
  const selectedEvent =
    state.events.find(ev => ev.id === state.selectedEventId) ?? null;

  return `
    <div class="hub-grid">
      <div class="card">
        <div class="event-head">
          <h2>Events Catalog (${state.totalEventCount ?? state.events.length})</h2>
          <div style="display:flex;gap:8px;">
            <button class="btn" id="btn-geojson" type="button">Venues GeoJSON</button>
            <button class="btn" id="btn-reset-seed" type="button">Reset Seed Data</button>
          </div>
        </div>

        <div class="filter-row">
          <input id="inp-search" type="search" placeholder="Full-text search (e.g. &quot;vector search&quot; or serverless)..." value="${escapeHtml(state.searchQuery)}" />
          <select id="sel-status">
            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="published" ${state.statusFilter === 'published' ? 'selected' : ''}>Published</option>
            <option value="draft" ${state.statusFilter === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="cancelled" ${state.statusFilter === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            <option value="archived" ${state.statusFilter === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
          <select id="sel-city">
            <option value="all">All Cities</option>
            ${cities
              .map(
                c =>
                  `<option value="${escapeHtml(c)}" ${state.cityFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
              )
              .join('')}
          </select>
          <select id="sel-sort">
            <option value="newest" ${state.sortOrder === 'newest' ? 'selected' : ''}>Newest First</option>
            <option value="price_asc" ${state.sortOrder === 'price_asc' ? 'selected' : ''}>Price: Low → High</option>
            <option value="price_desc" ${state.sortOrder === 'price_desc' ? 'selected' : ''}>Price: High → Low</option>
          </select>
          <label class="muted" style="display:flex;align-items:center;gap:5px;">
            <input id="chk-featured" type="checkbox" ${state.featuredOnly ? 'checked' : ''} />
            Featured
          </label>
          <button class="btn primary" id="btn-apply-filters" type="button">Search</button>
        </div>

        <div class="event-list">
          ${
            state.events.length === 0
              ? `<p class="muted">No events matched current filters.</p>`
              : state.events
                  .map(
                    ev => `
                <div class="event-item ${ev.id === state.selectedEventId ? 'selected' : ''}" data-select-event="${ev.id}">
                  <div class="event-head">
                    <div>
                      <strong>${escapeHtml(ev.title)}</strong>
                      <div class="muted">${escapeHtml(ev.code)}</div>
                    </div>
                    <span class="badge ${ev.status}">${ev.status}</span>
                  </div>
                  <div class="event-meta">
                    <span>📍 ${ev.venue ? `${escapeHtml(ev.venue.name)} (${escapeHtml(ev.venue.city)})` : 'Virtual / Online'}</span>
                    <span>💵 $${Number(ev.ticket_price).toFixed(2)}</span>
                    <span>👥 ${ev.registrations.length} registered</span>
                    ${ev.tags.map(t => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('')}
                  </div>
                </div>`
                  )
                  .join('')
          }
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          ${
            selectedEvent
              ? `
            <div class="event-head">
              <div>
                <h3>${escapeHtml(selectedEvent.title)}</h3>
                <div class="muted">RPC <code>remaining_seats</code>: <strong>${state.remainingSeats ?? '—'}</strong> seats remaining</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${
                  selectedEvent.status !== 'published'
                    ? `<button class="btn" data-set-status="published" data-event-id="${selectedEvent.id}">Publish</button>`
                    : `<button class="btn" data-set-status="cancelled" data-event-id="${selectedEvent.id}">Cancel</button>`
                }
                <button class="btn" id="btn-export-csv" data-event-id="${selectedEvent.id}">Export CSV</button>
                <button class="btn danger" id="btn-delete-event" data-event-id="${selectedEvent.id}">Delete</button>
              </div>
            </div>

            <h3 style="margin-top:14px;">Attendee Registrations (${selectedEvent.registrations.length})</h3>
            <div>
              ${
                selectedEvent.registrations.length === 0
                  ? `<p class="muted">No registrations yet.</p>`
                  : selectedEvent.registrations
                      .map(
                        reg => `
                    <div class="reg-row">
                      <div>
                        <strong>${escapeHtml(reg.attendee_email)}</strong>
                        <span class="tag-chip">${escapeHtml(reg.role)}</span>
                      </div>
                      <button class="btn" data-toggle-checkin="${reg.id}" data-checked="${reg.checked_in_at ? '1' : '0'}">
                        ${reg.checked_in_at ? '✅ Checked In' : 'Check In'}
                      </button>
                    </div>`
                      )
                      .join('')
              }
            </div>

            <form id="form-upsert-reg" class="form-grid" style="margin-top:12px;">
              <input name="attendee_email" type="email" placeholder="attendee@example.com" required />
              <select name="role">
                <option value="attendee">attendee</option>
                <option value="speaker">speaker</option>
                <option value="organizer">organizer</option>
              </select>
              <button class="btn primary full" type="submit">Upsert Registration (onConflict: event_id,attendee_email)</button>
            </form>
          `
              : `<p class="muted">Select an event to manage registrations and check-ins.</p>`
          }
        </div>

        <div class="card">
          <h3>Create New Event (<code>insert().select().single()</code>)</h3>
          <form id="form-create-event" class="form-grid">
            <input name="code" placeholder="Code (e.g. FSQL-DEMO-01)" required />
            <input name="ticket_price" type="number" step="0.01" value="29" placeholder="Price" />
            <input class="full" name="title" placeholder="Session Title" required />
            <select name="venue_id">
              <option value="">Virtual (NULL venue_id)</option>
              ${state.venues
                .map(
                  v =>
                    `<option value="${v.id}">${escapeHtml(v.name)} — ${escapeHtml(v.city)}</option>`
                )
                .join('')}
            </select>
            <select name="status">
              <option value="published">published</option>
              <option value="draft">draft</option>
            </select>
            <input class="full" name="tags" value="firebase,postgres" placeholder="Comma-separated tags" />
            <label class="muted full" style="display:flex;align-items:center;gap:6px;">
              <input name="is_featured" type="checkbox" /> Mark as featured event
            </label>
            <button class="btn primary full" type="submit">Insert Event</button>
          </form>
        </div>
      </div>
    </div>

    <div class="card inspector">
      <div class="event-head">
        <h3>Live SDK Query Inspector</h3>
        <span class="badge">${escapeHtml(state.lastInspectorStatus)}</span>
      </div>
      <div class="split-cols">
        <div>
          <div class="muted" style="margin-bottom:6px;">Executed <code>firebase/sql</code> Code</div>
          <pre>${escapeHtml(state.lastInspectorCode)}</pre>
        </div>
        <div>
          <div class="muted" style="margin-bottom:6px;">Resolved <code>OperationResult</code> / Payload</div>
          <pre>${escapeHtml(
            typeof state.lastInspectorPayload === 'string'
              ? state.lastInspectorPayload
              : (JSON.stringify(state.lastInspectorPayload, null, 2) ?? 'null')
          )}</pre>
        </div>
      </div>
    </div>
  `;
}

function renderRunnerView(): string {
  const categories: ExampleCategory[] = [
    'Client & Settings',
    'QueryBuilder Verbs',
    'FilterBuilder Operators',
    'TransformBuilder Modifiers',
    'Stored Functions (RPC)',
    'Builder & Errors'
  ];

  const totalRun = Object.keys(state.outcomes).length;
  const passedCount = Object.values(state.outcomes).filter(
    o => o.passed
  ).length;
  const selectedScenario =
    DOC_EXAMPLES_CATALOG.find(s => s.id === state.selectedScenarioId) ??
    DOC_EXAMPLES_CATALOG[0];
  const selectedOutcome = state.outcomes[selectedScenario.id];

  return `
    <div class="runner-header">
      <div>
        <h2 style="margin:0;font-size:1.1rem;">Comprehensive Documentation Examples Verification (${DOC_EXAMPLES_CATALOG.length} Live Scenarios)</h2>
        <div class="muted">Executes every documented <code>firebase/sql</code> verb, filter operator, transform modifier, RPC mode, and error envelope live against Firebase SQL.</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="badge ${totalRun > 0 && passedCount === totalRun ? 'pass' : ''}" id="runner-summary-badge">
          ${totalRun === 0 ? 'Not run yet' : `${passedCount} / ${totalRun} Passed`}
        </span>
        <button class="btn primary" id="btn-run-all" ${state.runningAll ? 'disabled' : ''}>
          ${state.runningAll ? 'Running Suite...' : `Run All ${DOC_EXAMPLES_CATALOG.length} Examples`}
        </button>
      </div>
    </div>

    <div class="runner-grid">
      <div class="card scenario-list">
        ${categories
          .map(cat => {
            const items = DOC_EXAMPLES_CATALOG.filter(s => s.category === cat);
            return `
              <div class="cat-label">${escapeHtml(cat)} (${items.length})</div>
              ${items
                .map(item => {
                  const outcome = state.outcomes[item.id];
                  const statusBadge =
                    state.runningScenarioId === item.id
                      ? '⏳'
                      : outcome
                        ? outcome.passed
                          ? '✅'
                          : '❌'
                        : '•';
                  return `
                    <button class="scenario-btn ${item.id === selectedScenario.id ? 'active' : ''}" data-scenario-id="${item.id}" type="button">
                      <span>${escapeHtml(item.title)}</span>
                      <span>${statusBadge}</span>
                    </button>`;
                })
                .join('')}`;
          })
          .join('')}
      </div>

      <div class="card">
        <div class="event-head">
          <div>
            <h3 style="margin-bottom:4px;">${escapeHtml(selectedScenario.title)}</h3>
            <div class="muted">${escapeHtml(selectedScenario.description)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
              ${selectedScenario.apiSymbols
                .map(sym => `<span class="tag-chip">${escapeHtml(sym)}</span>`)
                .join('')}
            </div>
          </div>
          <button class="btn primary" id="btn-run-selected" data-run-id="${selectedScenario.id}" ${state.runningScenarioId ? 'disabled' : ''}>
            ${state.runningScenarioId === selectedScenario.id ? 'Running...' : 'Run Example'}
          </button>
        </div>

        <div style="margin-top:14px;">
          <div class="muted" style="margin-bottom:6px;">TSDoc Reference Snippet</div>
          <pre>${escapeHtml(selectedScenario.code)}</pre>
        </div>

        <div style="margin-top:14px;">
          <div class="event-head" style="margin-bottom:6px;">
            <span class="muted">Live Execution Result</span>
            ${
              selectedOutcome
                ? `<span class="badge ${selectedOutcome.passed ? 'pass' : 'fail'}">
                    ${selectedOutcome.passed ? 'PASS' : 'FAIL'} • HTTP ${selectedOutcome.status} • ${selectedOutcome.durationMs}ms
                   </span>`
                : `<span class="muted">Click "Run Example" or "Run All"</span>`
            }
          </div>
          ${
            selectedOutcome
              ? `<p style="margin:4px 0 8px;font-size:0.85rem;">${escapeHtml(selectedOutcome.summary)}</p>
                 <pre>${escapeHtml(
                   typeof selectedOutcome.payload === 'string'
                     ? selectedOutcome.payload
                     : JSON.stringify(selectedOutcome.payload, null, 2)
                 )}</pre>`
              : `<pre>// Output will appear here after running against live Firebase SQL.</pre>`
          }
        </div>
      </div>
    </div>
  `;
}

function render(): void {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }
  const conn = getActiveConnection();
  const projectLabel = conn.projectId || 'unconfigured (.env)';

  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <h1>
            Firebase SQL — Events &amp; Venues Hub
            <span class="badge">firebase/sql</span>
          </h1>
          <p>Live interactive sample app &amp; end-to-end TSDoc verification suite (${escapeHtml(projectLabel)})</p>
        </div>
        <nav class="tabs">
          <button class="btn ${state.activeTab === 'hub' ? 'tab-active' : ''}" id="tab-hub" type="button">
            Interactive Events Hub
          </button>
          <button class="btn ${state.activeTab === 'runner' ? 'tab-active' : ''}" id="tab-runner" type="button">
            Docs Examples Runner (${DOC_EXAMPLES_CATALOG.length})
          </button>
        </nav>
      </header>

      <form id="form-conn" class="conn-bar">
        <label>Project <input name="projectId" placeholder="my-firebase-project" value="${escapeHtml(conn.projectId)}" size="16" required /></label>
        <label>Service ID <input name="serviceId" placeholder="my-sql-service" value="${escapeHtml(conn.serviceId)}" size="13" required /></label>
        <label>Location <input name="location" placeholder="us-central1" value="${escapeHtml(conn.location)}" size="12" required /></label>
        <label>API Key <input name="apiKey" type="password" placeholder="Optional" value="${escapeHtml(conn.apiKey)}" size="12" /></label>
        <label>App ID <input name="appId" placeholder="Optional" value="${escapeHtml(conn.appId)}" size="12" /></label>
        <button class="btn" type="submit">Connect</button>
      </form>

      ${state.activeTab === 'hub' ? renderHubView() : renderRunnerView()}
    </div>
  `;

  bindEvents();
}

function bindEvents(): void {
  document.getElementById('tab-hub')?.addEventListener('click', () => {
    state.activeTab = 'hub';
    render();
  });
  document.getElementById('tab-runner')?.addEventListener('click', () => {
    state.activeTab = 'runner';
    render();
  });

  document.getElementById('form-conn')?.addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget as HTMLFormElement);
    const curr = getActiveConnection();
    await updateActiveConnection({
      projectId: String(fd.get('projectId') ?? curr.projectId).trim(),
      serviceId: String(fd.get('serviceId') ?? curr.serviceId).trim(),
      location: String(fd.get('location') ?? curr.location).trim(),
      apiKey: String(fd.get('apiKey') ?? curr.apiKey).trim(),
      appId: String(fd.get('appId') ?? curr.appId).trim()
    });
    await loadVenuesAndEvents();
  });

  if (state.activeTab === 'hub') {
    document
      .getElementById('btn-apply-filters')
      ?.addEventListener('click', () => {
        state.searchQuery =
          (document.getElementById('inp-search') as HTMLInputElement | null)
            ?.value ?? '';
        state.statusFilter = ((
          document.getElementById('sel-status') as HTMLSelectElement | null
        )?.value ?? 'all') as 'all' | EventStatus;
        state.cityFilter =
          (document.getElementById('sel-city') as HTMLSelectElement | null)
            ?.value ?? 'all';
        state.sortOrder = ((
          document.getElementById('sel-sort') as HTMLSelectElement | null
        )?.value ?? 'newest') as AppState['sortOrder'];
        state.featuredOnly = Boolean(
          (document.getElementById('chk-featured') as HTMLInputElement | null)
            ?.checked
        );
        void loadVenuesAndEvents();
      });

    document
      .getElementById('inp-search')
      ?.addEventListener('keydown', keyEv => {
        if (keyEv.key === 'Enter') {
          document.getElementById('btn-apply-filters')?.click();
        }
      });

    document
      .getElementById('btn-reset-seed')
      ?.addEventListener('click', () => void handleResetDemoData());

    document
      .getElementById('btn-geojson')
      ?.addEventListener('click', () => void handleInspectGeoJson());

    document.querySelectorAll('[data-select-event]').forEach(el => {
      el.addEventListener('click', async () => {
        state.selectedEventId = el.getAttribute('data-select-event');
        await refreshRemainingSeats();
        render();
      });
    });

    document.querySelectorAll('[data-set-status]').forEach(el => {
      el.addEventListener('click', () => {
        const eventId = el.getAttribute('data-event-id');
        const nextStatus = el.getAttribute('data-set-status') as EventStatus;
        if (eventId && nextStatus) {
          void handleStatusChange(eventId, nextStatus);
        }
      });
    });

    document
      .getElementById('btn-delete-event')
      ?.addEventListener('click', ev => {
        const eventId = (ev.currentTarget as HTMLElement).getAttribute(
          'data-event-id'
        );
        if (eventId) {
          void handleDeleteEvent(eventId);
        }
      });

    document.getElementById('btn-export-csv')?.addEventListener('click', ev => {
      const eventId = (ev.currentTarget as HTMLElement).getAttribute(
        'data-event-id'
      );
      if (eventId) {
        void handleExportCsv(eventId);
      }
    });

    document.querySelectorAll('[data-toggle-checkin]').forEach(el => {
      el.addEventListener('click', () => {
        const regId = el.getAttribute('data-toggle-checkin');
        const checked = el.getAttribute('data-checked') === '1';
        if (regId) {
          void handleToggleCheckIn(regId, checked);
        }
      });
    });

    document
      .getElementById('form-upsert-reg')
      ?.addEventListener('submit', ev => {
        ev.preventDefault();
        if (state.selectedEventId) {
          void handleUpsertRegistration(
            state.selectedEventId,
            ev.currentTarget as HTMLFormElement
          );
        }
      });

    document
      .getElementById('form-create-event')
      ?.addEventListener('submit', ev => {
        ev.preventDefault();
        void handleCreateEvent(ev.currentTarget as HTMLFormElement);
      });
  } else {
    document.querySelectorAll('[data-scenario-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-scenario-id');
        if (id) {
          state.selectedScenarioId = id;
          render();
        }
      });
    });

    document
      .getElementById('btn-run-selected')
      ?.addEventListener('click', ev => {
        const id = (ev.currentTarget as HTMLElement).getAttribute(
          'data-run-id'
        );
        if (id) {
          void runSingleScenario(id);
        }
      });

    document
      .getElementById('btn-run-all')
      ?.addEventListener('click', () => void runAllScenarios());
  }
}

void loadVenuesAndEvents();
