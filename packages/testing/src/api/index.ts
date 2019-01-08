/**
 * Copyright 2018 Google Inc.
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

import * as firebase from 'firebase';
import * as request from 'request';
import { base64 } from '@firebase/util';
import { setLogLevel, LogLevel } from '@firebase/logger';
import * as grpc from 'grpc';
import { resolve } from 'path';
import * as fs from 'fs';

export { database, firestore } from 'firebase';

const PROTO_ROOT = {
  root: resolve(
    __dirname,
    process.env.FIRESTORE_EMULATOR_PROTO_ROOT || '../protos'
  ),
  file: 'google/firestore/emulator/v1/firestore_emulator.proto'
};
const PROTOS = grpc.load(PROTO_ROOT, /* format = */ 'proto');
const EMULATOR = PROTOS['google']['firestore']['emulator']['v1'];

/** If this environment variable is set, use it for the database emulator's address. */
const DATABASE_ADDRESS_ENV: string = 'FIREBASE_DATABASE_EMULATOR_ADDRESS';
/** The default address for the local database emulator. */
const DATABASE_ADDRESS_DEFAULT: string = 'localhost:9000';
/** The actual address for the database emulator */
const DATABASE_ADDRESS: string =
  process.env[DATABASE_ADDRESS_ENV] || DATABASE_ADDRESS_DEFAULT;

/** If this environment variable is set, use it for the Firestore emulator. */
const FIRESTORE_ADDRESS_ENV: string = 'FIREBASE_FIRESTORE_EMULATOR_ADDRESS';
/** The default address for the local Firestore emulator. */
const FIRESTORE_ADDRESS_DEFAULT: string = 'localhost:8080';
/** The actual address for the Firestore emulator */
const FIRESTORE_ADDRESS: string =
  process.env[FIRESTORE_ADDRESS_ENV] || FIRESTORE_ADDRESS_DEFAULT;

/** Passing this in tells the emulator to treat you as an admin. */
const ADMIN_TOKEN = 'owner';
/** Create an unsecured JWT for the given auth payload. See https://tools.ietf.org/html/rfc7519#section-6. */
function createUnsecuredJwt(auth: object): string {
  // Unsecured JWTs use "none" as the algorithm.
  const header = {
    alg: 'none',
    kid: 'fakekid'
  };
  // Ensure that the auth payload has a value for 'iat'.
  (auth as any).iat = (auth as any).iat || 0;
  // Use `uid` field as a backup when `sub` is missing.
  (auth as any).sub = (auth as any).sub || (auth as any).uid;
  if (!(auth as any).sub) {
    throw new Error("auth must be an object with a 'sub' or 'uid' field");
  }
  // Unsecured JWTs use the empty string as a signature.
  const signature = '';
  return [
    base64.encodeString(JSON.stringify(header), /*webSafe=*/ false),
    base64.encodeString(JSON.stringify(auth), /*webSafe=*/ false),
    signature
  ].join('.');
}

export function apps(): firebase.app.App[] {
  return firebase.apps;
}

export type AppOptions = {
  databaseName?: string;
  projectId?: string;
  auth?: object;
};
/** Construct an App authenticated with options.auth. */
export function initializeTestApp(options: AppOptions): firebase.app.App {
  return initializeApp(
    options.auth ? createUnsecuredJwt(options.auth) : null,
    options.databaseName,
    options.projectId
  );
}

export type AdminAppOptions = {
  databaseName?: string;
  projectId?: string;
};
/** Construct an App authenticated as an admin user. */
export function initializeAdminApp(options: AdminAppOptions): firebase.app.App {
  return initializeApp(ADMIN_TOKEN, options.databaseName, options.projectId);
}

function initializeApp(
  accessToken?: string,
  databaseName?: string,
  projectId?: string
): firebase.app.App {
  let appOptions = {};
  if (databaseName) {
    appOptions['databaseURL'] = `http://${DATABASE_ADDRESS}?ns=${databaseName}`;
  }
  if (projectId) {
    appOptions['projectId'] = projectId;
  }
  const appName = 'app-' + new Date().getTime() + '-' + Math.random();
  let app = firebase.initializeApp(appOptions, appName);
  // hijacking INTERNAL.getToken to bypass FirebaseAuth and allows specifying of auth headers
  if (accessToken) {
    (app as any).INTERNAL.getToken = () =>
      Promise.resolve({ accessToken: accessToken });
  }
  if (databaseName) {
    // Toggle network connectivity to force a reauthentication attempt.
    // This mitigates a minor race condition where the client can send the
    // first database request before authenticating.
    app.database().goOffline();
    app.database().goOnline();
  }
  if (projectId) {
    app.firestore().settings({
      host: FIRESTORE_ADDRESS,
      ssl: false,
      timestampsInSnapshots: true
    });
  }
  /**
  Mute warnings for the previously-created database and whatever other
  objects were just created.
 */
  setLogLevel(LogLevel.ERROR);
  return app;
}

export type LoadDatabaseRulesOptions = {
  databaseName: string;
  rules: string;
};
export function loadDatabaseRules(
  options: LoadDatabaseRulesOptions
): Promise<void> {
  if (!options.databaseName) {
    throw Error('databaseName not specified');
  }

  if (!options.rules) {
    throw Error('must provide rules to loadDatabaseRules');
  }

  return new Promise((resolve, reject) => {
    request.put(
      {
        uri: `http://${DATABASE_ADDRESS}/.settings/rules.json?ns=${
          options.databaseName
        }`,
        headers: { Authorization: 'Bearer owner' },
        body: options.rules
      },
      (err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export type LoadFirestoreRulesOptions = {
  projectId: string;
  rules: string;
};
export function loadFirestoreRules(
  options: LoadFirestoreRulesOptions
): Promise<void> {
  if (!options.projectId) {
    throw new Error('projectId not specified');
  }

  if (!options.rules) {
    throw new Error('must provide rules to loadFirestoreRules');
  }

  let client = new EMULATOR.FirestoreEmulator(
    FIRESTORE_ADDRESS,
    grpc.credentials.createInsecure(),
    {
      // Cap how much backoff gRPC will perform. This is testing code, so
      // efficiency is less important than responsiveness.
      'grpc.initial_reconnect_backoff_ms': 100,
      'grpc.max_reconnect_backoff_ms': 100
    }
  );
  return new Promise((resolve, reject) => {
    client.setSecurityRules(
      {
        project: `projects/${options.projectId}`,
        rules: { files: [{ content: options.rules }] }
      },
      (err, resp) => {
        if (err) {
          reject(err);
        } else {
          resolve(resp);
        }
      }
    );
  });
}

export function assertFails(pr: Promise<any>): any {
  return pr.then(
    v =>
      Promise.reject(new Error('Expected request to fail, but it succeeded.')),
    err => err
  );
}

export function assertSucceeds(pr: Promise<any>): any {
  return pr;
}
