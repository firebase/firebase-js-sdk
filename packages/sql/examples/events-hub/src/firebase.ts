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

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getSql, terminate, type FirebaseSql } from 'firebase/sql';

export interface ConnectionConfig {
  projectId: string;
  apiKey: string;
  appId: string;
  serviceId: string;
  location: string;
}

export const DEFAULT_CONNECTION: ConnectionConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  serviceId: import.meta.env.VITE_SQL_SERVICE_ID || '',
  location: import.meta.env.VITE_SQL_LOCATION || 'us-central1'
};

let activeConfig: ConnectionConfig = { ...DEFAULT_CONNECTION };
let activeSql: FirebaseSql | null = null;

export function isConnectionConfigured(
  config: ConnectionConfig = activeConfig
): boolean {
  return (
    config.projectId.trim().length > 0 &&
    config.serviceId.trim().length > 0 &&
    config.location.trim().length > 0
  );
}

export function getFirebaseApp(
  config: ConnectionConfig = activeConfig
): FirebaseApp {
  const appName = `events-hub:${config.projectId}:${config.apiKey || 'no-key'}`;
  const existing = getApps().find(candidate => candidate.name === appName);
  if (existing) {
    return existing;
  }
  return initializeApp(
    {
      projectId: config.projectId,
      ...(config.apiKey ? { apiKey: config.apiKey } : {}),
      ...(config.appId ? { appId: config.appId } : {})
    },
    appName
  );
}

export function getActiveSql(): FirebaseSql {
  if (!activeSql) {
    const app = getFirebaseApp(activeConfig);
    activeSql = getSql(app, {
      serviceId: activeConfig.serviceId,
      location: activeConfig.location
    });
  }
  return activeSql;
}

export function getActiveConnection(): ConnectionConfig {
  return { ...activeConfig };
}

export async function updateActiveConnection(
  next: ConnectionConfig
): Promise<FirebaseSql | null> {
  if (activeSql) {
    await terminate(activeSql);
    activeSql = null;
  }
  activeConfig = { ...next };
  return isConnectionConfigured(activeConfig) ? getActiveSql() : null;
}
