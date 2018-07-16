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

export function apps(): (FirebaseApp | null)[] {
  return firebase.apps;
}

export type AppOptions = {
  databaseName?: string;
  projectId?: string;
  auth: object;
};
export function initializeTestApp(options: AppOptions): FirebaseApp {
  let appOptions: FirebaseOptions;
  if ('databaseName' in options) {
    appOptions = {
      databaseURL: DBURL + '?ns=' + options.databaseName
    };
  } else if ('projectId' in options) {
    appOptions = {
      projectId: options.projectId
    };
  } else {
    throw new Error('neither databaseName or projectId were specified');
  }
  const header = {
    alg: 'RS256',
    kid: 'fakekid'
  };
  const fakeToken = [
    base64.encodeString(JSON.stringify(header), /*webSafe=*/ false),
    base64.encodeString(JSON.stringify(options.auth), /*webSafe=*/ false),
    'fakesignature'
  ].join('.');
  const appName = 'app-' + new Date().getTime() + '-' + Math.random();
  const app = firebase.initializeApp(appOptions, appName);
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
