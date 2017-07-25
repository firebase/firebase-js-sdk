/**
* Copyright 2017 Google Inc.
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

import { FirebaseApp } from '../../app/firebase_app';
import { safeGet } from '../../utils/obj';
import { Repo } from './Repo';
import { fatal } from './util/util';
import { parseRepoInfo } from './util/libs/parser';
import { validateUrl } from './util/validation';
import './Repo_transaction';
import { Database } from '../api/Database';
import { RepoInfo } from './RepoInfo';

/** @const {string} */
const DATABASE_URL_OPTION = 'databaseURL';

let _staticInstance: RepoManager;

/**
 * Creates and caches Repo instances.
 */
export class RepoManager {
  /**
   * @private {!Object.<string, !Repo>}
   */
  private repos_: {
    [name: string]: Repo;
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
    for (const repo in this.repos_) {
      this.repos_[repo].interrupt();
    }
  }

  resume() {
    for (const repo in this.repos_) {
      this.repos_[repo].resume();
    }
  }

  /**
   * This function should only ever be called to CREATE a new database instance.
   *
   * @param {!FirebaseApp} app
   * @return {!Database}
   */
  databaseFromApp(app: FirebaseApp): Database {
    const dbUrl: string = app.options[DATABASE_URL_OPTION];
    if (dbUrl === undefined) {
      fatal(
        "Can't determine Firebase Database URL.  Be sure to include " +
          DATABASE_URL_OPTION +
          ' option when calling firebase.intializeApp().'
      );
    }

    const parsedUrl = parseRepoInfo(dbUrl);
    const repoInfo = parsedUrl.repoInfo;

    validateUrl('Invalid Firebase Database URL', 1, parsedUrl);
    if (!parsedUrl.path.isEmpty()) {
      fatal(
        'Database URL must point to the root of a Firebase Database ' +
          '(not including a child path).'
      );
    }

    const repo = this.createRepo(repoInfo, app);

    return repo.database;
  }

  /**
   * Remove the repo and make sure it is disconnected.
   *
   * @param {!Repo} repo
   */
  deleteRepo(repo: Repo) {
    // This should never happen...
    if (safeGet(this.repos_, repo.app.name) !== repo) {
      fatal('Database ' + repo.app.name + ' has already been deleted.');
    }
    repo.interrupt();
    delete this.repos_[repo.app.name];
  }

  /**
   * Ensures a repo doesn't already exist and then creates one using the
   * provided app.
   *
   * @param {!RepoInfo} repoInfo The metadata about the Repo
   * @param {!FirebaseApp} app
   * @return {!Repo} The Repo object for the specified server / repoName.
   */
  createRepo(repoInfo: RepoInfo, app: FirebaseApp): Repo {
    let repo = safeGet(this.repos_, app.name);
    if (repo) {
      fatal('FIREBASE INTERNAL ERROR: Database initialized multiple times.');
    }
    repo = new Repo(repoInfo, this.useRestClient_, app);
    this.repos_[app.name] = repo;

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
