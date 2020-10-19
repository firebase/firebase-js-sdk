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
import { parseDatabaseURL, parseRepoInfo } from '../core/util/libs/parser';
import { Path } from '../core/util/Path';
import { Reference } from './Reference';
import { Repo } from '../core/Repo';
import { RepoManager } from '../core/RepoManager';
import { validateArgCount } from '@firebase/util';
import { validateUrl } from '../core/util/validation';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import { RepoInfo } from '../core/RepoInfo';
import { FirebaseDatabase } from '@firebase/database-types';

/**
 * Class representing a firebase database.
 * @implements {FirebaseService}
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
   * @param {!Repo} repoInternal_
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
      RepoManager.getInstance().deleteRepo(this.repo_);
      this.repoInternal_ = null;
      this.rootInternal_ = null;
    }
  };

  private get repo_(): Repo {
    if (!this.instanceStarted_) {
      this.repoInternal_.start();
      this.instanceStarted_ = true;
    }
    return this.repoInternal_;
  }

  get root_(): Reference {
    if (!this.rootInternal_) {
      this.rootInternal_ = new Reference(this.repo_, Path.Empty);
    }

    return this.rootInternal_;
  }

  get app(): FirebaseApp {
    return this.repo_.app;
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
    RepoManager.getInstance().applyEmulatorSettings(
      this.repoInternal_,
      host,
      port
    );
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

    const newHost = parsedURL.repoInfo.host;
    const originalHost = parseDatabaseURL(this.repo_.productionUrl).host;
    const currentHost = this.repo_.repoInfo_.host;
    if (newHost !== originalHost && newHost !== currentHost) {
      const expected = originalHost === currentHost
          ? originalHost
          : `${originalHost} or ${currentHost}`;
      
      fatal(
        apiName +
          ': Host name does not match the current database: ' +
          '(found ' +
          newHost +
          ' but expected ' +
          expected +
          ')'
      );
    }

    return this.ref(parsedURL.path.toString());
  }

  /**
   * @param {string} apiName
   */
  private checkDeleted_(apiName: string) {
    if (this.repoInternal_ === null) {
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
