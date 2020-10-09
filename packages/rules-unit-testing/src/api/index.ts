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
const DATABASE_ADDRESS_ENV: string = 'FIREBASE_DATABASE_EMULATOR_HOST';
/** The default address for the local database emulator. */
const DATABASE_ADDRESS_DEFAULT: string = 'localhost:9000';

/** If any of environment variable is set, use it for the Firestore emulator. */
const FIRESTORE_ADDRESS_ENV: string = 'FIRESTORE_EMULATOR_HOST';
/** The default address for the local Firestore emulator. */
const FIRESTORE_ADDRESS_DEFAULT: string = 'localhost:8080';

/** The actual address for the database emulator */
let _databaseHost: string | undefined = undefined;

/** The actual address for the Firestore emulator */
let _firestoreHost: string | undefined = undefined;

export type Provider =
  | 'custom'
  | 'email'
  | 'password'
  | 'phone'
  | 'anonymous'
  | 'google.com'
  | 'facebook.com'
  | 'github.com'
  | 'twitter.com'
  | 'microsoft.com'
  | 'apple.com';

export type FirebaseIdToken = {
  // Always set to https://securetoken.google.com/PROJECT_ID
  iss: string;

  // Always set to PROJECT_ID
  aud: string;

  // The user's unique id
  sub: string;

  // The token issue time, in seconds since epoch
  iat: number;

  // The token expiry time, normally 'iat' + 3600
  exp: number;

  // The user's unique id, must be equal to 'sub'
  user_id: string;

  // The time the user authenticated, normally 'iat'
  auth_time: number;

  // The sign in provider, only set when the provider is 'anonymous'
  provider_id?: 'anonymous';

  // The user's primary email
  email?: string;

  // The user's email verification status
  email_verified?: boolean;

  // The user's primary phone number
  phone_number?: string;

  // The user's display name
  name?: string;

  // The user's profile photo URL
  picture?: string;

  // Information on all identities linked to this user
  firebase: {
    // The primary sign-in provider
    sign_in_provider: Provider;

    // A map of providers to the user's list of unique identifiers from
    // each provider
    identities?: { [provider in Provider]?: string[] };
  };

  // Custom claims set by the developer
  [claim: string]: any;
};

// To avoid a breaking change, we accept the 'uid' option here, but
// new users should prefer 'sub' instead.
export type TokenOptions = Partial<FirebaseIdToken> & { uid?: string };

function createUnsecuredJwt(token: TokenOptions, projectId?: string): string {
  // Unsecured JWTs use "none" as the algorithm.
  const header = {
    alg: 'none',
    kid: 'fakekid',
    type: 'JWT'
  };

  const project = projectId || 'fake-project';
  const iat = token.iat || 0;
  const uid = token.sub || token.uid || token.user_id;
  if (!uid) {
    throw new Error("Auth must contain 'sub', 'uid', or 'user_id' field!");
  }

  // Remove the uid option since it's not actually part of the token spec
  delete token.uid;

  const payload: FirebaseIdToken = {
    // Set all required fields to decent defaults
    iss: `https://securetoken.google.com/${project}`,
    aud: project,
    iat: iat,
    exp: iat + 3600,
    auth_time: iat,
    sub: uid,
    user_id: uid,
    firebase: {
      sign_in_provider: 'custom',
      identities: {}
    },

    // Override with user options
    ...token
  };

  // Unsecured JWTs use the empty string as a signature.
  const signature = '';
  return [
    base64.encodeString(JSON.stringify(header), /*webSafe=*/ false),
    base64.encodeString(JSON.stringify(payload), /*webSafe=*/ false),
    signature
  ].join('.');
}

export function apps(): firebase.app.App[] {
  return firebase.apps;
}

export type AppOptions = {
  databaseName?: string;
  projectId?: string;
  auth?: TokenOptions;
};
/** Construct an App authenticated with options.auth. */
export function initializeTestApp(options: AppOptions): firebase.app.App {
  const jwt = options.auth
    ? createUnsecuredJwt(options.auth, options.projectId)
    : undefined;

  return initializeApp(jwt, options.databaseName, options.projectId);
}

export type AdminAppOptions = {
  databaseName?: string;
  projectId?: string;
};
/** Construct an App authenticated as an admin user. */
export function initializeAdminApp(options: AdminAppOptions): firebase.app.App {
  const admin = require('firebase-admin');

  const app = admin.initializeApp(
    getAppOptions(options.databaseName, options.projectId),
    getRandomAppName()
  );

  if (options.projectId) {
    app.firestore().settings({
      host: getFirestoreHost(),
      ssl: false
    });
  }

  return app;
}

function getDatabaseHost() {
  if (!_databaseHost) {
    const fromEnv = process.env[DATABASE_ADDRESS_ENV];
    if (fromEnv) {
      _databaseHost = fromEnv;
    } else {
      console.warn(
        `Warning: ${DATABASE_ADDRESS_ENV} not set, using default value ${DATABASE_ADDRESS_DEFAULT}`
      );
      _databaseHost = DATABASE_ADDRESS_DEFAULT;
    }
  }

  return _databaseHost;
}

function getFirestoreHost() {
  if (!_firestoreHost) {
    const fromEnv = process.env[FIRESTORE_ADDRESS_ENV];
    if (fromEnv) {
      _firestoreHost = fromEnv;
    } else {
      console.warn(
        `Warning: ${FIRESTORE_ADDRESS_ENV} not set, using default value ${FIRESTORE_ADDRESS_DEFAULT}`
      );
      _firestoreHost = FIRESTORE_ADDRESS_DEFAULT;
    }
  }

  return _firestoreHost;
}

function getRandomAppName(): string {
  return 'app-' + new Date().getTime() + '-' + Math.random();
}

function getAppOptions(
  databaseName?: string,
  projectId?: string
): { [key: string]: string } {
  let appOptions: { [key: string]: string } = {};

  if (databaseName) {
    appOptions[
      'databaseURL'
    ] = `http://${getDatabaseHost()}?ns=${databaseName}`;
  }
  if (projectId) {
    appOptions['projectId'] = projectId;
  }

  return appOptions;
}

function initializeApp(
  accessToken?: string,
  databaseName?: string,
  projectId?: string
): firebase.app.App {
  const appOptions = getAppOptions(databaseName, projectId);
  const app = firebase.initializeApp(appOptions, getRandomAppName());
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
      host: getFirestoreHost(),
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
        uri: `http://${getDatabaseHost()}/.settings/rules.json?ns=${
          options.databaseName
        }`,
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
        uri: `http://${getFirestoreHost()}/emulator/v1/projects/${
          options.projectId
        }:securityRules`,
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
        uri: `http://${getFirestoreHost()}/emulator/v1/projects/${
          options.projectId
        }/databases/(default)/documents`,
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
    (v: any) => {
      return Promise.reject(
        new Error('Expected request to fail, but it succeeded.')
      );
    },
    (err: any) => {
      const isPermissionDenied =
        (err && err.message && err.message.indexOf('PERMISSION_DENIED') >= 0) ||
        (err && err.code === 'permission-denied');
      if (!isPermissionDenied) {
        return Promise.reject(
          new Error(
            `Expected PERMISSION_DENIED but got unexpected error: ${err}`
          )
        );
      }
      return err;
    }
  );
}

export function assertSucceeds(pr: Promise<any>): any {
  return pr;
}
