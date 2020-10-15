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

import { fatal } from '../core/util/util';
import { parseRepoInfo } from '../core/util/libs/parser';
import { Path } from '../core/util/Path';
import { Reference } from './Reference';
import { Repo } from '../core/Repo';
import { RepoManager } from '../core/RepoManager';
import { validateArgCount } from '@firebase/util';
import { validateUrl } from '../core/util/validation';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import { RepoInfo } from '../core/RepoInfo';
import { AuthTokenProvider } from '../core/AuthTokenProvider';

/**
 * Class representing a firebase database.
 * @implements {FirebaseService}
 */
export class Database implements FirebaseService {
  INTERNAL: DatabaseInternals;

  private repoInternal_?: Repo;
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
  constructor(
    private repoInfo_: RepoInfo,
    readonly app: FirebaseApp,
    private readonly authTokenProvider_: AuthTokenProvider
  ) {
    if (!(repoInfo_ instanceof RepoInfo)) {
      fatal(
        "Don't call new Database() directly  please use firebase.database()."
      );
    }
    
    // We have to "reserve" the repo now so we can safely create it as-needed
    // TOOD(samstern): Enabling this is a mess
    // RepoManager.getInstance().reserveRepo(repoInfo_, app);
    this.INTERNAL = new DatabaseInternals(this);
  }

  private get repo_() {
    if (!this.repoInternal_) {
      this.repoInternal_ = RepoManager.getInstance().createRepo(
        this.repoInfo_, 
        this.app, 
        this.authTokenProvider_, 
        this
      );
    }
    return this.repoInternal_;
  }
  
  private set repo_(repo: Repo) {
    this.repoInternal_ = repo;
    this.rootInternal_ = null;
  }

  private get root_() {
    if (!this.rootInternal_) {
      this.rootInternal_ = new Reference(this.repo_, Path.Empty);
    }

    return this.rootInternal_;
  }

  private set root_(root: Reference) {
    this.rootInternal_ = root;
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
    if (this.repoInternal_) {
      fatal(
        'Cannot call useEmulator() after instance has already been initialized.'
      );
      return;
    }

    const url = `http://${host}:${port}?ns=${this.repoInfo_.namespace}`;
    const { repoInfo } = parseRepoInfo(url, this.repoInfo_.nodeAdmin);

    this.repoInfo_ = repoInfo;
  }

  /**
   * Returns a reference to the root or to the path specified in the provided
   * argument.
   *
   * @param {string|Reference=} path The relative string path or an existing
   * Reference to a database location.
   * @throws If a Reference is provided, throws if it does not belong to the
   * same project.
   * @return {!Reference} Firebase reference.
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
   * @param {string} url
   * @return {!Reference} Firebase reference.
   */
  refFromURL(url: string): Reference {
    /** @const {string} */
    const apiName = 'database.refFromURL';
    this.checkDeleted_(apiName);
    validateArgCount(apiName, 1, 1, arguments.length);
    const parsedURL = parseRepoInfo(url, this.repo_.repoInfo_.nodeAdmin);
    validateUrl(apiName, 1, parsedURL);

    const repoInfo = parsedURL.repoInfo;
    if (repoInfo.host !== this.repo_.repoInfo_.host) {
      fatal(
        apiName +
          ': Host name does not match the current database: ' +
          '(found ' +
          repoInfo.host +
          ' but expected ' +
          (this.repo_.repoInfo_ as RepoInfo).host +
          ')'
      );
    }

    return this.ref(parsedURL.path.toString());
  }

  /**
   * @param {string} apiName
   */
  private checkDeleted_(apiName: string) {
    if (this.INTERNAL === null) {
      fatal('Cannot call ' + apiName + ' on a deleted database.');
    }
  }

  // Make individual repo go offline.
  goOffline() {
    validateArgCount('database.goOffline', 0, 0, arguments.length);
    this.checkDeleted_('goOffline');
    this.repo_.interrupt();
  }

  goOnline() {
    validateArgCount('database.goOnline', 0, 0, arguments.length);
    this.checkDeleted_('goOnline');
    this.repo_.resume();
  }
}

export class DatabaseInternals {
  /** @param {!Database} database */
  constructor(public database: Database) {}

  /** @return {Promise<void>} */
  async delete(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.database as any).checkDeleted_('delete');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RepoManager.getInstance().deleteRepo((this.database as any).repo_ as Repo);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.database as any).repo_ = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.database as any).root_ = null;
    this.database.INTERNAL = null;
    this.database = null;
  }
}
