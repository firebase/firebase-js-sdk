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
declare namespace firebase {
  type NextFn<T> = (value: T) => void;
  type ErrorFn<E = Error> = (error: E) => void;
  type CompleteFn = () => void;

  interface FirebaseError {
    code: string;
    message: string;
    name: string;
    stack?: string;
  }

  interface Observer<T, E = Error> {
    next: NextFn<T>;
    error: ErrorFn<E>;
    complete: CompleteFn;
  }

  var SDK_VERSION: string;

  type Unsubscribe = () => void;

  interface User extends firebase.UserInfo {
    delete(): Promise<void>;
    emailVerified: boolean;
    getIdTokenResult(
      forceRefresh?: boolean
    ): Promise<firebase.auth.IdTokenResult>;
    getIdToken(forceRefresh?: boolean): Promise<string>;
    isAnonymous: boolean;
    linkAndRetrieveDataWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.auth.UserCredential>;
    linkWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.User>;
    linkWithPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<firebase.auth.ConfirmationResult>;
    linkWithPopup(
      provider: firebase.auth.AuthProvider
    ): Promise<firebase.auth.UserCredential>;
    linkWithRedirect(provider: firebase.auth.AuthProvider): Promise<void>;
    metadata: firebase.auth.UserMetadata;
    phoneNumber: string | null;
    providerData: (firebase.UserInfo | null)[];
    reauthenticateAndRetrieveDataWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.auth.UserCredential>;
    reauthenticateWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<void>;
    reauthenticateWithPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<firebase.auth.ConfirmationResult>;
    reauthenticateWithPopup(
      provider: firebase.auth.AuthProvider
    ): Promise<firebase.auth.UserCredential>;
    reauthenticateWithRedirect(
      provider: firebase.auth.AuthProvider
    ): Promise<void>;
    refreshToken: string;
    reload(): Promise<void>;
    sendEmailVerification(
      actionCodeSettings?: firebase.auth.ActionCodeSettings | null
    ): Promise<void>;
    toJSON(): Object;
    unlink(providerId: string): Promise<firebase.User>;
    updateEmail(newEmail: string): Promise<void>;
    updatePassword(newPassword: string): Promise<void>;
    updatePhoneNumber(
      phoneCredential: firebase.auth.AuthCredential
    ): Promise<void>;
    updateProfile(profile: {
      displayName: string | null;
      photoURL: string | null;
    }): Promise<void>;
  }

  interface UserInfo {
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
    uid: string;
  }

  function app(name?: string): firebase.app.App;

  var apps: firebase.app.App[];

  function auth(app?: firebase.app.App): firebase.auth.Auth;

  function database(app?: firebase.app.App): firebase.database.Database;

  function initializeApp(options: Object, name?: string): firebase.app.App;

  function messaging(app?: firebase.app.App): firebase.messaging.Messaging;

  function storage(app?: firebase.app.App): firebase.storage.Storage;

  function firestore(app?: firebase.app.App): firebase.firestore.Firestore;

  function functions(app?: firebase.app.App): firebase.functions.Functions;
}

declare namespace firebase.app {
  interface App {
    auth(): firebase.auth.Auth;
    database(url?: string): firebase.database.Database;
    delete(): Promise<any>;
    messaging(): firebase.messaging.Messaging;
    name: string;
    options: Object;
    storage(url?: string): firebase.storage.Storage;
    firestore(): firebase.firestore.Firestore;
    functions(region?: string): firebase.functions.Functions;
  }
}

declare namespace firebase.functions {
  export interface HttpsCallableResult {
    readonly data: any;
  }
  export interface HttpsCallable {
    (data?: any): Promise<HttpsCallableResult>;
  }
  export class Functions {
    private constructor();
    useFunctionsEmulator(url: string): void;
    httpsCallable(name: string): HttpsCallable;
  }
  export type ErrorStatus =
    | 'ok'
    | 'cancelled'
    | 'unknown'
    | 'invalid-argument'
    | 'deadline-exceeded'
    | 'not-found'
    | 'already-exists'
    | 'permission-denied'
    | 'resource-exhausted'
    | 'failed-precondition'
    | 'aborted'
    | 'out-of-range'
    | 'unimplemented'
    | 'internal'
    | 'unavailable'
    | 'data-loss'
    | 'unauthenticated';
  export interface HttpsError extends Error {
    readonly code: ErrorStatus;
    readonly details?: any;
  }
}

declare namespace firebase.auth {
  interface ActionCodeInfo {
    data: {
      email?: string | null;
      fromEmail?: string | null;
    };
    operation: string;
  }

  type ActionCodeSettings = {
    android?: {
      installApp?: boolean;
      minimumVersion?: string;
      packageName: string;
    };
    handleCodeInApp?: boolean;
    iOS?: { bundleId: string };
    url: string;
    dynamicLinkDomain?: string;
  };

  type AdditionalUserInfo = {
    isNewUser: boolean;
    profile: Object | null;
    providerId: string;
    username?: string | null;
  };

  interface ApplicationVerifier {
    type: string;
    verify(): Promise<string>;
  }

  interface AuthSettings {
    appVerificationDisabledForTesting: boolean;
  }

  interface Auth {
    app: firebase.app.App;
    applyActionCode(code: string): Promise<void>;
    checkActionCode(code: string): Promise<firebase.auth.ActionCodeInfo>;
    confirmPasswordReset(code: string, newPassword: string): Promise<void>;
    createUserAndRetrieveDataWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;
    createUserWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;
    currentUser: firebase.User | null;
    fetchProvidersForEmail(email: string): Promise<Array<string>>;
    fetchSignInMethodsForEmail(email: string): Promise<Array<string>>;
    isSignInWithEmailLink(emailLink: string): boolean;
    getRedirectResult(): Promise<firebase.auth.UserCredential>;
    languageCode: string | null;
    settings: firebase.auth.AuthSettings;
    onAuthStateChanged(
      nextOrObserver:
        | firebase.Observer<any>
        | ((a: firebase.User | null) => any),
      error?: (a: firebase.auth.Error) => any,
      completed?: firebase.Unsubscribe
    ): firebase.Unsubscribe;
    onIdTokenChanged(
      nextOrObserver:
        | firebase.Observer<any>
        | ((a: firebase.User | null) => any),
      error?: (a: firebase.auth.Error) => any,
      completed?: firebase.Unsubscribe
    ): firebase.Unsubscribe;
    sendSignInLinkToEmail(
      email: string,
      actionCodeSettings: firebase.auth.ActionCodeSettings
    ): Promise<void>;
    sendPasswordResetEmail(
      email: string,
      actionCodeSettings?: firebase.auth.ActionCodeSettings | null
    ): Promise<void>;
    setPersistence(persistence: firebase.auth.Auth.Persistence): Promise<void>;
    signInAndRetrieveDataWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.auth.UserCredential>;
    signInAnonymously(): Promise<firebase.auth.UserCredential>;
    signInAnonymouslyAndRetrieveData(): Promise<firebase.auth.UserCredential>;
    signInWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.User>;
    signInWithCustomToken(token: string): Promise<firebase.auth.UserCredential>;
    signInAndRetrieveDataWithCustomToken(
      token: string
    ): Promise<firebase.auth.UserCredential>;
    signInWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;
    signInAndRetrieveDataWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;
    signInWithPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<firebase.auth.ConfirmationResult>;
    signInWithEmailLink(
      email: string,
      emailLink?: string
    ): Promise<firebase.auth.UserCredential>;
    signInWithPopup(
      provider: firebase.auth.AuthProvider
    ): Promise<firebase.auth.UserCredential>;
    signInWithRedirect(provider: firebase.auth.AuthProvider): Promise<void>;
    signOut(): Promise<void>;
    updateCurrentUser(user: firebase.User | null): Promise<void>;
    useDeviceLanguage(): void;
    verifyPasswordResetCode(code: string): Promise<string>;
  }

