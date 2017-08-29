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

import { fatal } from '../core/util/util';
import { parseRepoInfo } from '../core/util/libs/parser';
import { Path } from '../core/util/Path';
import { Reference } from './Reference';
import { Repo } from '../core/Repo';
import { RepoManager } from '../core/RepoManager';
import { validateArgCount } from '@firebase/util';
import { validateUrl } from '../core/util/validation';
import { FirebaseApp, FirebaseService } from '@firebase/app';
import { RepoInfo } from '../core/RepoInfo';

/**
 * Class representing a firebase database.
 * @implements {FirebaseService}
 */
export class Database implements FirebaseService {
  INTERNAL: DatabaseInternals;
  private root_: Reference;

  static readonly ServerValue = {
    TIMESTAMP: {
      '.sv': 'timestamp'
    }
  };

  /**
   * The constructor should not be called by users of our public API.
   * @param {!Repo} repo_
   */
  constructor(private repo_: Repo) {
    if (!(repo_ instanceof Repo)) {
      fatal(
        "Don't call new Database() directly - please use firebase.database()."
      );
    }

    /** @type {Reference} */
    this.root_ = new Reference(repo_, Path.Empty);

    this.INTERNAL = new DatabaseInternals(this);
  }

  get app(): FirebaseApp {
    return this.repo_.app;
  }

  /**
   * Returns a reference to the root or the path specified in opt_pathString.
   * @param {string=} pathString
   * @return {!Reference} Firebase reference.
   */
  ref(pathString?: string): Reference {
    this.checkDeleted_('ref');
    validateArgCount('database.ref', 0, 1, arguments.length);

    return pathString !== undefined ? this.root_.child(pathString) : this.root_;
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
    const parsedURL = parseRepoInfo(url);
    validateUrl(apiName, 1, parsedURL);

    const repoInfo = parsedURL.repoInfo;
    if (repoInfo.host !== ((this.repo_ as any).repoInfo_ as RepoInfo).host) {
      fatal(
        apiName +
          ': Host name does not match the current database: ' +
          '(found ' +
          repoInfo.host +
          ' but expected ' +
          ((this.repo_ as any).repoInfo_ as RepoInfo).host +
          ')'
      );
    }

    return this.ref(parsedURL.path.toString());
  }

  /**
   * @param {string} apiName
   */
  private checkDeleted_(apiName: string) {
    if (this.repo_ === null) {
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
  delete(): Promise<void> {
    (this.database as any).checkDeleted_('delete');
    RepoManager.getInstance().deleteRepo((this.database as any).repo_ as Repo);

    (this.database as any).repo_ = null;
    (this.database as any).root_ = null;
    this.database.INTERNAL = null;
    this.database = null;
    return Promise.resolve();
  }
}
