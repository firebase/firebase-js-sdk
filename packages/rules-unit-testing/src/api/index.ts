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

import firebase from 'firebase';
import 'firebase/database';
import 'firebase/firestore';
import 'firebase/storage';

import type { app } from 'firebase-admin';
import { _FirebaseApp } from '@firebase/app-types/private';
import { FirebaseAuthInternal } from '@firebase/auth-interop-types';
import * as request from 'request';
import { base64 } from '@firebase/util';
import { setLogLevel, LogLevel } from '@firebase/logger';
import { Component, ComponentType } from '@firebase/component';

const { firestore, database, storage } = firebase;
export { firestore, database, storage };

/** If this environment variable is set, use it for the database emulator's address. */
const DATABASE_ADDRESS_ENV: string = 'FIREBASE_DATABASE_EMULATOR_HOST';
/** The default address for the local database emulator. */
const DATABASE_ADDRESS_DEFAULT: string = 'localhost:9000';

/** If this environment variable is set, use it for the Firestore emulator. */
const FIRESTORE_ADDRESS_ENV: string = 'FIRESTORE_EMULATOR_HOST';
/** The default address for the local Firestore emulator. */
const FIRESTORE_ADDRESS_DEFAULT: string = 'localhost:8080';

/** If this environment variable is set, use it for the Storage emulator. */
const FIREBASE_STORAGE_ADDRESS_ENV: string = 'FIREBASE_STORAGE_EMULATOR_HOST';
const CLOUD_STORAGE_ADDRESS_ENV: string = 'STORAGE_EMULATOR_HOST';
/** The default address for the local Firestore emulator. */
const STORAGE_ADDRESS_DEFAULT: string = 'localhost:9199';

/** Environment variable to locate the Emulator Hub */
const HUB_HOST_ENV: string = 'FIREBASE_EMULATOR_HUB';
/** The default address for the Emulator Hub */
const HUB_HOST_DEFAULT: string = 'localhost:4400';

/** The actual address for the database emulator */
let _databaseHost: string | undefined = undefined;

/** The actual address for the Firestore emulator */
let _firestoreHost: string | undefined = undefined;

/** The actual address for the Storage emulator */
let _storageHost: string | undefined = undefined;

/** The actual address for the Emulator Hub */
let _hubHost: string | undefined = undefined;

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

/**
 * Host/port configuration for applicable Firebase Emulators.
 */
export type FirebaseEmulatorOptions = {
  firestore?: {
    host: string;
    port: number;
  };
  database?: {
    host: string;
    port: number;
  };
  storage?: {
    host: string;
    port: number;
  };
  hub?: {
    host: string;
    port: number;
  };
};

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

  // Remove the uid option since it's not actually part of the token spec.
  if (payload.uid) {
    delete payload.uid;
  }

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
  storageBucket?: string;
  auth?: TokenOptions;
};
/** Construct an App authenticated with options.auth. */
export function initializeTestApp(options: AppOptions): firebase.app.App {
  const jwt = options.auth
    ? createUnsecuredJwt(options.auth, options.projectId)
    : undefined;

  return initializeApp(
    jwt,
    options.databaseName,
    options.projectId,
    options.storageBucket
  );
}