  interface AuthCredential {
    providerId: string;
    signInMethod: string;
  }

  interface AuthProvider {
    providerId: string;
  }

  interface ConfirmationResult {
    confirm(verificationCode: string): Promise<firebase.auth.UserCredential>;
    verificationId: string;
  }

  class EmailAuthProvider extends EmailAuthProvider_Instance {
    static PROVIDER_ID: string;
    static EMAIL_PASSWORD_SIGN_IN_METHOD: string;
    static EMAIL_LINK_SIGN_IN_METHOD: string;
    static credential(
      email: string,
      password: string
    ): firebase.auth.AuthCredential;
    static credentialWithLink(
      email: string,
      emailLink: string
    ): firebase.auth.AuthCredential;
  }
  class EmailAuthProvider_Instance implements firebase.auth.AuthProvider {
    providerId: string;
  }

  interface Error {
    code: string;
    message: string;
  }

  class FacebookAuthProvider extends FacebookAuthProvider_Instance {
    static PROVIDER_ID: string;
    static FACEBOOK_SIGN_IN_METHOD: string;
    static credential(token: string): firebase.auth.AuthCredential;
  }
  class FacebookAuthProvider_Instance implements firebase.auth.AuthProvider {
    addScope(scope: string): firebase.auth.AuthProvider;
    providerId: string;
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  class GithubAuthProvider extends GithubAuthProvider_Instance {
    static PROVIDER_ID: string;
    static GITHUB_SIGN_IN_METHOD: string;
    static credential(token: string): firebase.auth.AuthCredential;
  }
  class GithubAuthProvider_Instance implements firebase.auth.AuthProvider {
    addScope(scope: string): firebase.auth.AuthProvider;
    providerId: string;
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  class GoogleAuthProvider extends GoogleAuthProvider_Instance {
    static PROVIDER_ID: string;
    static GOOGLE_SIGN_IN_METHOD: string;
    static credential(
      idToken?: string | null,
      accessToken?: string | null
    ): firebase.auth.AuthCredential;
  }
  class GoogleAuthProvider_Instance implements firebase.auth.AuthProvider {
    addScope(scope: string): firebase.auth.AuthProvider;
    providerId: string;
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  interface IdTokenResult {
    token: string;
    expirationTime: string;
    authTime: string;
    issuedAtTime: string;
    signInProvider: string | null;
    claims: {
      [key: string]: any;
    };
  }

  class PhoneAuthProvider extends PhoneAuthProvider_Instance {
    static PROVIDER_ID: string;
    static PHONE_SIGN_IN_METHOD: string;
    static credential(
      verificationId: string,
      verificationCode: string
    ): firebase.auth.AuthCredential;
  }
  class PhoneAuthProvider_Instance implements firebase.auth.AuthProvider {
    constructor(auth?: firebase.auth.Auth | null);
    providerId: string;
    verifyPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<string>;
  }

  class RecaptchaVerifier extends RecaptchaVerifier_Instance {}
  class RecaptchaVerifier_Instance
    implements firebase.auth.ApplicationVerifier {
    constructor(
      container: any | string,
      parameters?: Object | null,
      app?: firebase.app.App | null
    );
    clear(): void;
    render(): Promise<number>;
    type: string;
    verify(): Promise<string>;
  }

  class TwitterAuthProvider extends TwitterAuthProvider_Instance {
    static PROVIDER_ID: string;
    static TWITTER_SIGN_IN_METHOD: string;
    static credential(
      token: string,
      secret: string
    ): firebase.auth.AuthCredential;
  }
  class TwitterAuthProvider_Instance implements firebase.auth.AuthProvider {
    providerId: string;
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  type UserCredential = {
    additionalUserInfo?: firebase.auth.AdditionalUserInfo | null;
    credential: firebase.auth.AuthCredential | null;
    operationType?: string | null;
    user: firebase.User | null;
  };

  interface UserMetadata {
    creationTime?: string;
    lastSignInTime?: string;
  }
}

declare namespace firebase.auth.Auth {
  type Persistence = string;
  var Persistence: {
    LOCAL: Persistence;
    NONE: Persistence;
    SESSION: Persistence;
  };
}

declare namespace firebase.database {
  interface DataSnapshot {
    child(path: string): firebase.database.DataSnapshot;
    exists(): boolean;
    exportVal(): any;
    forEach(
      action: (a: firebase.database.DataSnapshot) => boolean | void
    ): boolean;
    getPriority(): string | number | null;
    hasChild(path: string): boolean;
    hasChildren(): boolean;
    key: string | null;
    numChildren(): number;
    val(): any;
    ref: firebase.database.Reference;
    toJSON(): Object | null;
  }

  interface Database {
    app: firebase.app.App;
    goOffline(): any;
    goOnline(): any;
    ref(path?: string): firebase.database.Reference;
    refFromURL(url: string): firebase.database.Reference;
  }

  interface OnDisconnect {
    cancel(onComplete?: (a: Error | null) => any): Promise<any>;
    remove(onComplete?: (a: Error | null) => any): Promise<any>;
    set(value: any, onComplete?: (a: Error | null) => any): Promise<any>;
    setWithPriority(
      value: any,
      priority: number | string | null,
      onComplete?: (a: Error | null) => any
    ): Promise<any>;
    update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
  }

  type EventType =
    | 'value'
    | 'child_added'
    | 'child_changed'
    | 'child_moved'
    | 'child_removed';

  interface Query {
    endAt(
      value: number | string | boolean | null,
      key?: string
    ): firebase.database.Query;
    equalTo(
      value: number | string | boolean | null,
      key?: string
    ): firebase.database.Query;
    isEqual(other: firebase.database.Query | null): boolean;
    limitToFirst(limit: number): firebase.database.Query;
    limitToLast(limit: number): firebase.database.Query;
    off(
      eventType?: EventType,
      callback?: (a: firebase.database.DataSnapshot, b?: string | null) => any,
      context?: Object | null
    ): any;
    on(
      eventType: EventType,
      callback: (a: firebase.database.DataSnapshot | null, b?: string) => any,
      cancelCallbackOrContext?: Object | null,
      context?: Object | null
    ): (a: firebase.database.DataSnapshot | null, b?: string) => any;
    once(
      eventType: EventType,
      successCallback?: (a: firebase.database.DataSnapshot, b?: string) => any,
      failureCallbackOrContext?: Object | null,
      context?: Object | null
    ): Promise<DataSnapshot>;
    orderByChild(path: string): firebase.database.Query;
    orderByKey(): firebase.database.Query;
    orderByPriority(): firebase.database.Query;
    orderByValue(): firebase.database.Query;
    ref: firebase.database.Reference;
    startAt(
      value: number | string | boolean | null,
      key?: string
    ): firebase.database.Query;
    toJSON(): Object;
    toString(): string;
  }

