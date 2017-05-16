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
goog.provide('fb.api.Database');
goog.require('fb.core.util.Path');


/**
 * Class representing a firebase database.
 * @implements {firebase.Service}
 */
fb.api.Database = goog.defineClass(null, {
  /**
   * The constructor should not be called by users of our public API.
   * @param {!fb.core.Repo} repo
   */
  constructor: function(repo) {
    if (!(repo instanceof fb.core.Repo)) {
      fb.core.util.fatal("Don't call new Database() directly - please use firebase.database().");
    }

    /** @type {fb.core.Repo} */
    this.repo_ = repo;

    /** @type {Firebase} */
    this.root_ = new Firebase(repo, fb.core.util.Path.Empty);

    this.INTERNAL = new fb.api.DatabaseInternals(this);
  },

  app: null,

  /**
   * Returns a reference to the root or the path specified in opt_pathString.
   * @param {string=} opt_pathString
   * @return {!Firebase} Firebase reference.
   */
  ref: function(opt_pathString) {
    this.checkDeleted_('ref');
    fb.util.validation.validateArgCount('database.ref', 0, 1, arguments.length);

    return goog.isDef(opt_pathString) ? this.root_.child(opt_pathString) :
        /** @type {!Firebase} */ (this.root_);
  },

  /**
   * Returns a reference to the root or the path specified in url.
   * We throw a exception if the url is not in the same domain as the
   * current repo.
   * @param {string} url
   * @return {!Firebase} Firebase reference.
   */
  refFromURL: function(url) {
    /** @const {string} */
    var apiName = 'database.refFromURL';
    this.checkDeleted_(apiName);
    fb.util.validation.validateArgCount(apiName, 1, 1, arguments.length);
    var parsedURL = fb.core.util.parseRepoInfo(url);
    fb.core.util.validation.validateUrl(apiName, 1, parsedURL);

    var repoInfo = parsedURL.repoInfo;
    if (repoInfo.host !== this.repo_.repoInfo_.host) {
      fb.core.util.fatal(apiName + ": Host name does not match the current database: " +
                         "(found " + repoInfo.host + " but expected " + this.repo_.repoInfo_.host + ")");
    }

    return this.ref(parsedURL.path.toString());
  },

  /**
   * @param {string} apiName
   * @private
   */
  checkDeleted_: function(apiName) {
    if (this.repo_ === null) {
      fb.core.util.fatal("Cannot call " + apiName + " on a deleted database.");
    }
  },

  // Make individual repo go offline.
  goOffline: function() {
    fb.util.validation.validateArgCount('database.goOffline', 0, 0, arguments.length);
    this.checkDeleted_('goOffline');
    this.repo_.interrupt();
  },

  goOnline: function () {
    fb.util.validation.validateArgCount('database.goOnline', 0, 0, arguments.length);
    this.checkDeleted_('goOnline');
    this.repo_.resume();
  },

  statics: {
    ServerValue: {
      'TIMESTAMP': {
        '.sv' : 'timestamp'
      }
    }
  }
});

// Note: This is an un-minfied property of the Database only.
Object.defineProperty(fb.api.Database.prototype, 'app', {
  /**
   * @this {!fb.api.Database}
   * @return {!firebase.app.App}
   */
  get: function() {
    return this.repo_.app;
  }
});


fb.api.DatabaseInternals = goog.defineClass(null, {
  /** @param {!fb.api.Database} database */
  constructor: function(database) {
    this.database = database;
  },

  /** @return {firebase.Promise<void>} */
  delete: function() {
    this.database.checkDeleted_('delete');
    fb.core.RepoManager.getInstance().deleteRepo(/** @type {!fb.core.Repo} */ (this.database.repo_));

    this.database.repo_ = null;
    this.database.root_ = null;
    this.database.INTERNAL = null;
    this.database = null;
    return firebase.Promise.resolve();
  },
});

goog.exportProperty(fb.api.Database.prototype, 'ref', fb.api.Database.prototype.ref);
goog.exportProperty(fb.api.Database.prototype, 'refFromURL', fb.api.Database.prototype.refFromURL);
goog.exportProperty(fb.api.Database.prototype, 'goOnline', fb.api.Database.prototype.goOnline);
goog.exportProperty(fb.api.Database.prototype, 'goOffline', fb.api.Database.prototype.goOffline);

goog.exportProperty(fb.api.DatabaseInternals.prototype, 'delete',
                    fb.api.DatabaseInternals.prototype.delete);
