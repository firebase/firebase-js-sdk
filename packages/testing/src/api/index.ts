/**
 * @license
 * Copyright 2018 Google LLC
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
import { _FirebaseApp } from '@firebase/app-types/private';
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';
import * as request from 'request';
import { base64 } from '@firebase/util';
import { setLogLevel, LogLevel } from '@firebase/logger';
import { Component, ComponentType } from '@firebase/component';

export { database, firestore } from 'firebase';

/** If this environment variable is set, use it for the database emulator's address. */
const DATABASE_ADDRESS_ENV: string = 'FIREBASE_DATABASE_EMULATOR_ADDRESS';
/** The default address for the local database emulator. */
const DATABASE_ADDRESS_DEFAULT: string = 'localhost:9000';
/** The actual address for the database emulator */
const DATABASE_ADDRESS: string =
  process.env[DATABASE_ADDRESS_ENV] || DATABASE_ADDRESS_DEFAULT;

/** If any of environment variable is set, use it for the Firestore emulator. */
const FIRESTORE_ADDRESS_ENVS: string[] = [
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_FIRESTORE_EMULATOR_ADDRESS'
];
/** The default address for the local Firestore emulator. */
const FIRESTORE_ADDRESS_DEFAULT: string = 'localhost:8080';
/** The actual address for the Firestore emulator */
const FIRESTORE_ADDRESS: string = FIRESTORE_ADDRESS_ENVS.reduce(
  (addr, name) => process.env[name] || addr,
  FIRESTORE_ADDRESS_DEFAULT
);

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
    options.auth ? createUnsecuredJwt(options.auth) : undefined,
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
  let appOptions: { [key: string]: string } = {};
  if (databaseName) {
    appOptions['databaseURL'] = `http://${DATABASE_ADDRESS}?ns=${databaseName}`;
  }
  if (projectId) {
    appOptions['projectId'] = projectId;
  }
  const appName = 'app-' + new Date().getTime() + '-' + Math.random();
  let app = firebase.initializeApp(appOptions, appName);
  if (accessToken) {
    const mockAuthComponent = new Component(
      'auth-internal',
      () =>
        ({
          getToken: async () => ({ accessToken: accessToken }),
          getUid: () => null,
          addAuthTokenListener: listener => {
            // Call listener once immediately with predefined accessToken.
            listener(accessToken);
          },
          removeAuthTokenListener: () => {}
        } as FirebaseAuthInternal),
      ComponentType.PRIVATE
    );

    ((app as unknown) as _FirebaseApp)._addOrOverwriteComponent(
      mockAuthComponent
    );
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
      ssl: false
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
        uri: `http://${DATABASE_ADDRESS}/.settings/rules.json?ns=${options.databaseName}`,
        headers: { Authorization: 'Bearer owner' },
        body: options.rules
      },
      (err, resp, body) => {
        if (err) {
          reject(err);
        } else if (resp.statusCode !== 200) {
          reject(JSON.parse(body).error);
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

  return new Promise((resolve, reject) => {
    request.put(
      {
        uri: `http://${FIRESTORE_ADDRESS}/emulator/v1/projects/${options.projectId}:securityRules`,
        body: JSON.stringify({
          rules: {
            files: [{ content: options.rules }]
          }
        })
      },
      (err, resp, body) => {
        if (err) {
          reject(err);
        } else if (resp.statusCode !== 200) {
          console.log('body', body);
          reject(JSON.parse(body).error);
        } else {
          resolve();
        }
      }
    );
  });
}

export type ClearFirestoreDataOptions = {
  projectId: string;
};
export function clearFirestoreData(
  options: ClearFirestoreDataOptions
): Promise<void> {
  if (!options.projectId) {
    throw new Error('projectId not specified');
  }

  return new Promise((resolve, reject) => {
    request.delete(
      {
        uri: `http://${FIRESTORE_ADDRESS}/emulator/v1/projects/${options.projectId}/databases/(default)/documents`,
        body: JSON.stringify({
          database: `projects/${options.projectId}/databases/(default)`
        })
      },
      (err, resp, body) => {
        if (err) {
          reject(err);
        } else if (resp.statusCode !== 200) {
          console.log('body', body);
          reject(JSON.parse(body).error);
        } else {
          resolve();
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
