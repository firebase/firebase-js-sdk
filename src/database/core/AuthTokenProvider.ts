import { log, warn } from "./util/util";

/**
 * Abstraction around FirebaseApp's token fetching capabilities.
 */
export class AuthTokenProvider {
  private app_;

  /**
   * @param {!firebase.app.App} app
   */
  constructor(app) {
    /** @private {!firebase.app.App} */
    this.app_ = app;
  }

  /**
   * @param {boolean} forceRefresh
   * @return {!Promise<firebase.AuthTokenData>}
   */
  getToken(forceRefresh) {
    return this.app_['INTERNAL']['getToken'](forceRefresh)
      .then(
        null,
        // .catch
        function(error) {
          // TODO: Need to figure out all the cases this is raised and whether
          // this makes sense.
          if (error && error.code === 'auth/token-not-initialized') {
            log('Got auth/token-not-initialized error.  Treating as null token.');
            return null;
          } else {
            return Promise.reject(error);
          }
        });
  }

  addTokenChangeListener(listener) {
    // TODO: We might want to wrap the listener and call it with no args to
    // avoid a leaky abstraction, but that makes removing the listener harder.
    this.app_['INTERNAL']['addAuthTokenListener'](listener);
  }

  removeTokenChangeListener(listener) {
    this.app_['INTERNAL']['removeAuthTokenListener'](listener);
  }

  notifyForInvalidToken() {
    var errorMessage = 'Provided authentication credentials for the app named "' +
      this.app_.name + '" are invalid. This usually indicates your app was not ' +
      'initialized correctly. ';
    if ('credential' in this.app_.options) {
      errorMessage += 'Make sure the "credential" property provided to initializeApp() ' +
        'is authorized to access the specified "databaseURL" and is from the correct ' +
        'project.';
    } else if ('serviceAccount' in this.app_.options) {
      errorMessage += 'Make sure the "serviceAccount" property provided to initializeApp() ' +
        'is authorized to access the specified "databaseURL" and is from the correct ' +
        'project.';
    } else {
      errorMessage += 'Make sure the "apiKey" and "databaseURL" properties provided to ' +
      'initializeApp() match the values provided for your app at ' +
      'https://console.firebase.google.com/.';
    }
    warn(errorMessage);
  }
};
