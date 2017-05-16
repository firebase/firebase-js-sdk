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
goog.provide('fb.core.RepoManager');
goog.require('fb.core.Repo');
goog.require('fb.core.Repo_transaction');
goog.require('fb.util.obj');


/** @const {string} */
var DATABASE_URL_OPTION = 'databaseURL';


/**
 * Creates and caches fb.core.Repo instances.
 */
fb.core.RepoManager = goog.defineClass(null, {
  constructor: function() {
    /**
     * @private {!Object.<string, !fb.core.Repo>}
     */
    this.repos_ = { };

    /**
     * If true, new Repos will be created to use ReadonlyRestClient (for testing purposes).
     * @private {boolean}
     */
    this.useRestClient_ = false;
  },

  // TODO(koss): Remove these functions unless used in tests?
  interrupt: function() {
    for (var repo in this.repos_) {
      this.repos_[repo].interrupt();
    }
  },

  resume: function() {
    for (var repo in this.repos_) {
      this.repos_[repo].resume();
    }
  },

  /**
   * This function should only ever be called to CREATE a new database instance.
   *
   * @param {!firebase.app.App} app
   * @return {!fb.api.Database}
   */
  databaseFromApp: function(app) {
    var dbUrl = app.options[DATABASE_URL_OPTION];
    if (!goog.isDef(dbUrl)) {
      fb.core.util.fatal("Can't determine Firebase Database URL.  Be sure to include " +
                         DATABASE_URL_OPTION +
                         " option when calling firebase.intializeApp().");
    }

    var parsedUrl = fb.core.util.parseRepoInfo(dbUrl);
    var repoInfo = parsedUrl.repoInfo;

    fb.core.util.validation.validateUrl('Invalid Firebase Database URL', 1, parsedUrl);
    if (!parsedUrl.path.isEmpty()) {
      fb.core.util.fatal("Database URL must point to the root of a Firebase Database " +
                         "(not including a child path).");
    }

    var repo = this.createRepo(repoInfo, app);

    return repo.database;
  },

  /**
   * Remove the repo and make sure it is disconnected.
   *
   * @param {!fb.core.Repo} repo
   */
  deleteRepo: function(repo) {
    // This should never happen...
    if (fb.util.obj.get(this.repos_, repo.app.name) !== repo) {
      fb.core.util.fatal("Database " + repo.app.name + " has already been deleted.");
    }
    repo.interrupt();
    delete this.repos_[repo.app.name];
  },

  /**
   * Ensures a repo doesn't already exist and then creates one using the
   * provided app.
   *
   * @param {!fb.core.RepoInfo} repoInfo The metadata about the Repo
   * @param {!firebase.app.App} app
   * @return {!fb.core.Repo} The Repo object for the specified server / repoName.
   */
  createRepo: function(repoInfo, app) {
    var repo = fb.util.obj.get(this.repos_, app.name);
    if (repo) {
      fb.core.util.fatal('FIREBASE INTERNAL ERROR: Database initialized multiple times.');
    }
    repo = new fb.core.Repo(repoInfo, this.useRestClient_, app);
    this.repos_[app.name] = repo;

    return repo;
  },

  /**
   * Forces us to use ReadonlyRestClient instead of PersistentConnection for new Repos.
   * @param {boolean} forceRestClient
   */
  forceRestClient: function(forceRestClient) {
    this.useRestClient_ = forceRestClient;
  },
}); // end fb.core.RepoManager

goog.addSingletonGetter(fb.core.RepoManager);
goog.exportProperty(fb.core.RepoManager.prototype, 'interrupt', fb.core.RepoManager.prototype.interrupt);
goog.exportProperty(fb.core.RepoManager.prototype, 'resume', fb.core.RepoManager.prototype.resume);