  interface Reference extends firebase.database.Query {
    child(path: string): firebase.database.Reference;
    key: string | null;
    onDisconnect(): firebase.database.OnDisconnect;
    parent: firebase.database.Reference | null;
    push(
      value?: any,
      onComplete?: (a: Error | null) => any
    ): firebase.database.ThenableReference;
    remove(onComplete?: (a: Error | null) => any): Promise<any>;
    root: firebase.database.Reference;
    set(value: any, onComplete?: (a: Error | null) => any): Promise<any>;
    setPriority(
      priority: string | number | null,
      onComplete: (a: Error | null) => any
    ): Promise<any>;
    setWithPriority(
      newVal: any,
      newPriority: string | number | null,
      onComplete?: (a: Error | null) => any
    ): Promise<any>;
    transaction(
      transactionUpdate: (a: any) => any,
      onComplete?: (
        a: Error | null,
        b: boolean,
        c: firebase.database.DataSnapshot | null
      ) => any,
      applyLocally?: boolean
    ): Promise<any>;
    update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
  }

  interface ThenableReference
    extends firebase.database.Reference,
      PromiseLike<any> {}

  function enableLogging(
    logger?: boolean | ((a: string) => any),
    persistent?: boolean
  ): any;
}

declare namespace firebase.database.ServerValue {
  var TIMESTAMP: Object;
}

declare namespace firebase.messaging {
  interface Messaging {
    deleteToken(token: string): Promise<boolean>;
    getToken(): Promise<string | null>;
    onMessage(
      nextOrObserver: firebase.NextFn<any> | firebase.Observer<any>,
      error?: firebase.ErrorFn,
      completed?: firebase.CompleteFn
    ): firebase.Unsubscribe;
    onTokenRefresh(
      nextOrObserver: firebase.NextFn<any> | firebase.Observer<any>,
      error?: firebase.ErrorFn,
      completed?: firebase.CompleteFn
    ): firebase.Unsubscribe;
    requestPermission(): Promise<void>;
    setBackgroundMessageHandler(
      callback: (payload: any) => Promise<any> | void
    ): void;
    useServiceWorker(registration: ServiceWorkerRegistration): void;
    usePublicVapidKey(b64PublicKey: string): void;
  }

  function isSupported(): boolean;
}

declare namespace firebase.storage {
  interface FullMetadata extends firebase.storage.UploadMetadata {
    bucket: string;
    /**
     * @deprecated
     * Use Reference.getDownloadURL instead. This property will be removed in a
     * future release.
     */
    downloadURLs: string[];
    fullPath: string;
    generation: string;
    metageneration: string;
    name: string;
    size: number;
    timeCreated: string;
    updated: string;
  }

  interface Reference {
    bucket: string;
    child(path: string): firebase.storage.Reference;
    delete(): Promise<any>;
    fullPath: string;
    getDownloadURL(): Promise<any>;
    getMetadata(): Promise<any>;
    name: string;
    parent: firebase.storage.Reference | null;
    put(
      data: any | any | any,
      metadata?: firebase.storage.UploadMetadata
    ): firebase.storage.UploadTask;
    putString(
      data: string,
      format?: firebase.storage.StringFormat,
      metadata?: firebase.storage.UploadMetadata
    ): firebase.storage.UploadTask;
    root: firebase.storage.Reference;
    storage: firebase.storage.Storage;
    toString(): string;
    updateMetadata(metadata: firebase.storage.SettableMetadata): Promise<any>;
  }

  interface SettableMetadata {
    cacheControl?: string | null;
    contentDisposition?: string | null;
    contentEncoding?: string | null;
    contentLanguage?: string | null;
    contentType?: string | null;
    customMetadata?: {
      [/* warning: coerced from ? */ key: string]: string;
    } | null;
  }

  interface Storage {
    app: firebase.app.App;
    maxOperationRetryTime: number;
    maxUploadRetryTime: number;
    ref(path?: string): firebase.storage.Reference;
    refFromURL(url: string): firebase.storage.Reference;
    setMaxOperationRetryTime(time: number): any;
    setMaxUploadRetryTime(time: number): any;
  }

  type StringFormat = string;
  var StringFormat: {
    BASE64: StringFormat;
    BASE64URL: StringFormat;
    DATA_URL: StringFormat;
    RAW: StringFormat;
  };

  type TaskEvent = string;
  var TaskEvent: {
    STATE_CHANGED: TaskEvent;
  };

  type TaskState = string;
  var TaskState: {
    CANCELED: TaskState;
    ERROR: TaskState;
    PAUSED: TaskState;
    RUNNING: TaskState;
    SUCCESS: TaskState;
  };

  interface UploadMetadata extends firebase.storage.SettableMetadata {
    md5Hash?: string | null;
  }

  interface UploadTask {
    cancel(): boolean;
    catch(onRejected: (a: Error) => any): Promise<any>;
    on(
      event: firebase.storage.TaskEvent,
      nextOrObserver?: firebase.Observer<any> | null | ((a: Object) => any),
      error?: ((a: Error) => any) | null,
      complete?: (firebase.Unsubscribe) | null
    ): Function;
    pause(): boolean;
    resume(): boolean;
    snapshot: firebase.storage.UploadTaskSnapshot;
    then(
      onFulfilled?: ((a: firebase.storage.UploadTaskSnapshot) => any) | null,
      onRejected?: ((a: Error) => any) | null
    ): Promise<any>;
  }

  interface UploadTaskSnapshot {
    bytesTransferred: number;
    /**
     * @deprecated
     * Use Reference.getDownloadURL instead. This property will be removed in a
     * future release.
     */
    downloadURL: string | null;
    metadata: firebase.storage.FullMetadata;
    ref: firebase.storage.Reference;
    state: firebase.storage.TaskState;
    task: firebase.storage.UploadTask;
    totalBytes: number;
  }
}

declare namespace firebase.firestore {
  /**
   * Document data (for use with `DocumentReference.set()`) consists of fields
   * mapped to values.
   */
  export type DocumentData = { [field: string]: any };

  /**
   * Update data (for use with `DocumentReference.update()`) consists of field
   * paths (e.g. 'foo' or 'foo.baz') mapped to values. Fields that contain dots
   * reference nested fields within the document.
   */
  export type UpdateData = { [fieldPath: string]: any };

  /** Settings used to configure a `Firestore` instance. */
  export interface Settings {
    /** The hostname to connect to. */
    host?: string;
    /** Whether to use SSL when connecting. */
    ssl?: boolean;

    /**
     * Enables the use of `Timestamp`s for timestamp fields in
     * `DocumentSnapshot`s.
     *
     * Currently, Firestore returns timestamp fields as `Date` but `Date` only
     * supports millisecond precision, which leads to truncation and causes
     * unexpected behavior when using a timestamp from a snapshot as a part
     * of a subsequent query.
     *
     * Setting `timestampsInSnapshots` to true will cause Firestore to return
     * `Timestamp` values instead of `Date` avoiding this kind of problem. To make
     * this work you must also change any code that uses `Date` to use `Timestamp`
     * instead.
     *
     * NOTE: in the future `timestampsInSnapshots: true` will become the
     * default and this option will be removed so you should change your code to
     * use Timestamp now and opt-in to this new behavior as soon as you can.
     */
    timestampsInSnapshots?: boolean;
  }

  /**
   * Settings that can be passed to Firestore.enablePersistence() to configure
   * Firestore persistence.
   */
  export interface PersistenceSettings {
    /**
     * Whether to synchronize the in-memory state of multiple tabs. Setting this
     * to 'true' in all open tabs enables shared access to local persistence,
     * shared execution of queries and latency-compensated local document updates
     * across all connected instances.
     *
     * To enable this mode, `experimentalTabSynchronization:true` needs to be set
     * globally in all active tabs. If omitted or set to 'false',
     * `enablePersistence()` will fail in all but the first tab.
     *
     * NOTE: This mode is not yet recommended for production use.
     */
    experimentalTabSynchronization?: boolean;
  }

