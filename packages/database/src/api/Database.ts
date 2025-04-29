/**
 * @license
 * Copyright 2020 Google LLC
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
import {
  _FirebaseService,
  _getProvider,
  FirebaseApp,
  getApp
} from '@firebase/app';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import {
  getModularInstance,
  createMockUserToken,
  deepEqual,
  EmulatorMockTokenOptions,
  getDefaultEmulatorHostnameAndPort,
  isCloudWorkstation
} from '@firebase/util';

import { AppCheckTokenProvider } from '../core/AppCheckTokenProvider';
import {
  AuthTokenProvider,
  EmulatorTokenProvider,
  FirebaseAuthTokenProvider
} from '../core/AuthTokenProvider';
import { Repo, repoInterrupt, repoResume, repoStart } from '../core/Repo';
import { RepoInfo, RepoInfoEmulatorOptions } from '../core/RepoInfo';
import { parseRepoInfo } from '../core/util/libs/parser';
import { newEmptyPath, pathIsEmpty } from '../core/util/Path';
import {
  warn,
  fatal,
  log,
  enableLogging as enableLoggingImpl
} from '../core/util/util';
import { validateUrl } from '../core/util/validation';
import { BrowserPollConnection } from '../realtime/BrowserPollConnection';
import { TransportManager } from '../realtime/TransportManager';
import { WebSocketConnection } from '../realtime/WebSocketConnection';

import { ReferenceImpl } from './Reference_impl';

export { EmulatorMockTokenOptions } from '@firebase/util';
/**
 * This variable is also defined in the firebase Node.js Admin SDK. Before
 * modifying this definition, consult the definition in:
 *
 * https://github.com/firebase/firebase-admin-node
 *
 * and make sure the two are consistent.
 */
const FIREBASE_DATABASE_EMULATOR_HOST_VAR = 'FIREBASE_DATABASE_EMULATOR_HOST';

/**
 * Creates and caches `Repo` instances.
 */
const repos: {
  [appName: string]: {
    [dbUrl: string]: Repo;
  };
} = {};

/**
 * If true, any new `Repo` will be created to use `ReadonlyRestClient` (for testing purposes).
 */
let useRestClient = false;

/**
 * Update an existing `Repo` in place to point to a new host/port.
 */
function repoManagerApplyEmulatorSettings(
  repo: Repo,
  hostAndPort: string,
  emulatorOptions: RepoInfoEmulatorOptions,
  tokenProvider?: AuthTokenProvider
): void {
  const portIndex = hostAndPort.lastIndexOf(':');
  const host = hostAndPort.substring(0, portIndex);
  const useSsl = isCloudWorkstation(host);
  repo.repoInfo_ = new RepoInfo(
    hostAndPort,
    /* secure= */ useSsl,
    repo.repoInfo_.namespace,
    repo.repoInfo_.webSocketOnly,
    repo.repoInfo_.nodeAdmin,
    repo.repoInfo_.persistenceKey,
    repo.repoInfo_.includeNamespaceInQueryParams,
    /*isUsingEmulator=*/ true,
    emulatorOptions
  );

  if (tokenProvider) {
    repo.authTokenProvider_ = tokenProvider;
  }
}

/**
 * This function should only ever be called to CREATE a new database instance.
 * @internal
 */
