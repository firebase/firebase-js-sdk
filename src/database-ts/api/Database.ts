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

import { fatal } from "../../utils/libs/logger";
import { Path } from "../core/util/Path";
import { Promise } from "../../utils/classes/Promise";
import { Reference } from "./Reference";
import { Repo } from "../core/Repo";
import { parseRepoInfo } from "../core/util/util";
import { validateArgCount } from "../../utils/libs/validation";
import { validateUrl } from "../core/util/validation";

export class Database {
  static get ServerValue() {
    return {
      'TIMESTAMP': {
        '.sv' : 'timestamp'
      }
    }
  }
  public app;
  private root: Reference;
  constructor(private repo: Repo) {
    if (!(repo instanceof Repo)) {
      fatal(`Don't call new Database() directly - please use firebase.database().`);
    }
    this.root = new Reference(repo, Path.Empty);
    this.app = repo.app;
  }
  get INTERNAL() {
    return {
      delete: () => {
        this.repo = null;
        this.root = null;
        return Promise.resolve();
      }
    }
  }
  private checkDeleted(apiName) {
    if (this.repo === null) {
      fatal(`Cannot call ${apiName} on a deleted database.`);
    }
  }
  ref(pathString?): Reference {
    this.checkDeleted('ref');
    validateArgCount('database.ref', 0, 1, arguments.length);

    return pathString ? this.root.child(pathString) : this.root;
  }
  refFromURL(url: string) {
    var apiName = 'database.refFromURL';
    this.checkDeleted(apiName);
    validateArgCount(apiName, 1, 1, arguments.length);
    var parsedURL = parseRepoInfo(url);
    validateUrl(apiName, 1, parsedURL);

    var repoInfo = parsedURL.repoInfo;
    if (repoInfo.host !== this.repo.repoInfo.host) {
      fatal(apiName + ": Host name does not match the current database: " +
                         "(found " + repoInfo.host + " but expected " + this.repo.repoInfo.host + ")");
    }

    return this.ref(parsedURL.path.toString());
  }
  goOffline() {
    validateArgCount('database.goOffline', 0, 0, arguments.length);
    this.checkDeleted('goOffline');
    this.repo.interrupt();
  }
  goOnline() {
    validateArgCount('database.goOnline', 0, 0, arguments.length);
    this.checkDeleted('goOnline');
    this.repo.resume();
  }
}