  export type LogLevel = 'debug' | 'error' | 'silent';

  export function setLogLevel(logLevel: LogLevel): void;

  /**
   * `Firestore` represents a Firestore Database and is the entry point for all
   * Firestore operations.
   */
  export class Firestore {
    private constructor();
    /**
     * Specifies custom settings to be used to configure the `Firestore`
     * instance. Must be set before invoking any other methods.
     *
     * @param settings The settings to use.
     */
    settings(settings: Settings): void;

    /**
     * Attempts to enable persistent storage, if possible.
     *
     * Must be called before any other methods (other than settings()).
     *
     * If this fails, enablePersistence() will reject the promise it returns.
     * Note that even after this failure, the firestore instance will remain
     * usable, however offline persistence will be disabled.
     *
     * There are several reasons why this can fail, which can be identified by
     * the `code` on the error.
     *
     *   * failed-precondition: The app is already open in another browser tab.
     *   * unimplemented: The browser is incompatible with the offline
     *     persistence implementation.
     *
     * @param settings Optional settings object to configure persistence.
     * @return A promise that represents successfully enabling persistent
     * storage.
     */
    enablePersistence(settings?: PersistenceSettings): Promise<void>;

    /**
     * Gets a `CollectionReference` instance that refers to the collection at
     * the specified path.
     *
     * @param collectionPath A slash-separated path to a collection.
     * @return The `CollectionReference` instance.
     */
    collection(collectionPath: string): CollectionReference;

    /**
     * Gets a `DocumentReference` instance that refers to the document at the
     * specified path.
     *
     * @param documentPath A slash-separated path to a document.
     * @return The `DocumentReference` instance.
     */
    doc(documentPath: string): DocumentReference;

    /**
     * Executes the given updateFunction and then attempts to commit the
     * changes applied within the transaction. If any document read within the
     * transaction has changed, the updateFunction will be retried. If it fails
     * to commit after 5 attempts, the transaction will fail.
     *
     * @param updateFunction The function to execute within the transaction
     * context.
     * @return If the transaction completed successfully or was explicitly
     * aborted (by the updateFunction returning a failed Promise), the Promise
     * returned by the updateFunction will be returned here. Else if the
     * transaction failed, a rejected Promise with the corresponding failure
     * error will be returned.
     */
    runTransaction<T>(
      updateFunction: (transaction: Transaction) => Promise<T>
    ): Promise<T>;

    /**
     * Creates a write batch, used for performing multiple writes as a single
     * atomic operation.
     */
    batch(): WriteBatch;

    /**
     * The `FirebaseApp` associated with this `Firestore` instance.
     */
    app: firebase.app.App;

    /**
     * Re-enables use of the network for this Firestore instance after a prior
     * call to disableNetwork().
     *
     * @return A promise that is resolved once the network has been enabled.
     */
    enableNetwork(): Promise<void>;

    /**
     * Disables network usage for this instance. It can be re-enabled via
     * enableNetwork(). While the network is disabled, any snapshot listeners or
     * get() calls will return results from cache, and any write operations will
     * be queued until the network is restored.
     *
     * @return A promise that is resolved once the network has been disabled.
     */
    disableNetwork(): Promise<void>;

    INTERNAL: { delete: () => Promise<void> };
  }

  /**
   * An immutable object representing a geo point in Firestore. The geo point
   * is represented as latitude/longitude pair.
   *
   * Latitude values are in the range of [-90, 90].
   * Longitude values are in the range of [-180, 180].
   */
  export class GeoPoint {
    /**
     * Creates a new immutable GeoPoint object with the provided latitude and
     * longitude values.
     * @param latitude The latitude as number between -90 and 90.
     * @param longitude The longitude as number between -180 and 180.
     */
    constructor(latitude: number, longitude: number);

    readonly latitude: number;
    readonly longitude: number;

    /**
     * Returns true if this `GeoPoint` is equal to the provided one.
     *
     * @param other The `GeoPoint` to compare against.
     * @return true if this `GeoPoint` is equal to the provided one.
     */
    isEqual(other: GeoPoint): boolean;
  }

  /**
   * A Timestamp represents a point in time independent of any time zone or
   * calendar, represented as seconds and fractions of seconds at nanosecond
   * resolution in UTC Epoch time. It is encoded using the Proleptic Gregorian
   * Calendar which extends the Gregorian calendar backwards to year one. It is
   * encoded assuming all minutes are 60 seconds long, i.e. leap seconds are
   * "smeared" so that no leap second table is needed for interpretation. Range is
   * from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59.999999999Z.
   *
   * @see https://github.com/google/protobuf/blob/master/src/google/protobuf/timestamp.proto
   */
  export class Timestamp {
    /**
     * Creates a new timestamp with the current date, with millisecond precision.
     *
     * @return a new timestamp representing the current date.
     */
    static now(): Timestamp;

    /**
     * Creates a new timestamp from the given date.
     *
     * @param date The date to initialize the `Timestamp` from.
     * @return A new `Timestamp` representing the same point in time as the given
     *     date.
     */
    static fromDate(date: Date): Timestamp;

    /**
     * Creates a new timestamp from the given number of milliseconds.
     *
     * @param milliseconds Number of milliseconds since Unix epoch
     *     1970-01-01T00:00:00Z.
     * @return A new `Timestamp` representing the same point in time as the given
     *     number of milliseconds.
     */
    static fromMillis(milliseconds: number): Timestamp;

    /**
     * Creates a new timestamp.
     *
     * @param seconds The number of seconds of UTC time since Unix epoch
     *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
     *     9999-12-31T23:59:59Z inclusive.
     * @param nanoseconds The non-negative fractions of a second at nanosecond
     *     resolution. Negative second values with fractions must still have
     *     non-negative nanoseconds values that count forward in time. Must be
     *     from 0 to 999,999,999 inclusive.
     */
    constructor(seconds: number, nanoseconds: number);

    readonly seconds: number;
    readonly nanoseconds: number;

    /**
     * Returns a new `Date` corresponding to this timestamp. This may lose
     * precision.
     *
     * @return JavaScript `Date` object representing the same point in time as
     *     this `Timestamp`, with millisecond precision.
     */
    toDate(): Date;

    /**
     * Returns the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
     *
     * @return The point in time corresponding to this timestamp, represented as
     *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
     */
    toMillis(): number;

    /**
     * Returns true if this `Timestamp` is equal to the provided one.
     *
     * @param other The `Timestamp` to compare against.
     * @return true if this `Timestamp` is equal to the provided one.
     */
    isEqual(other: Timestamp): boolean;
  }

  /**
   * An immutable object representing an array of bytes.
   */
  export class Blob {
    private constructor();

    /**
     * Creates a new Blob from the given Base64 string, converting it to
     * bytes.
     */
    static fromBase64String(base64: string): Blob;

    /**
     * Creates a new Blob from the given Uint8Array.
     */
    static fromUint8Array(array: Uint8Array): Blob;

    /**
     * Returns the bytes of this Blob as a Base64-encoded string.
     */
    public toBase64(): string;

    /**
     * Returns the bytes of this Blob in a new Uint8Array.
     */
    public toUint8Array(): Uint8Array;

    /**
     * Returns true if this `Blob` is equal to the provided one.
     *
     * @param other The `Blob` to compare against.
     * @return true if this `Blob` is equal to the provided one.
     */
    isEqual(other: Blob): boolean;
  }