export type AdminAppOptions = {
  databaseName?: string;
  projectId?: string;
  storageBucket?: string;
};
/** Construct an App authenticated as an admin user. */
export function initializeAdminApp(options: AdminAppOptions): app.App {
  const admin = require('firebase-admin');

  const app: app.App = admin.initializeApp(
    getAppOptions(
      options.databaseName,
      options.projectId,
      options.storageBucket
    ),
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

/**
 * Set the host and port configuration for applicable emulators. This will override any values
 * found in environment variables. Must be called before initializeAdminApp or initializeTestApp.
 *
 * @param options options object.
 */
export function useEmulators(options: FirebaseEmulatorOptions): void {
  if (
    !(options.database || options.firestore || options.storage || options.hub)
  ) {
    throw new Error(
      "Argument to useEmulators must contain at least one of 'database', 'firestore', 'storage', or 'hub'."
    );
  }

  if (options.database) {
    _databaseHost = getAddress(options.database.host, options.database.port);
  }

  if (options.firestore) {
    _firestoreHost = getAddress(options.firestore.host, options.firestore.port);
  }

  if (options.storage) {
    _storageHost = getAddress(options.storage.host, options.storage.port);
  }

  if (options.hub) {
    _hubHost = getAddress(options.hub.host, options.hub.port);
  }
}

/**
 * Use the Firebase Emulator hub to discover other running emulators. Call useEmulators() with
 * the result to configure the library to use the discovered emulators.
 *
 * @param hubHost the host where the Emulator Hub is running (ex: 'localhost')
 * @param hubPort the port where the Emulator Hub is running (ex: 4400)
 */
export async function discoverEmulators(
  hubHost?: string,
  hubPort?: number
): Promise<FirebaseEmulatorOptions> {
  if ((hubHost && !hubPort) || (!hubHost && hubPort)) {
    throw new Error(
      `Invalid configuration hubHost=${hubHost} and hubPort=${hubPort}. If either parameter is supplied, both must be defined.`
    );
  }

  const hubAddress =
    hubHost && hubPort ? getAddress(hubHost, hubPort) : getHubHost();

  const res = await requestPromise(request.get, {
    method: 'GET',
    uri: `http://${hubAddress}/emulators`
  });
  if (res.statusCode !== 200) {
    throw new Error(
      `HTTP Error ${res.statusCode} when attempting to reach Emulator Hub at ${hubAddress}, are you sure it is running?`
    );
  }

  const options: FirebaseEmulatorOptions = {};

  const data = JSON.parse(res.body);

  if (data.database) {
    options.database = {
      host: data.database.host,
      port: data.database.port
    };
  }

  if (data.firestore) {
    options.firestore = {
      host: data.firestore.host,
      port: data.firestore.port
    };
  }

  if (data.storage) {
    options.storage = {
      host: data.storage.host,
      port: data.storage.port
    };
  }

  if (data.hub) {
    options.hub = {
      host: data.hub.host,
      port: data.hub.port
    };
  }

  return options;
}

function getAddress(host: string, port: number) {
  if (host.includes('::')) {
    return `[${host}]:${port}`;
  } else {
    return `${host}:${port}`;
  }
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

function getStorageHost() {
  if (!_storageHost) {
    const fromEnv =
      process.env[FIREBASE_STORAGE_ADDRESS_ENV] ||
      process.env[CLOUD_STORAGE_ADDRESS_ENV];
    if (fromEnv) {
      // The STORAGE_EMULATOR_HOST env var is an older Cloud Standard which includes http:// while
      // the FIREBASE_STORAGE_EMULATOR_HOST is a newer variable supported beginning in the Admin
      // SDK v9.7.0 which does not have the protocol.
      _storageHost = fromEnv.replace('http://', '');
    } else {
      console.warn(
        `Warning: ${FIREBASE_STORAGE_ADDRESS_ENV} not set, using default value ${STORAGE_ADDRESS_DEFAULT}`
      );
      _storageHost = STORAGE_ADDRESS_DEFAULT;
    }
  }

  return _storageHost;
}

function getHubHost() {
  if (!_hubHost) {
    const fromEnv = process.env[HUB_HOST_ENV];
    if (fromEnv) {
      _hubHost = fromEnv;
    } else {
      console.warn(
        `Warning: ${HUB_HOST_ENV} not set, using default value ${HUB_HOST_DEFAULT}`
      );
      _hubHost = HUB_HOST_DEFAULT;
    }
  }

  return _hubHost;
}

function parseHost(host: string): { hostname: string; port: number } {
  const withProtocol = host.startsWith('http') ? host : `http://${host}`;
  const u = new URL(withProtocol);
  return {
    hostname: u.hostname,
    port: Number.parseInt(u.port, 10)
  };
}

function getRandomAppName(): string {
  return 'app-' + new Date().getTime() + '-' + Math.random();
}

function getDatabaseUrl(databaseName: string) {
  return `http://${getDatabaseHost()}?ns=${databaseName}`;
}

function getAppOptions(
  databaseName?: string,
  projectId?: string,
  storageBucket?: string
): { [key: string]: string } {
  let appOptions: { [key: string]: string } = {};

  if (databaseName) {
    appOptions['databaseURL'] = getDatabaseUrl(databaseName);
  }

  if (projectId) {
    appOptions['projectId'] = projectId;
  }

  if (storageBucket) {
    appOptions['storageBucket'] = storageBucket;
  }

  return appOptions;
}

function initializeApp(
  accessToken?: string,
  databaseName?: string,
  projectId?: string,
  storageBucket?: string
): firebase.app.App {
  const appOptions = getAppOptions(databaseName, projectId, storageBucket);
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
    const { hostname, port } = parseHost(getDatabaseHost());
    app.database().useEmulator(hostname, port);

    // Toggle network connectivity to force a reauthentication attempt.
    // This mitigates a minor race condition where the client can send the
    // first database request before authenticating.
    app.database().goOffline();
    app.database().goOnline();
  }
  if (projectId) {
    const { hostname, port } = parseHost(getFirestoreHost());
    app.firestore().useEmulator(hostname, port);
  }
  if (storageBucket) {
    const { hostname, port } = parseHost(getStorageHost());
    app.storage().useEmulator(hostname, port);
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
export async function loadDatabaseRules(
  options: LoadDatabaseRulesOptions
): Promise<void> {
  if (!options.databaseName) {
    throw Error('databaseName not specified');
  }

  if (!options.rules) {
    throw Error('must provide rules to loadDatabaseRules');
  }

  const resp = await requestPromise(request.put, {
    method: 'PUT',
    uri: `http://${getDatabaseHost()}/.settings/rules.json?ns=${
      options.databaseName
    }`,
    headers: { Authorization: 'Bearer owner' },
    body: options.rules
  });

  if (resp.statusCode !== 200) {
    throw new Error(JSON.parse(resp.body.error));
  }
}

export type LoadFirestoreRulesOptions = {
  projectId: string;
  rules: string;
};
export async function loadFirestoreRules(
  options: LoadFirestoreRulesOptions
): Promise<void> {
  if (!options.projectId) {
    throw new Error('projectId not specified');
  }

  if (!options.rules) {
    throw new Error('must provide rules to loadFirestoreRules');
  }

  const resp = await requestPromise(request.put, {
    method: 'PUT',
    uri: `http://${getFirestoreHost()}/emulator/v1/projects/${
      options.projectId
    }:securityRules`,
    body: JSON.stringify({
      rules: {
        files: [{ content: options.rules }]
      }
    })
  });

  if (resp.statusCode !== 200) {
    throw new Error(JSON.parse(resp.body.error));
  }
}

export type LoadStorageRulesOptions = {
  rules: string;
};
export async function loadStorageRules(
  options: LoadStorageRulesOptions
): Promise<void> {
  if (!options.rules) {
    throw new Error('must provide rules to loadStorageRules');
  }

  const resp = await requestPromise(request.put, {
    method: 'PUT',
    uri: `http://${getStorageHost()}/internal/setRules`,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rules: {
        files: [{ name: 'storage.rules', content: options.rules }]
      }
    })
  });

  if (resp.statusCode !== 200) {
    throw new Error(resp.body);
  }
}

export type ClearFirestoreDataOptions = {
  projectId: string;
};
export async function clearFirestoreData(
  options: ClearFirestoreDataOptions
): Promise<void> {
  if (!options.projectId) {
    throw new Error('projectId not specified');
  }

  const resp = await requestPromise(request.delete, {
    method: 'DELETE',
    uri: `http://${getFirestoreHost()}/emulator/v1/projects/${
      options.projectId
    }/databases/(default)/documents`,
    body: JSON.stringify({
      database: `projects/${options.projectId}/databases/(default)`
    })
  });

  if (resp.statusCode !== 200) {
    throw new Error(JSON.parse(resp.body.error));
  }
}

/**
 * Run a setup function with background Cloud Functions triggers disabled. This can be used to
 * import data into the Realtime Database or Cloud Firestore emulator without triggering locally
 * emulated Cloud Functions.
 *
 * This method only works with Firebase CLI version 8.13.0 or higher.
 *
 * @param fn an function which returns a promise.
 */
export async function withFunctionTriggersDisabled<TResult>(
  fn: () => TResult | Promise<TResult>
): Promise<TResult> {
  const hubHost = getHubHost();

  // Disable background triggers
  const disableRes = await requestPromise(request.put, {
    method: 'PUT',
    uri: `http://${hubHost}/functions/disableBackgroundTriggers`
  });
  if (disableRes.statusCode !== 200) {
    throw new Error(
      `HTTP Error ${disableRes.statusCode} when disabling functions triggers, are you using firebase-tools 8.13.0 or higher?`
    );
  }

  // Run the user's function
  let result: TResult | undefined = undefined;
  try {
    result = await fn();
  } finally {
    // Re-enable background triggers
    const enableRes = await requestPromise(request.put, {
      method: 'PUT',
      uri: `http://${hubHost}/functions/enableBackgroundTriggers`
    });
    if (enableRes.statusCode !== 200) {
      throw new Error(
        `HTTP Error ${enableRes.statusCode} when enabling functions triggers, are you using firebase-tools 8.13.0 or higher?`
      );
    }
  }

  // Return the user's function result
  return result;
}

export function assertFails(pr: Promise<any>): any {
  return pr.then(
    (v: any) => {
      return Promise.reject(
        new Error('Expected request to fail, but it succeeded.')
      );
    },
    (err: any) => {
      const errCode = (err && err.code && err.code.toLowerCase()) || '';
      const errMessage =
        (err && err.message && err.message.toLowerCase()) || '';
      const isPermissionDenied =
        errCode === 'permission-denied' ||
        errCode === 'permission_denied' ||
        errMessage.indexOf('permission_denied') >= 0 ||
        errMessage.indexOf('permission denied') >= 0;

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

function requestPromise(
  method: typeof request.get,
  options: request.CoreOptions & request.UriOptions
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const callback: request.RequestCallback = (err, resp, body) => {
      if (err) {
        reject(err);
      } else {
        resolve({ statusCode: resp.statusCode, body });
      }
    };

    // Unfortunately request's default method is not very test-friendly so having
    // the caler pass in the method here makes this whole thing compatible with sinon
    method(options, callback);
  });
}