export function repoManagerDatabaseFromApp(
  app: FirebaseApp,
  authProvider: Provider<FirebaseAuthInternalName>,
  appCheckProvider?: Provider<AppCheckInternalComponentName>,
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
  if (typeof process !== 'undefined' && process.env) {
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
      ? new EmulatorTokenProvider(EmulatorTokenProvider.OWNER)
      : new FirebaseAuthTokenProvider(app.name, app.options, authProvider);

  validateUrl('Invalid Firebase Database URL', parsedUrl);
  if (!pathIsEmpty(parsedUrl.path)) {
    fatal(
      'Database URL must point to the root of a Firebase Database ' +
        '(not including a child path).'
    );
  }

  const repo = repoManagerCreateRepo(
    repoInfo,
    app,
    authTokenProvider,
    new AppCheckTokenProvider(app, appCheckProvider)
  );
  return new Database(repo, app);
}

/**
 * Remove the repo and make sure it is disconnected.
 *
 */
function repoManagerDeleteRepo(repo: Repo, appName: string): void {
  const appRepos = repos[appName];
  // This should never happen...
  if (!appRepos || appRepos[repo.key] !== repo) {
    fatal(`Database ${appName}(${repo.repoInfo_}) has already been deleted.`);
  }
  repoInterrupt(repo);
  delete appRepos[repo.key];
}

/**
 * Ensures a repo doesn't already exist and then creates one using the
 * provided app.
 *
 * @param repoInfo - The metadata about the Repo
 * @returns The Repo object for the specified server / repoName.
 */
function repoManagerCreateRepo(
  repoInfo: RepoInfo,
  app: FirebaseApp,
  authTokenProvider: AuthTokenProvider,
  appCheckProvider: AppCheckTokenProvider
): Repo {
  let appRepos = repos[app.name];

  if (!appRepos) {
    appRepos = {};
    repos[app.name] = appRepos;
  }

  let repo = appRepos[repoInfo.toURLString()];
  if (repo) {
    fatal(
      'Database initialized multiple times. Please make sure the format of the database URL matches with each database() call.'
    );
  }
  repo = new Repo(repoInfo, useRestClient, authTokenProvider, appCheckProvider);
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
 * Class representing a Firebase Realtime Database.
 */
export class Database implements _FirebaseService {
  /** Represents a `Database` instance. */
  readonly 'type' = 'database';

  /** Track if the instance has been used (root or repo accessed) */
  _instanceStarted: boolean = false;

  /** Backing state for root_ */
  private _rootInternal?: ReferenceImpl;

  /** @hideconstructor */
  constructor(
    public _repoInternal: Repo,
    /** The {@link @firebase/app#FirebaseApp} associated with this Realtime Database instance. */
    readonly app: FirebaseApp
  ) {}

  get _repo(): Repo {
    if (!this._instanceStarted) {
      repoStart(
        this._repoInternal,
        this.app.options.appId,
        this.app.options['databaseAuthVariableOverride']
      );
      this._instanceStarted = true;
    }
    return this._repoInternal;
  }

  get _root(): ReferenceImpl {
    if (!this._rootInternal) {
      this._rootInternal = new ReferenceImpl(this._repo, newEmptyPath());
    }
    return this._rootInternal;
  }

  _delete(): Promise<void> {
    if (this._rootInternal !== null) {
      repoManagerDeleteRepo(this._repo, this.app.name);
      this._repoInternal = null;
      this._rootInternal = null;
    }
    return Promise.resolve();
  }

  _checkNotDeleted(apiName: string) {
    if (this._rootInternal === null) {
      fatal('Cannot call ' + apiName + ' on a deleted database.');
    }
  }
}

function checkTransportInit() {
  if (TransportManager.IS_TRANSPORT_INITIALIZED) {
    warn(
      'Transport has already been initialized. Please call this function before calling ref or setting up a listener'
    );
  }
}

/**
 * Force the use of websockets instead of longPolling.
 */
export function forceWebSockets() {
  checkTransportInit();
  BrowserPollConnection.forceDisallow();
}

/**
 * Force the use of longPolling instead of websockets. This will be ignored if websocket protocol is used in databaseURL.
 */
export function forceLongPolling() {
  checkTransportInit();
  WebSocketConnection.forceDisallow();
  BrowserPollConnection.forceAllow();
}

/**
 * Returns the instance of the Realtime Database SDK that is associated with the provided
 * {@link @firebase/app#FirebaseApp}. Initializes a new instance with default settings if
 * no instance exists or if the existing instance uses a custom database URL.
 *
 * @param app - The {@link @firebase/app#FirebaseApp} instance that the returned Realtime
 * Database instance is associated with.
 * @param url - The URL of the Realtime Database instance to connect to. If not
 * provided, the SDK connects to the default instance of the Firebase App.
 * @returns The `Database` instance of the provided app.
 */
export function getDatabase(
  app: FirebaseApp = getApp(),
  url?: string
): Database {
  const db = _getProvider(app, 'database').getImmediate({
    identifier: url
  }) as Database;
  if (!db._instanceStarted) {
    const emulator = getDefaultEmulatorHostnameAndPort('database');
    if (emulator) {
      connectDatabaseEmulator(db, ...emulator);
    }
  }
  return db;
}

/**
 * Modify the provided instance to communicate with the Realtime Database
 * emulator.
 *
 * <p>Note: This method must be called before performing any other operation.
 *
 * @param db - The instance to modify.
 * @param host - The emulator host (ex: localhost)
 * @param port - The emulator port (ex: 8080)
 * @param options.mockUserToken - the mock auth token to use for unit testing Security Rules
 */
export function connectDatabaseEmulator(
  db: Database,
  host: string,
  port: number,
  options: {
    mockUserToken?: EmulatorMockTokenOptions | string;
  } = {}
): void {
  db = getModularInstance(db);
  db._checkNotDeleted('useEmulator');

  const hostAndPort = `${host}:${port}`;
  const repo = db._repoInternal;
  if (db._instanceStarted) {
    // If the instance has already been started, then silenty fail if this function is called again
    // with the same parameters. If the parameters differ then assert.
    if (
      hostAndPort === db._repoInternal.repoInfo_.host &&
      deepEqual(options, repo.repoInfo_.emulatorOptions)
    ) {
      return;
    }
    fatal(
      'connectDatabaseEmulator() cannot initialize or alter the emulator configuration after the database instance has started.'
    );
  }

  let tokenProvider: EmulatorTokenProvider | undefined = undefined;
  if (repo.repoInfo_.nodeAdmin) {
    if (options.mockUserToken) {
      fatal(
        'mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".'
      );
    }
    tokenProvider = new EmulatorTokenProvider(EmulatorTokenProvider.OWNER);
  } else if (options.mockUserToken) {
    const token =
      typeof options.mockUserToken === 'string'
        ? options.mockUserToken
        : createMockUserToken(options.mockUserToken, db.app.options.projectId);
    tokenProvider = new EmulatorTokenProvider(token);
  }

  // Modify the repo to apply emulator settings
  repoManagerApplyEmulatorSettings(repo, hostAndPort, options, tokenProvider);
}

/**
 * Disconnects from the server (all Database operations will be completed
 * offline).
 *
 * The client automatically maintains a persistent connection to the Database
 * server, which will remain active indefinitely and reconnect when
 * disconnected. However, the `goOffline()` and `goOnline()` methods may be used
 * to control the client connection in cases where a persistent connection is
 * undesirable.
 *
 * While offline, the client will no longer receive data updates from the
 * Database. However, all Database operations performed locally will continue to
 * immediately fire events, allowing your application to continue behaving
 * normally. Additionally, each operation performed locally will automatically
 * be queued and retried upon reconnection to the Database server.
 *
 * To reconnect to the Database and begin receiving remote events, see
 * `goOnline()`.
 *
 * @param db - The instance to disconnect.
 */
export function goOffline(db: Database): void {
  db = getModularInstance(db);
  db._checkNotDeleted('goOffline');
  repoInterrupt(db._repo);
}

/**
 * Reconnects to the server and synchronizes the offline Database state
 * with the server state.
 *
 * This method should be used after disabling the active connection with
 * `goOffline()`. Once reconnected, the client will transmit the proper data
 * and fire the appropriate events so that your client "catches up"
 * automatically.
 *
 * @param db - The instance to reconnect.
 */
export function goOnline(db: Database): void {
  db = getModularInstance(db);
  db._checkNotDeleted('goOnline');
  repoResume(db._repo);
}

/**
 * Logs debugging information to the console.
 *
 * @param enabled - Enables logging if `true`, disables logging if `false`.
 * @param persistent - Remembers the logging state between page refreshes if
 * `true`.
 */
export function enableLogging(enabled: boolean, persistent?: boolean);

/**
 * Logs debugging information to the console.
 *
 * @param logger - A custom logger function to control how things get logged.
 */
export function enableLogging(logger: (message: string) => unknown);

export function enableLogging(
  logger: boolean | ((message: string) => unknown),
  persistent?: boolean
): void {
  enableLoggingImpl(logger, persistent);
}