  /**
   * A reference to a transaction.
   * The `Transaction` object passed to a transaction's updateFunction provides
   * the methods to read and write data within the transaction context. See
   * `Firestore.runTransaction()`.
   */
  export class Transaction {
    private constructor();

    /**
     * Reads the document referenced by the provided `DocumentReference.`
     *
     * @param documentRef A reference to the document to be read.
     * @return A DocumentSnapshot for the read data.
     */
    get(documentRef: DocumentReference): Promise<DocumentSnapshot>;

    /**
     * Writes to the document referred to by the provided `DocumentReference`.
     * If the document does not exist yet, it will be created. If you pass
     * `SetOptions`, the provided data can be merged into the existing document.
     *
     * @param documentRef A reference to the document to be set.
     * @param data An object of the fields and values for the document.
     * @param options An object to configure the set behavior.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    set(
      documentRef: DocumentReference,
      data: DocumentData,
      options?: SetOptions
    ): Transaction;

    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * @param documentRef A reference to the document to be updated.
     * @param data An object containing the fields and values with which to
     * update the document. Fields can contain dots to reference nested fields
     * within the document.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    update(documentRef: DocumentReference, data: UpdateData): Transaction;

    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * Nested fields can be updated by providing dot-separated field path
     * strings or by providing FieldPath objects.
     *
     * @param documentRef A reference to the document to be updated.
     * @param field The first field to update.
     * @param value The first value.
     * @param moreFieldsAndValues Additional key/value pairs.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(
      documentRef: DocumentReference,
      field: string | FieldPath,
      value: any,
      ...moreFieldsAndValues: any[]
    ): Transaction;

    /**
     * Deletes the document referred to by the provided `DocumentReference`.
     *
     * @param documentRef A reference to the document to be deleted.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    delete(documentRef: DocumentReference): Transaction;
  }

  /**
   * A write batch, used to perform multiple writes as a single atomic unit.
   *
   * A `WriteBatch` object can be acquired by calling `Firestore.batch()`. It
   * provides methods for adding writes to the write batch. None of the
   * writes will be committed (or visible locally) until `WriteBatch.commit()`
   * is called.
   *
   * Unlike transactions, write batches are persisted offline and therefore are
   * preferable when you don't need to condition your writes on read data.
   */
  export class WriteBatch {
    private constructor();

    /**
     * Writes to the document referred to by the provided `DocumentReference`.
     * If the document does not exist yet, it will be created. If you pass
     * `SetOptions`, the provided data can be merged into the existing document.
     *
     * @param documentRef A reference to the document to be set.
     * @param data An object of the fields and values for the document.
     * @param options An object to configure the set behavior.
     * @return This `WriteBatch` instance. Used for chaining method calls.
     */
    set(
      documentRef: DocumentReference,
      data: DocumentData,
      options?: SetOptions
    ): WriteBatch;

    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * @param documentRef A reference to the document to be updated.
     * @param data An object containing the fields and values with which to
     * update the document. Fields can contain dots to reference nested fields
     * within the document.
     * @return This `WriteBatch` instance. Used for chaining method calls.
     */
    update(documentRef: DocumentReference, data: UpdateData): WriteBatch;

    /**
     * Updates fields in the document referred to by this `DocumentReference`.
     * The update will fail if applied to a document that does not exist.
     *
     * Nested fields can be update by providing dot-separated field path strings
     * or by providing FieldPath objects.
     *
     * @param documentRef A reference to the document to be updated.
     * @param field The first field to update.
     * @param value The first value.
     * @param moreFieldsAndValues Additional key value pairs.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(
      documentRef: DocumentReference,
      field: string | FieldPath,
      value: any,
      ...moreFieldsAndValues: any[]
    ): WriteBatch;

    /**
     * Deletes the document referred to by the provided `DocumentReference`.
     *
     * @param documentRef A reference to the document to be deleted.
     * @return This `WriteBatch` instance. Used for chaining method calls.
     */
    delete(documentRef: DocumentReference): WriteBatch;

    /**
     * Commits all of the writes in this write batch as a single atomic unit.
     *
     * @return A Promise resolved once all of the writes in the batch have been
     * successfully written to the backend as an atomic unit. Note that it won't
     * resolve while you're offline.
     */
    commit(): Promise<void>;
  }

  /**
   * An options object that can be passed to `DocumentReference.onSnapshot()`,
   * `Query.onSnapshot()` and `QuerySnapshot.docChanges()` to control which
   * types of changes to include in the result set.
   */
  export interface SnapshotListenOptions {
    /**
     * Include a change even if only the metadata of the query or of a document
     * changed. Default is false.
     */
    readonly includeMetadataChanges?: boolean;
  }

  /**
   * An options object that configures the behavior of `set()` calls in
   * `DocumentReference`, `WriteBatch` and `Transaction`. These calls can be
   * configured to perform granular merges instead of overwriting the target
   * documents in their entirety.
   */
  export interface SetOptions {
    /**
     * Changes the behavior of a set() call to only replace the values specified
     * in its data argument. Fields omitted from the set() call remain
     * untouched.
     */
    readonly merge?: boolean;

    /**
     * Changes the behavior of set() calls to only replace the specified field
     * paths. Any field path that is not specified is ignored and remains
     * untouched.
     */
    readonly mergeFields?: (string | FieldPath)[];
  }

  /**
   * An options object that configures the behavior of `get()` calls on
   * `DocumentReference` and `Query`. By providing a `GetOptions` object, these
   * methods can be configured to fetch results only from the server, only from
   * the local cache or attempt to fetch results from the server and fall back to
   * the cache (which is the default).
   */
  export interface GetOptions {
    /**
     * Describes whether we should get from server or cache.
     *
     * Setting to 'default' (or not setting at all), causes Firestore to try to
     * retrieve an up-to-date (server-retrieved) snapshot, but fall back to
     * returning cached data if the server can't be reached.
     *
     * Setting to 'server' causes Firestore to avoid the cache, generating an
     * error if the server cannot be reached. Note that the cache will still be
     * updated if the server request succeeds. Also note that latency-compensation
     * still takes effect, so any pending write operations will be visible in the
     * returned data (merged into the server-provided data).
     *
     * Setting to 'cache' causes Firestore to immediately return a value from the
     * cache, ignoring the server completely (implying that the returned value
     * may be stale with respect to the value on the server.) If there is no data
     * in the cache to satisfy the `get()` call, `DocumentReference.get()` will
     * return an error and `QuerySnapshot.get()` will return an empty
     * `QuerySnapshot` with no documents.
     */
    readonly source?: 'default' | 'server' | 'cache';
  }

  /**
   * A `DocumentReference` refers to a document location in a Firestore database
   * and can be used to write, read, or listen to the location. The document at
   * the referenced location may or may not exist. A `DocumentReference` can
   * also be used to create a `CollectionReference` to a subcollection.
   */
  export class DocumentReference {
    private constructor();

    /** The identifier of the document within its collection. */
    readonly id: string;

    /**
     * The `Firestore` for the Firestore database (useful for performing
     * transactions, etc.).
     */
    readonly firestore: Firestore;

    /**
     * A reference to the Collection to which this DocumentReference belongs.
     */
    readonly parent: CollectionReference;

    /**
     * A string representing the path of the referenced document (relative
     * to the root of the database).
     */
    readonly path: string;

