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
import * as admin from 'firebase-admin';
import request from 'request-promise';
import * as fs from 'fs';
import { FirebaseApp } from '@firebase/app-types';
import { base64 } from '@firebase/util';

const DBURL = 'http://localhost:9000';

class FakeCredentials {
  getAccessToken() {
    return Promise.resolve({
      expires_in: 1000000,
      access_token: 'owner'
    });
  }
  getCertificate() {
    return null;
  }
}

export function apps(): (admin.app.App | null)[] {
  return admin.apps;
}

export function firestoreApps(): (FirebaseApp | null)[] {
  return firebase.apps;
}

export function initializeAdminApp(options: any): admin.app.App {
  if (!('databaseName' in options)) {
    throw new Error('databaseName not specified');
  }
  return admin.initializeApp(
    {
      credential: new FakeCredentials(),
      databaseURL: DBURL + '?ns=' + options.databaseName
    },
    'app-' + (new Date().getTime() + Math.random())
  );
}

export type TestAppOptions = {
  databaseName: string;
  auth: Object;
};
export function initializeTestApp(options: TestAppOptions): admin.app.App {
  // if options.auth is not present, we will construct an app with auth == null
  return admin.initializeApp(
    {
      credential: new FakeCredentials(),
      databaseURL: DBURL + '?ns=' + options.databaseName,
      databaseAuthVariableOverride: options.auth || null
    },
    'app-' + (new Date().getTime() + Math.random())
  );
}

export type FirestoreTestAppOptions = {
  projectId: string;
  auth: Object;
};
export function initializeFirestoreTestApp(
  options: FirestoreTestAppOptions
): FirebaseApp {
  const header = {
    alg: 'RS256',
    kid: 'fakekid'
  };
  const fakeToken = [
    base64.encodeString(JSON.stringify(header), /*webSafe=*/ false),
    base64.encodeString(JSON.stringify(options.auth), /*webSafe=*/ false),
    'fakesignature'
  ].join('.');
  const app = firebase.initializeApp(
    { projectId: options.projectId },
    'app-' + new Date().getTime() + '-' + Math.random()
  );
  // hijacking INTERNAL.getToken to bypass FirebaseAuth and allows specifying of auth headers
  (app as any).INTERNAL.getToken = () =>
    Promise.resolve({ accessToken: fakeToken });
  return app;
}

export type LoadDatabaseRulesOptions = {
  databaseName: String;
  rules: String;
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
