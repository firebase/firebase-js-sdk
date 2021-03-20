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
// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseApp as FirebaseAppExp } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { safeGet, validateArgCount } from '@firebase/util';

import {
  AuthTokenProvider,
  EmulatorAdminTokenProvider,
  FirebaseAuthTokenProvider
} from '../core/AuthTokenProvider';
import { Repo, repoInterrupt, repoResume, repoStart } from '../core/Repo';
import { RepoInfo } from '../core/RepoInfo';
import { parseRepoInfo } from '../core/util/libs/parser';
import { pathIsEmpty, newEmptyPath } from '../core/util/Path';
import { fatal, log } from '../core/util/util';
import { validateUrl } from '../core/util/validation';

import { Reference } from './Reference';

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
  return new Database(repo);
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

/**
 * Class representing a firebase database.
 */
export class Database implements FirebaseService {
  /** Track if the instance has been used (root or repo accessed) */
  private instanceStarted_: boolean = false;

  /** Backing state for root_ */
  private rootInternal_?: Reference;

  static readonly ServerValue = {
    TIMESTAMP: {
      '.sv': 'timestamp'
    },
    increment: (delta: number) => {
      return {
        '.sv': {
          'increment': delta
        }
      };
    }
  };

  /**
   * The constructor should not be called by users of our public API.
   */
  constructor(private repoInternal_: Repo) {
    if (!(repoInternal_ instanceof Repo)) {
      fatal(
        "Don't call new Database() directly - please use firebase.database()."
      );
    }
  }

  INTERNAL = {
    delete: async () => {
      this.checkDeleted_('delete');
      repoManagerDeleteRepo(this.repo_);
      this.repoInternal_ = null;
      this.rootInternal_ = null;
    }
  };

  get repo_(): Repo {
    if (!this.instanceStarted_) {
      repoStart(this.repoInternal_);
      this.instanceStarted_ = true;
    }
    return this.repoInternal_;
  }

  get root_(): Reference {
    if (!this.rootInternal_) {
      this.rootInternal_ = new Reference(this, newEmptyPath());
    }

    return this.rootInternal_;
  }

  get app(): FirebaseApp {
    return this.repo_.app as FirebaseApp;
  }

  /**
   * Modify this instance to communicate with the Realtime Database emulator.
   *
   * <p>Note: This method must be called before performing any other operation.
   *
   * @param host the emulator host (ex: localhost)
   * @param port the emulator port (ex: 8080)
   */
  useEmulator(host: string, port: number): void {
    this.checkDeleted_('useEmulator');
    if (this.instanceStarted_) {
      fatal(
        'Cannot call useEmulator() after instance has already been initialized.'
      );
      return;
    }

    // Modify the repo to apply emulator settings
    repoManagerApplyEmulatorSettings(this.repoInternal_, host, port);
  }

  /**
   * Returns a reference to the root or to the path specified in the provided
   * argument.
   *
   * @param path The relative string path or an existing Reference to a database
   * location.
   * @throws If a Reference is provided, throws if it does not belong to the
   * same project.
   * @return Firebase reference.
   */
  ref(path?: string): Reference;
  ref(path?: Reference): Reference;
  ref(path?: string | Reference): Reference {
    this.checkDeleted_('ref');
    validateArgCount('database.ref', 0, 1, arguments.length);

    if (path instanceof Reference) {
      return this.refFromURL(path.toString());
    }

    return path !== undefined ? this.root_.child(path) : this.root_;
  }

  /**
   * Returns a reference to the root or the path specified in url.
   * We throw a exception if the url is not in the same domain as the
   * current repo.
   * @return Firebase reference.
   */
  refFromURL(url: string): Reference {
    /** @const {string} */
    const apiName = 'database.refFromURL';
    this.checkDeleted_(apiName);
    validateArgCount(apiName, 1, 1, arguments.length);
    const parsedURL = parseRepoInfo(url, this.repo_.repoInfo_.nodeAdmin);
    validateUrl(apiName, 1, parsedURL);

    const repoInfo = parsedURL.repoInfo;
    if (
      !this.repo_.repoInfo_.isCustomHost() &&
      repoInfo.host !== this.repo_.repoInfo_.host
    ) {
      fatal(
        apiName +
          ': Host name does not match the current database: ' +
          '(found ' +
          repoInfo.host +
          ' but expected ' +
          this.repo_.repoInfo_.host +
          ')'
      );
    }

    return this.ref(parsedURL.path.toString());
  }

  private checkDeleted_(apiName: string) {
    if (this.repoInternal_ === null) {
      fatal('Cannot call ' + apiName + ' on a deleted database.');
    }
  }

  // Make individual repo go offline.
  goOffline(): void {
    validateArgCount('database.goOffline', 0, 0, arguments.length);
    this.checkDeleted_('goOffline');
    repoInterrupt(this.repo_);
  }

  goOnline(): void {
    validateArgCount('database.goOnline', 0, 0, arguments.length);
    this.checkDeleted_('goOnline');
    repoResume(this.repo_);
  }
}