    /**
     * Gets a `CollectionReference` instance that refers to the collection at
     * the specified path.
     *
     * @param collectionPath A slash-separated path to a collection.
     * @return The `CollectionReference` instance.
     */
    collection(collectionPath: string): CollectionReference;

    /**
     * Returns true if this `DocumentReference` is equal to the provided one.
     *
     * @param other The `DocumentReference` to compare against.
     * @return true if this `DocumentReference` is equal to the provided one.
     */
    isEqual(other: DocumentReference): boolean;

    /**
     * Writes to the document referred to by this `DocumentReference`. If the
     * document does not yet exist, it will be created. If you pass
     * `SetOptions`, the provided data can be merged into an existing document.
     *
     * @param data A map of the fields and values for the document.
     * @param options An object to configure the set behavior.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    set(data: DocumentData, options?: SetOptions): Promise<void>;

    /**
     * Updates fields in the document referred to by this `DocumentReference`.
     * The update will fail if applied to a document that does not exist.
     *
     * @param data An object containing the fields and values with which to
     * update the document. Fields can contain dots to reference nested fields
     * within the document.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(data: UpdateData): Promise<void>;

    /**
     * Updates fields in the document referred to by this `DocumentReference`.
     * The update will fail if applied to a document that does not exist.
     *
     * Nested fields can be updated by providing dot-separated field path
     * strings or by providing FieldPath objects.
     *
     * @param field The first field to update.
     * @param value The first value.
     * @param moreFieldsAndValues Additional key value pairs.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(
      field: string | FieldPath,
      value: any,
      ...moreFieldsAndValues: any[]
    ): Promise<void>;

    /**
     * Deletes the document referred to by this `DocumentReference`.
     *
     * @return A Promise resolved once the document has been successfully
     * deleted from the backend (Note that it won't resolve while you're
     * offline).
     */
    delete(): Promise<void>;

    /**
     * Reads the document referred to by this `DocumentReference`.
     *
     * Note: By default, get() attempts to provide up-to-date data when possible
     * by waiting for data from the server, but it may return cached data or fail
     * if you are offline and the server cannot be reached. This behavior can be
     * altered via the `GetOptions` parameter.
     *
     * @param options An object to configure the get behavior.
     * @return A Promise resolved with a DocumentSnapshot containing the
     * current document contents.
     */
    get(options?: GetOptions): Promise<DocumentSnapshot>;

    /**
     * Attaches a listener for DocumentSnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param options Options controlling the listen behavior.
     * @param onNext A callback to be called every time a new `DocumentSnapshot`
     * is available.
     * @param onError A callback to be called if the listen fails or is
     * cancelled. No further callbacks will occur.
     * @param observer A single object containing `next` and `error` callbacks.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(observer: {
      next?: (snapshot: DocumentSnapshot) => void;
      error?: (error: FirestoreError) => void;
      complete?: () => void;
    }): () => void;
    onSnapshot(
      options: SnapshotListenOptions,
      observer: {
        next?: (snapshot: DocumentSnapshot) => void;
        error?: (error: Error) => void;
        complete?: () => void;
      }
    ): () => void;
    onSnapshot(
      onNext: (snapshot: DocumentSnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
    onSnapshot(
      options: SnapshotListenOptions,
      onNext: (snapshot: DocumentSnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
  }

  /**
   * Options that configure how data is retrieved from a `DocumentSnapshot`
   * (e.g. the desired behavior for server timestamps that have not yet been set
   * to their final value).
   */
  export interface SnapshotOptions {
    /**
     * If set, controls the return value for server timestamps that have not yet
     * been set to their final value.
     *
     * By specifying 'estimate', pending server timestamps return an estimate
     * based on the local clock. This estimate will differ from the final value
     * and cause these values to change once the server result becomes available.
     *
     * By specifying 'previous', pending timestamps will be ignored and return
     * their previous value instead.
     *
     * If omitted or set to 'none', `null` will be returned by default until the
     * server value becomes available.
     */
    readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
  }

  /** Metadata about a snapshot, describing the state of the snapshot. */
  export interface SnapshotMetadata {
    /**
     * True if the snapshot contains the result of local writes (e.g. set() or
     * update() calls) that have not yet been committed to the backend.
     * If your listener has opted into metadata updates (via
     * `DocumentListenOptions` or `QueryListenOptions`) you will receive another
     * snapshot with `hasPendingWrites` equal to false once the writes have been
     * committed to the backend.
     */
    readonly hasPendingWrites: boolean;

    /**
     * True if the snapshot was created from cached data rather than
     * guaranteed up-to-date server data. If your listener has opted into
     * metadata updates (via `DocumentListenOptions` or `QueryListenOptions`)
     * you will receive another snapshot with `fromCache` equal to false once
     * the client has received up-to-date data from the backend.
     */
    readonly fromCache: boolean;

    /**
     * Returns true if this `SnapshotMetadata` is equal to the provided one.
     *
     * @param other The `SnapshotMetadata` to compare against.
     * @return true if this `SnapshotMetadata` is equal to the provided one.
     */
    isEqual(other: SnapshotMetadata): boolean;
  }

  /**
   * A `DocumentSnapshot` contains data read from a document in your Firestore
   * database. The data can be extracted with `.data()` or `.get(<field>)` to
   * get a specific field.
   *
   * For a `DocumentSnapshot` that points to a non-existing document, any data
   * access will return 'undefined'. You can use the `exists` property to
   * explicitly verify a document's existence.
   */
  export class DocumentSnapshot {
    protected constructor();

    /** True if the document exists. */
    readonly exists: boolean;
    /** A `DocumentReference` to the document location. */
    readonly ref: DocumentReference;
    /**
     * The ID of the document for which this `DocumentSnapshot` contains data.
     */
    readonly id: string;
    /**
     * Metadata about this snapshot, concerning its source and if it has local
     * modifications.
     */
    readonly metadata: SnapshotMetadata;

    /**
     * Retrieves all fields in the document as an Object. Returns 'undefined' if
     * the document doesn't exist.
     *
     * By default, `FieldValue.serverTimestamp()` values that have not yet been
     * set to their final value will be returned as `null`. You can override
     * this by passing an options object.
     *
     * @param options An options object to configure how data is retrieved from
     * the snapshot (e.g. the desired behavior for server timestamps that have
     * not yet been set to their final value).
     * @return An Object containing all fields in the document or 'undefined' if
     * the document doesn't exist.
     */
    data(options?: SnapshotOptions): DocumentData | undefined;

    /**
     * Retrieves the field specified by `fieldPath`. Returns 'undefined' if the
     * document or field doesn't exist.
     *
     * By default, a `FieldValue.serverTimestamp()` that has not yet been set to
     * its final value will be returned as `null`. You can override this by
     * passing an options object.
     *
     * @param fieldPath The path (e.g. 'foo' or 'foo.bar') to a specific field.
     * @param options An options object to configure how the field is retrieved
     * from the snapshot (e.g. the desired behavior for server timestamps that have
     * not yet been set to their final value).
     * @return The data at the specified field location or undefined if no such
     * field exists in the document.
     */
    get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;

    /**
     * Returns true if this `DocumentSnapshot` is equal to the provided one.
     *
     * @param other The `DocumentSnapshot` to compare against.
     * @return true if this `DocumentSnapshot` is equal to the provided one.
     */
    isEqual(other: DocumentSnapshot): boolean;
  }

