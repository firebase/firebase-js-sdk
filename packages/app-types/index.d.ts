export type FirebaseOptions = {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  [name: string]: any;
};

export class FirebaseApp {
  constructor();
  /**
   * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
   * App.
   */
  name: string;

  /**
   * The (read-only) configuration options from the app initialization.
   */
  options: FirebaseOptions;

  /**
   * Make the given App unusable and free resources.
   */
  delete(): Promise<void>;
}

export interface FirebaseNamespace {
  /**
   * Create (and intialize) a FirebaseApp.
   *
   * @param options Options to configure the services use in the App.
   * @param name The optional name of the app to initialize ('[DEFAULT]' if
   *   none)
   */
  initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;

  app: {
    /**
     * Retrieve an instance of a FirebaseApp.
     *
     * Usage: firebase.app()
     *
     * @param name The optional name of the app to return ('[DEFAULT]' if none)
     */
    (name?: string): FirebaseApp;

    /**
     * For testing FirebaseApp instances: 
     *  app() instanceof firebase.app.App
     * 
     * DO NOT call this constuctor directly (use firebase.app() instead).
     */
    App: typeof FirebaseApp;
  };

  /**
   * A (read-only) array of all the initialized Apps.
   */
  apps: FirebaseApp[];

  // Inherit the type information of our exported Promise implementation from
  // es6-promises.
  Promise: typeof Promise;

  // The current SDK version ('${JSCORE_VERSION}').
  SDK_VERSION: string;
}
