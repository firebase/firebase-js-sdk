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

import { firebase } from '@firebase/app';
import request from 'request-promise';
import * as fs from 'fs';
import { FirebaseApp, FirebaseOptions } from '@firebase/app-types';
import { base64 } from '@firebase/util';

/** The default url for the local database emulator. */
const DBURL = 'http://localhost:9000';
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
  // Unsecured JWTs use the empty string as a signature.
  const signature = '';
  return [
    base64.encodeString(JSON.stringify(header), /*webSafe=*/ false),
    base64.encodeString(JSON.stringify(auth), /*webSafe=*/ false),
    signature
  ].join('.');
}

export function apps(): (FirebaseApp | null)[] {
  return firebase.apps;
}

export type AppOptions = {
  databaseName?: string;
  projectId?: string;
  auth?: object;
};
/** Construct a FirebaseApp authenticated with options.auth. */
export function initializeTestApp(options: AppOptions): FirebaseApp {
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
/** Construct a FirebaseApp authenticated as an admin user. */
export function initializeAdminApp(options: AdminAppOptions): FirebaseApp {
  return initializeApp(ADMIN_TOKEN, options.databaseName, options.projectId);
}

function initializeApp(
  accessToken?: string,
  databaseName?: string,
  projectId?: string
): FirebaseApp {
  let appOptions: FirebaseOptions = {};
  if (databaseName) {
    appOptions = {
      databaseURL: DBURL + '?ns=' + databaseName
    };
  } else if (projectId) {
    appOptions = {
      projectId: projectId
    };
  } else {
    throw new Error('neither databaseName or projectId were specified');
  }
  const appName = 'app-' + new Date().getTime() + '-' + Math.random();
  let app = firebase.initializeApp(appOptions, appName);
  // hijacking INTERNAL.getToken to bypass FirebaseAuth and allows specifying of auth headers
  if (accessToken) {
    (app as any).INTERNAL.getToken = () =>
      Promise.resolve({ accessToken: accessToken });
  }
  return app;
}

export type LoadDatabaseRulesOptions = {
  databaseName: string;
  rules: string;
  rulesPath: fs.PathLike;
};
export function loadDatabaseRules(options: LoadDatabaseRulesOptions): void {
  if (!options.databaseName) {
    throw new Error('databaseName not specified');
  }

  if (options.rulesPath) {
    if (!fs.existsSync(options.rulesPath)) {
      throw new Error('Could not find file: ' + options.rulesPath);
    }
    options.rules = fs.readFileSync(options.rulesPath).toString('utf8');
  }
  if (!options.rules) {
    throw new Error('must provide either rules or rulesPath');
  }

  request({
    uri: DBURL + '/.settings/rules.json?ns=' + options.databaseName,
    method: 'PUT',
    headers: { Authorization: 'Bearer owner' },
    body: options.rules
  }).catch(function(err) {
    throw new Error('could not load rules: ' + err);
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