  /**
   * A `QueryDocumentSnapshot` contains data read from a document in your
   * Firestore database as part of a query. The document is guaranteed to exist
   * and its data can be extracted with `.data()` or `.get(<field>)` to get a
   * specific field.
   *
   * A `QueryDocumentSnapshot` offers the same API surface as a
   * `DocumentSnapshot`. Since query results contain only existing documents, the
   * `exists` property will always be true and `data()` will never return
   * 'undefined'.
   */
  export class QueryDocumentSnapshot extends DocumentSnapshot {
    private constructor();

    /**
     * Retrieves all fields in the document as an Object.
     *
     * By default, `FieldValue.serverTimestamp()` values that have not yet been
     * set to their final value will be returned as `null`. You can override
     * this by passing an options object.
     *
     * @override
     * @param options An options object to configure how data is retrieved from
     * the snapshot (e.g. the desired behavior for server timestamps that have
     * not yet been set to their final value).
     * @return An Object containing all fields in the document.
     */
    data(options?: SnapshotOptions): DocumentData;
  }

  /**
   * The direction of a `Query.orderBy()` clause is specified as 'desc' or 'asc'
   * (descending or ascending).
   */
  export type OrderByDirection = 'desc' | 'asc';

  /**
   * Filter conditions in a `Query.where()` clause are specified using the
   * strings '<', '<=', '==', '>=', '>', and 'array-contains'.
   */
  export type WhereFilterOp = '<' | '<=' | '==' | '>=' | '>' | 'array-contains';

  /**
   * A `Query` refers to a Query which you can read or listen to. You can also
   * construct refined `Query` objects by adding filters and ordering.
   */
  export class Query {
    protected constructor();

    /**
     * The `Firestore` for the Firestore database (useful for performing
     * transactions, etc.).
     */
    readonly firestore: Firestore;

    /**
     * Creates and returns a new Query with the additional filter that documents
     * must contain the specified field and the value should satisfy the
     * relation constraint provided.
     *
     * @param fieldPath The path to compare
     * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
     * @param value The value for comparison
     * @return The created Query.
     */
    where(
      fieldPath: string | FieldPath,
      opStr: WhereFilterOp,
      value: any
    ): Query;

    /**
     * Creates and returns a new Query that's additionally sorted by the
     * specified field, optionally in descending order instead of ascending.
     *
     * @param fieldPath The field to sort by.
     * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
     * not specified, order will be ascending.
     * @return The created Query.
     */
    orderBy(
      fieldPath: string | FieldPath,
      directionStr?: OrderByDirection
    ): Query;

    /**
     * Creates and returns a new Query that's additionally limited to only
     * return up to the specified number of documents.
     *
     * @param limit The maximum number of items to return.
     * @return The created Query.
     */
    limit(limit: number): Query;

