/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  deleteToken,
  getMessaging,
  getToken,
  onRegistered,
  onUnregistered,
  register,
  unregister
} from 'firebase/messaging';
import { firebaseConfig, vapidKey } from './config';
import {
  formatIdbSummary,
  readMessagingIdbState,
  resetFirebaseClientIndexedDatabases
} from './idb-state';

/** Vite injects `BASE`; fall back when undefined (e.g. some test runners or older tooling). */
function viteBasePath(): string {
  const raw = import.meta.env.BASE;
  const base = raw == null || raw === '' ? '/' : raw;
  return base.endsWith('/') ? base : `${base}/`;
}

/** Static ESM worker in `public/` (CDN Firebase 12.13.x); scope `/` works with Vite and Hosting. */
function serviceWorkerScriptUrl(): string {
  return new URL('firebase-messaging-sw.js', new URL(viteBasePath(), self.location.origin)).href;
}

const logEl = document.querySelector('#log') as HTMLPreElement;
const idbEl = document.querySelector('#idb') as HTMLPreElement;
const permLabel = document.querySelector('#perm-label') as HTMLSpanElement;

function log(line: string): void {
  const t = new Date().toISOString().slice(11, 23);
  logEl.textContent += `[${t}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function assertVapid(): boolean {
  if (!vapidKey) {
    log('Error: vapidKey is not set in src/config.ts.');
    return false;
  }
  return true;
}

async function refreshIdb(): Promise<void> {
  const state = await readMessagingIdbState(firebaseConfig.appId);
  idbEl.textContent =
    formatIdbSummary(state) +
    '\n\nraw:\n' +
    JSON.stringify(state, null, 2);
}

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

let swRegistration: ServiceWorkerRegistration | null = null;

onRegistered(messaging, fid => {
  log(`onRegistered → fid: ${fid}`);
  void refreshIdb();
});

onUnregistered(messaging, fid => {
  log(`onUnregistered → fid: ${fid}`);
  void refreshIdb();
});

/** `deleteToken` uses `messaging.swRegistration` when set; otherwise it calls `registerDefaultSw` (classic worker), which cannot load our ESM `firebase-messaging-sw.js`. */
function syncMessagingServiceWorker(
  reg: ServiceWorkerRegistration | null | undefined
): void {
  const m = messaging as { swRegistration?: ServiceWorkerRegistration };
  m.swRegistration = reg ?? undefined;
}

async function ensureSw(): Promise<ServiceWorkerRegistration> {
  if (swRegistration) {
    syncMessagingServiceWorker(swRegistration);
    return swRegistration;
  }
  const scope = viteBasePath();
  swRegistration = await navigator.serviceWorker.register(
    serviceWorkerScriptUrl(),
    { type: 'module', scope }
  );
  log(`Service worker registered: ${swRegistration.scope}`);
  syncMessagingServiceWorker(swRegistration);
  return swRegistration;
}

function wire(id: string, fn: () => void | Promise<void>): void {
  document.querySelector(id)!.addEventListener('click', () => {
    void (async () => {
      try {
        await fn();
      } catch (e) {
        log(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
      await refreshIdb();
    })();
  });
}

document.querySelector('#btn-permission')!.addEventListener('click', () => {
  void (async () => {
    const p = await Notification.requestPermission();
    permLabel.textContent = `permission = ${p}`;
    log(`Notification.requestPermission → ${p}`);
  })();
});

wire('#btn-get-token', async () => {
  if (!assertVapid()) {
    return;
  }
  await ensureSw();
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration! });
  log(`getToken → ok, token prefix: ${token.slice(0, 24)}…`);
});

wire('#btn-delete-token', async () => {
  await ensureSw();
  const ok = await deleteToken(messaging);
  log(`deleteToken → ${ok}`);
});

wire('#btn-register', async () => {
  if (!assertVapid()) {
    return;
  }
  await ensureSw();
  await register(messaging, { vapidKey, serviceWorkerRegistration: swRegistration! });
  log('register() resolved (FID is delivered via onRegistered).');
});

wire('#btn-unregister', async () => {
  await ensureSw();
  await unregister(messaging);
  log('unregister() promise resolved');
});

document.querySelector('#btn-refresh-idb')!.addEventListener('click', () => {
  void refreshIdb();
});

document.querySelector('#btn-reset-dbs')!.addEventListener('click', () => {
  void (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      swRegistration = null;
      syncMessagingServiceWorker(null);
      log(`Unregistered ${regs.length} service worker(s).`);
      await resetFirebaseClientIndexedDatabases();
      log(
        'Deleted IndexedDB: firebase-messaging-database, firebase-installations-database.'
      );
      if (
        window.confirm(
          'Reload the page now? (Recommended so Messaging and Installations drop in-memory DB handles.)'
        )
      ) {
        location.reload();
        return;
      }
    } catch (e) {
      log(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    await refreshIdb();
  })();
});

permLabel.textContent = `permission = ${Notification.permission}`;
void refreshIdb();
log('Page loaded: request notification permission before APIs that require it.');
