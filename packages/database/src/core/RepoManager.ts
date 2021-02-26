/**
 * @license
 * Copyright 2017 Google LLC
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

import { FirebaseApp } from '@firebase/app-types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseApp as FirebaseAppExp } from '@firebase/app-exp';
import { safeGet } from '@firebase/util';
import { Repo, repoGetDatabase, repoInterrupt } from './Repo';
import { fatal, log } from './util/util';
import { parseRepoInfo } from './util/libs/parser';
import { validateUrl } from './util/validation';
import { Database } from '../api/Database';
import { RepoInfo } from './RepoInfo';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import {
  AuthTokenProvider,
  EmulatorAdminTokenProvider,
  FirebaseAuthTokenProvider
} from './AuthTokenProvider';
import { pathIsEmpty } from './util/Path';

/**
 * This variable is also defined in the firebase node.js admin SDK. Before
 * modifying this definition, consult the definition in:
 *
 * https://github.com/firebase/firebase-admin-node
 *
 * and make sure the two are consistent.
 */
const FIREBASE_DATABASE_EMULATOR_HOST_VAR = 'FIREBASE_DATABASE_EMULATOR_HOST';

/**
 * Intersection type that allows the SDK to be used from firebase-exp and
 * firebase v8.
 */
export type FirebaseAppLike = FirebaseApp | FirebaseAppExp;

/**
 * Creates and caches Repo instances.
 */
const repos: {
  [appName: string]: {
    [dbUrl: string]: Repo;
  };
} = {};

/**
 * If true, new Repos will be created to use ReadonlyRestClient (for testing purposes).
 */
let useRestClient = false;

/**
 * Update an existing repo in place to point to a new host/port.
 */
export function repoManagerApplyEmulatorSettings(
  repo: Repo,
  host: string,
  port: number
): void {
  repo.repoInfo_ = new RepoInfo(
    `${host}:${port}`,
    /* secure= */ false,
    repo.repoInfo_.namespace,
    repo.repoInfo_.webSocketOnly,
    repo.repoInfo_.nodeAdmin,
    repo.repoInfo_.persistenceKey,
    repo.repoInfo_.includeNamespaceInQueryParams
  );

  if (repo.repoInfo_.nodeAdmin) {
    repo.authTokenProvider_ = new EmulatorAdminTokenProvider();
  }
}

/**
 * This function should only ever be called to CREATE a new database instance.
 */
export function repoManagerDatabaseFromApp(
  app: FirebaseAppLike,
  authProvider: Provider<FirebaseAuthInternalName>,
  url?: string,
  nodeAdmin?: boolean
): Database {
  let dbUrl: string | undefined = url || app.options.databaseURL;
  if (dbUrl === undefined) {
    if (!app.options.projectId) {
      fatal(
        "Can't determine Firebase Database URL. Be sure to include " +
          ' a Project ID when calling firebase.initializeApp().'
      );
    }

    log('Using default host for project ', app.options.projectId);
    dbUrl = `${app.options.projectId}-default-rtdb.firebaseio.com`;
  }

  let parsedUrl = parseRepoInfo(dbUrl, nodeAdmin);
  let repoInfo = parsedUrl.repoInfo;

  let isEmulator: boolean;

  let dbEmulatorHost: string | undefined = undefined;
  if (typeof process !== 'undefined') {
    dbEmulatorHost = process.env[FIREBASE_DATABASE_EMULATOR_HOST_VAR];
  }

  if (dbEmulatorHost) {
    isEmulator = true;
    dbUrl = `http://${dbEmulatorHost}?ns=${repoInfo.namespace}`;
    parsedUrl = parseRepoInfo(dbUrl, nodeAdmin);
    repoInfo = parsedUrl.repoInfo;
  } else {
    isEmulator = !parsedUrl.repoInfo.secure;
  }

  const authTokenProvider =
    nodeAdmin && isEmulator
      ? new EmulatorAdminTokenProvider()
      : new FirebaseAuthTokenProvider(app, authProvider);

  validateUrl('Invalid Firebase Database URL', 1, parsedUrl);
  if (!pathIsEmpty(parsedUrl.path)) {
    fatal(
      'Database URL must point to the root of a Firebase Database ' +
        '(not including a child path).'
    );
  }

  const repo = repoManagerCreateRepo(repoInfo, app, authTokenProvider);

  return repoGetDatabase(repo);
}

/**
 * Remove the repo and make sure it is disconnected.
 *
 */
export function repoManagerDeleteRepo(repo: Repo): void {
  const appRepos = safeGet(repos, repo.app.name);
  // This should never happen...
  if (!appRepos || safeGet(appRepos, repo.key) !== repo) {
    fatal(
      `Database ${repo.app.name}(${repo.repoInfo_}) has already been deleted.`
    );
  }
  repoInterrupt(repo);
  delete appRepos[repo.key];
}

/**
 * Ensures a repo doesn't already exist and then creates one using the
 * provided app.
 *
 * @param repoInfo The metadata about the Repo
 * @return The Repo object for the specified server / repoName.
 */
export function repoManagerCreateRepo(
  repoInfo: RepoInfo,
  app: FirebaseAppLike,
  authTokenProvider: AuthTokenProvider
): Repo {
  let appRepos = safeGet(repos, app.name);

  if (!appRepos) {
    appRepos = {};
    repos[app.name] = appRepos;
  }

  let repo = safeGet(appRepos, repoInfo.toURLString());
  if (repo) {
    fatal(
      'Database initialized multiple times. Please make sure the format of the database URL matches with each database() call.'
    );
  }
  repo = new Repo(repoInfo, useRestClient, app, authTokenProvider);
  appRepos[repoInfo.toURLString()] = repo;

  return repo;
}

/**
 * Forces us to use ReadonlyRestClient instead of PersistentConnection for new Repos.
 */
export function repoManagerForceRestClient(forceRestClient: boolean): void {
  useRestClient = forceRestClient;
}
