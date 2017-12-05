const { Reference } = require('./dist/cjs/src/api/Reference');
const { Query } = require('./dist/cjs/src/api/Query');
const { Database } = require('./dist/cjs/src/api/Database');
const { enableLogging } = require('./dist/cjs/src/core/util/util');
const INTERNAL = require('./dist/cjs/src/api/internal');
const TEST_ACCESS = require('./dist/cjs/src/api/test_access');
const RepoManager = require('./dist/cjs/src/core/RepoManager');
const firebaseApp = require('@firebase/app');

exports.initStandalone = function(app, url, version) {
  const instance = RepoManager.getInstance().databaseFromApp(app, url);

  if (version) {
    /**
     * We are patching the version info in @firebase/app as
     * the database SDK sends this version back to our backend
     */
    firebaseApp.default.SDK_VERSION = version;
  }

  return {
    instance,
    namespace: {
      Reference,
      Query,
      Database,
      enableLogging,
      INTERNAL,
      ServerValue: Database.ServerValue,
      TEST_ACCESS
    }
  };
};