    /**
     * Creates and returns a new Query that starts at the provided document
     * (inclusive). The starting position is relative to the order of the query.
     * The document must contain all of the fields provided in the orderBy of
     * this query.
     *
     * @param snapshot The snapshot of the document to start at.
     * @return The created Query.
     */
    startAt(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that starts at the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to start this query at, in order
     * of the query's order by.
     * @return The created Query.
     */
    startAt(...fieldValues: any[]): Query;

    /**
     * Creates and returns a new Query that starts after the provided document
     * (exclusive). The starting position is relative to the order of the query.
     * The document must contain all of the fields provided in the orderBy of
     * this query.
     *
     * @param snapshot The snapshot of the document to start after.
     * @return The created Query.
     */
    startAfter(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that starts after the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to start this query after, in order
     * of the query's order by.
     * @return The created Query.
     */
    startAfter(...fieldValues: any[]): Query;

    /**
     * Creates and returns a new Query that ends before the provided document
     * (exclusive). The end position is relative to the order of the query. The
     * document must contain all of the fields provided in the orderBy of this
     * query.
     *
     * @param snapshot The snapshot of the document to end before.
     * @return The created Query.
     */
    endBefore(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that ends before the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to end this query before, in order
     * of the query's order by.
     * @return The created Query.
     */
    endBefore(...fieldValues: any[]): Query;

    /**
     * Creates and returns a new Query that ends at the provided document
     * (inclusive). The end position is relative to the order of the query. The
     * document must contain all of the fields provided in the orderBy of this
     * query.
     *
     * @param snapshot The snapshot of the document to end at.
     * @return The created Query.
     */
    endAt(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that ends at the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to end this query at, in order
     * of the query's order by.
     * @return The created Query.
     */
    endAt(...fieldValues: any[]): Query;

    /**
     * Returns true if this `Query` is equal to the provided one.
     *
     * @param other The `Query` to compare against.
     * @return true if this `Query` is equal to the provided one.
     */
    isEqual(other: Query): boolean;

    /**
     * Executes the query and returns the results as a QuerySnapshot.
     *
     * Note: By default, get() attempts to provide up-to-date data when possible
     * by waiting for data from the server, but it may return cached data or fail
     * if you are offline and the server cannot be reached. This behavior can be
     * altered via the `GetOptions` parameter.
     *
     * @param options An object to configure the get behavior.
     * @return A Promise that will be resolved with the results of the Query.
     */
    get(options?: GetOptions): Promise<QuerySnapshot>;

    /**
     * Attaches a listener for QuerySnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param options Options controlling the listen behavior.
     * @param onNext A callback to be called every time a new `QuerySnapshot`
     * is available.
     * @param onError A callback to be called if the listen fails or is
     * cancelled. No further callbacks will occur.
     * @param observer A single object containing `next` and `error` callbacks.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(observer: {
      next?: (snapshot: QuerySnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }): () => void;
    onSnapshot(
      options: SnapshotListenOptions,
      observer: {
        next?: (snapshot: QuerySnapshot) => void;
        error?: (error: Error) => void;
        complete?: () => void;
      }
    ): () => void;
    onSnapshot(
      onNext: (snapshot: QuerySnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
    onSnapshot(
      options: SnapshotListenOptions,
      onNext: (snapshot: QuerySnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
  }

  /**
   * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
   * representing the results of a query. The documents can be accessed as an
   * array via the `docs` property or enumerated using the `forEach` method. The
   * number of documents can be determined via the `empty` and `size`
   * properties.
   */
  export class QuerySnapshot {
    private constructor();

    /**
     * The query on which you called `get` or `onSnapshot` in order to get this
     * `QuerySnapshot`.
     */
    readonly query: Query;
    /**
     * Metadata about this snapshot, concerning its source and if it has local
     * modifications.
     */
    readonly metadata: SnapshotMetadata;

    /** An array of all the documents in the QuerySnapshot. */
    readonly docs: QueryDocumentSnapshot[];

    /** The number of documents in the QuerySnapshot. */
    readonly size: number;

    /** True if there are no documents in the QuerySnapshot. */
    readonly empty: boolean;

    /**
     * Returns an array of the documents changes since the last snapshot. If this
     * is the first snapshot, all documents will be in the list as added changes.
     *
     * @param options `SnapshotListenOptions` that control whether metadata-only
     * changes (i.e. only `DocumentSnapshot.metadata` changed) should trigger
     * snapshot events.
     */
    docChanges(options?: SnapshotListenOptions): DocumentChange[];

    /**
     * Enumerates all of the documents in the QuerySnapshot.
     *
     * @param callback A callback to be called with a `QueryDocumentSnapshot` for
     * each document in the snapshot.
     * @param thisArg The `this` binding for the callback.
     */
    forEach(
      callback: (result: QueryDocumentSnapshot) => void,
      thisArg?: any
    ): void;

    /**
     * Returns true if this `QuerySnapshot` is equal to the provided one.
     *
     * @param other The `QuerySnapshot` to compare against.
     * @return true if this `QuerySnapshot` is equal to the provided one.
     */
    isEqual(other: QuerySnapshot): boolean;
  }

  /**
   * The type of of a `DocumentChange` may be 'added', 'removed', or 'modified'.
   */
  export type DocumentChangeType = 'added' | 'removed' | 'modified';

  /**
   * A `DocumentChange` represents a change to the documents matching a query.
   * It contains the document affected and the type of change that occurred.
   */
  export interface DocumentChange {
    /** The type of change ('added', 'modified', or 'removed'). */
    readonly type: DocumentChangeType;

    /** The document affected by this change. */
    readonly doc: QueryDocumentSnapshot;

    /**
     * The index of the changed document in the result set immediately prior to
     * this DocumentChange (i.e. supposing that all prior DocumentChange objects
     * have been applied). Is -1 for 'added' events.
     */
    readonly oldIndex: number;

    /**
     * The index of the changed document in the result set immediately after
     * this DocumentChange (i.e. supposing that all prior DocumentChange
     * objects and the current DocumentChange object have been applied).
     * Is -1 for 'removed' events.
     */
    readonly newIndex: number;
  }

  /**
   * A `CollectionReference` object can be used for adding documents, getting
   * document references, and querying for documents (using the methods
   * inherited from `Query`).
   */
  export class CollectionReference extends Query {
    private constructor();

    /** The identifier of the collection. */
    readonly id: string;

    /**
     * A reference to the containing Document if this is a subcollection, else
     * null.
     */
    readonly parent: DocumentReference | null;

    /**
     * A string representing the path of the referenced collection (relative
     * to the root of the database).
     */
    readonly path: string;

    /**
     * Get a `DocumentReference` for the document within the collection at the
     * specified path. If no path is specified, an automatically-generated
     * unique ID will be used for the returned DocumentReference.
     *
     * @param documentPath A slash-separated path to a document.
     * @return The `DocumentReference` instance.
     */
    doc(documentPath?: string): DocumentReference;

    /**
     * Add a new document to this collection with the specified data, assigning
     * it a document ID automatically.
     *
     * @param data An Object containing the data for the new document.
     * @return A Promise resolved with a `DocumentReference` pointing to the
     * newly created document after it has been written to the backend.
     */
    add(data: DocumentData): Promise<DocumentReference>;

    /**
     * Returns true if this `CollectionReference` is equal to the provided one.
     *
     * @param other The `CollectionReference` to compare against.
     * @return true if this `CollectionReference` is equal to the provided one.
     */
    isEqual(other: CollectionReference): boolean;
  }

  /**
   * Sentinel values that can be used when writing document fields with set()
   * or update().
   */
  export class FieldValue {
    private constructor();

    /**
     * Returns a sentinel used with set() or update() to include a
     * server-generated timestamp in the written data.
     */
    static serverTimestamp(): FieldValue;

    /**
     * Returns a sentinel for use with update() to mark a field for deletion.
     */
    static delete(): FieldValue;

    /**
     * Returns a special value that can be used with set() or update() that tells
     * the server to union the given elements with any array value that already
     * exists on the server. Each specified element that doesn't already exist in
     * the array will be added to the end. If the field being modified is not
     * already an array it will be overwritten with an array containing exactly
     * the specified elements.
     *
     * @param elements The elements to union into the array.
     * @return The FieldValue sentinel for use in a call to set() or update().
     */
    static arrayUnion(...elements: any[]): FieldValue;

    /**
     * Returns a special value that can be used with set() or update() that tells
     * the server to remove the given elements from any array value that already
     * exists on the server. All instances of each element specified will be
     * removed from the array. If the field being modified is not already an
     * array it will be overwritten with an empty array.
     *
     * @param elements The elements to remove from the array.
     * @return The FieldValue sentinel for use in a call to set() or update().
     */
    static arrayRemove(...elements: any[]): FieldValue;

    /**
     * Returns true if this `FieldValue` is equal to the provided one.
     *
     * @param other The `FieldValue` to compare against.
     * @return true if this `FieldValue` is equal to the provided one.
     */
    isEqual(other: FieldValue): boolean;
  }

  /**
   * A FieldPath refers to a field in a document. The path may consist of a
   * single field name (referring to a top-level field in the document), or a
   * list of field names (referring to a nested field in the document).
   */
  export class FieldPath {
    /**
     * Creates a FieldPath from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames A list of field names.
     */
    constructor(...fieldNames: string[]);

    /**
     * Returns a special sentinel FieldPath to refer to the ID of a document.
     * It can be used in queries to sort or filter by the document ID.
     */
    static documentId(): FieldPath;

    /**
     * Returns true if this `FieldPath` is equal to the provided one.
     *
     * @param other The `FieldPath` to compare against.
     * @return true if this `FieldPath` is equal to the provided one.
     */
    isEqual(other: FieldPath): boolean;
  }

  /**
   * The set of Firestore status codes. The codes are the same at the ones
   * exposed by gRPC here:
   * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
   *
   * Possible values:
   * - 'cancelled': The operation was cancelled (typically by the caller).
   * - 'unknown': Unknown error or an error from a different error domain.
   * - 'invalid-argument': Client specified an invalid argument. Note that this
   *   differs from 'failed-precondition'. 'invalid-argument' indicates
   *   arguments that are problematic regardless of the state of the system
   *   (e.g. an invalid field name).
   * - 'deadline-exceeded': Deadline expired before operation could complete.
   *   For operations that change the state of the system, this error may be
   *   returned even if the operation has completed successfully. For example,
   *   a successful response from a server could have been delayed long enough
   *   for the deadline to expire.
   * - 'not-found': Some requested document was not found.
   * - 'already-exists': Some document that we attempted to create already
   *   exists.
   * - 'permission-denied': The caller does not have permission to execute the
   *   specified operation.
   * - 'resource-exhausted': Some resource has been exhausted, perhaps a
   *   per-user quota, or perhaps the entire file system is out of space.
   * - 'failed-precondition': Operation was rejected because the system is not
   *   in a state required for the operation's execution.
   * - 'aborted': The operation was aborted, typically due to a concurrency
   *   issue like transaction aborts, etc.
   * - 'out-of-range': Operation was attempted past the valid range.
   * - 'unimplemented': Operation is not implemented or not supported/enabled.
   * - 'internal': Internal errors. Means some invariants expected by
   *   underlying system has been broken. If you see one of these errors,
   *   something is very broken.
   * - 'unavailable': The service is currently unavailable. This is most likely
   *   a transient condition and may be corrected by retrying with a backoff.
   * - 'data-loss': Unrecoverable data loss or corruption.
   * - 'unauthenticated': The request does not have valid authentication
   *   credentials for the operation.
   */
  export type FirestoreErrorCode =
    | 'cancelled'
    | 'unknown'
    | 'invalid-argument'
    | 'deadline-exceeded'
    | 'not-found'
    | 'already-exists'
    | 'permission-denied'
    | 'resource-exhausted'
    | 'failed-precondition'
    | 'aborted'
    | 'out-of-range'
    | 'unimplemented'
    | 'internal'
    | 'unavailable'
    | 'data-loss'
    | 'unauthenticated';

  /** An error returned by a Firestore operation. */
  // TODO(b/63008957): FirestoreError should extend firebase.FirebaseError
  export interface FirestoreError {
    code: FirestoreErrorCode;
    message: string;
    name: string;
    stack?: string;
  }
}

export = firebase;
export as namespace firebase;
