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
import { safeGet, CONSTANTS } from '@firebase/util';
import { Repo } from './Repo';
import { fatal, log } from './util/util';
import { parseRepoInfo } from './util/libs/parser';
import { validateUrl } from './util/validation';
import './Repo_transaction';
import { Database } from '../api/Database';
import { RepoInfo } from './RepoInfo';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import {
  AuthTokenProvider,
  EmulatorAdminTokenProvider,
  FirebaseAuthTokenProvider
} from './AuthTokenProvider';

/**
 * This variable is also defined in the firebase node.js admin SDK. Before
 * modifying this definition, consult the definition in:
 *
 * https://github.com/firebase/firebase-admin-node
 *
 * and make sure the two are consistent.
 */
const FIREBASE_DATABASE_EMULATOR_HOST_VAR = 'FIREBASE_DATABASE_EMULATOR_HOST';

let _staticInstance: RepoManager;

/**
 * Creates and caches Repo instances.
 */
export class RepoManager {
  /**
   * @private {!Object.<string, Object<string, !fb.core.Repo>>}
   */
  private repos_: {
    [appName: string]: {
      [dbUrl: string]: Repo;
    };
  } = {};

  /**
   * If true, new Repos will be created to use ReadonlyRestClient (for testing purposes).
   * @private {boolean}
   */
  private useRestClient_: boolean = false;

  static getInstance(): RepoManager {
    if (!_staticInstance) {
      _staticInstance = new RepoManager();
    }
    return _staticInstance;
  }

  // TODO(koss): Remove these functions unless used in tests?
  interrupt() {
    for (const appName of Object.keys(this.repos_)) {
      for (const dbUrl of Object.keys(this.repos_[appName])) {
        this.repos_[appName][dbUrl].interrupt();
      }
    }
  }

  resume() {
    for (const appName of Object.keys(this.repos_)) {
      for (const dbUrl of Object.keys(this.repos_[appName])) {
        this.repos_[appName][dbUrl].resume();
      }
    }
  }

  /**
   * This function should only ever be called to CREATE a new database instance.
   *
   * @param {!FirebaseApp} app
   * @return {!Database}
   */
  databaseFromApp(
    app: FirebaseApp,
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
    if (!parsedUrl.path.isEmpty()) {
      fatal(
        'Database URL must point to the root of a Firebase Database ' +
          '(not including a child path).'
      );
    }

    const repo = this.createRepo(repoInfo, app, authTokenProvider);

    return repo.database;
  }

  /**
   * Remove the repo and make sure it is disconnected.
   *
   * @param {!Repo} repo
   */
  deleteRepo(repo: Repo) {
    const appRepos = safeGet(this.repos_, repo.app.name);
    // This should never happen...
    if (!appRepos || safeGet(appRepos, repo.repoInfo_.toURLString()) !== repo) {
      fatal(
        `Database ${repo.app.name}(${repo.repoInfo_}) has already been deleted.`
      );
    }
    repo.interrupt();
    delete appRepos[repo.repoInfo_.toURLString()];
  }

  /**
   * Ensures a repo doesn't already exist and then creates one using the
   * provided app.
   *
   * @param {!RepoInfo} repoInfo The metadata about the Repo
   * @param {!FirebaseApp} app
   * @return {!Repo} The Repo object for the specified server / repoName.
   */
  createRepo(
    repoInfo: RepoInfo,
    app: FirebaseApp,
    authTokenProvider: AuthTokenProvider
  ): Repo {
    let appRepos = safeGet(this.repos_, app.name);

    if (!appRepos) {
      appRepos = {};
      this.repos_[app.name] = appRepos;
    }

    let repo = safeGet(appRepos, repoInfo.toURLString());
    if (repo) {
      fatal(
        'Database initialized multiple times. Please make sure the format of the database URL matches with each database() call.'
      );
    }
    repo = new Repo(repoInfo, this.useRestClient_, app, authTokenProvider);
    appRepos[repoInfo.toURLString()] = repo;

    return repo;
  }

  /**
   * Forces us to use ReadonlyRestClient instead of PersistentConnection for new Repos.
   * @param {boolean} forceRestClient
   */
  forceRestClient(forceRestClient: boolean) {
    this.useRestClient_ = forceRestClient;
  }
}
