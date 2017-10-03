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
  type CompleteFn = ( ) => void ;

  interface FirebaseError {
    code : string ;
    message : string ;
    name : string ;
    stack ? : string ;
  }

  interface Observer < V , E > {
    complete ( ) : any ;
    error (error : E ) : any ;
    next (value : V | null ) : any ;
  }

  var SDK_VERSION : string ;

  type Unsubscribe = ( ) => void ;

  interface User extends firebase.UserInfo {
    delete ( ) : Promise < any > ;
    emailVerified : boolean ;
    getIdToken (forceRefresh ? : boolean ) : Promise < any > ;
    getToken (forceRefresh ? : boolean ) : Promise < any > ;
    isAnonymous : boolean ;
    linkAndRetrieveDataWithCredential (credential : firebase.auth.AuthCredential ) : Promise < any > ;
    linkWithCredential (credential : firebase.auth.AuthCredential ) : Promise < any > ;
    linkWithPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : Promise < any > ;
    linkWithPopup (provider : firebase.auth.AuthProvider ) : Promise < any > ;
    linkWithRedirect (provider : firebase.auth.AuthProvider ) : Promise < any > ;
    phoneNumber : string | null ;
    providerData : ( firebase.UserInfo | null ) [] ;
    reauthenticateAndRetrieveDataWithCredential (credential : firebase.auth.AuthCredential ) : Promise < any > ;
    reauthenticateWithCredential (credential : firebase.auth.AuthCredential ) : Promise < any > ;
    reauthenticateWithPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : Promise < any > ;
    reauthenticateWithPopup (provider : firebase.auth.AuthProvider ) : Promise < any > ;
    reauthenticateWithRedirect (provider : firebase.auth.AuthProvider ) : Promise < any > ;
    refreshToken : string ;
    reload ( ) : Promise < any > ;
    sendEmailVerification (actionCodeSettings ? : firebase.auth.ActionCodeSettings | null ) : Promise < any > ;
    toJSON ( ) : Object ;
    unlink (providerId : string ) : Promise < any > ;
    updateEmail (newEmail : string ) : Promise < any > ;
    updatePassword (newPassword : string ) : Promise < any > ;
    updatePhoneNumber (phoneCredential : firebase.auth.AuthCredential ) : Promise < any > ;
    updateProfile (profile : { displayName : string | null , photoURL : string | null } ) : Promise < any > ;
  }

  interface UserInfo {
    displayName : string | null ;
    email : string | null ;
    phoneNumber : string | null ;
    photoURL : string | null ;
    providerId : string ;
    uid : string ;
  }

  function app (name ? : string ) : firebase.app.App ;

  var apps : ( firebase.app.App | null ) [] ;

  function auth (app ? : firebase.app.App ) : firebase.auth.Auth ;

  function database (app ? : firebase.app.App ) : firebase.database.Database ;

  function initializeApp (options : Object , name ? : string ) : firebase.app.App ;

  function messaging (app ? : firebase.app.App ) : firebase.messaging.Messaging ;

  function storage (app ? : firebase.app.App ) : firebase.storage.Storage ;

  function firestore(app ?: firebase.app.App ): firebase.firestore.Firestore ;
}

declare namespace firebase.app {
  interface App {
    auth ( ) : firebase.auth.Auth ;
    database ( ) : firebase.database.Database ;
    delete ( ) : Promise < any > ;
    messaging ( ) : firebase.messaging.Messaging ;
    name : string ;
    options : Object ;
    storage (url ? : string ) : firebase.storage.Storage ;
  }
}

declare namespace firebase.auth {
  interface ActionCodeInfo {
  }

  type ActionCodeSettings = { android ? : { installApp ? : boolean , minimumVersion ? : string , packageName : string } , handleCodeInApp ? : boolean , iOS ? : { bundleId : string } , url : string } ;

  type AdditionalUserInfo = { profile : Object | null , providerId : string , username ? : string | null } ;

  interface ApplicationVerifier {
    type : string ;
    verify ( ) : Promise < any > ;
  }

  interface Auth {
    app : firebase.app.App ;
    applyActionCode (code : string ) : Promise < any > ;
    checkActionCode (code : string ) : Promise < any > ;
    confirmPasswordReset (code : string , newPassword : string ) : Promise < any > ;
    createUserWithEmailAndPassword (email : string , password : string ) : Promise < any > ;
    currentUser : firebase.User | null ;
    fetchProvidersForEmail (email : string ) : Promise < any > ;
    getRedirectResult ( ) : Promise < any > ;
    languageCode : string | null ;
    onAuthStateChanged (nextOrObserver : firebase.Observer < any , any > | ( (a : firebase.User | null ) => any ) , error ? : (a : firebase.auth.Error ) => any , completed ? : firebase.Unsubscribe ) : firebase.Unsubscribe ;
    onIdTokenChanged (nextOrObserver : firebase.Observer < any , any > | ( (a : firebase.User | null ) => any ) , error ? : (a : firebase.auth.Error ) => any , completed ? : firebase.Unsubscribe ) : firebase.Unsubscribe ;
    sendPasswordResetEmail (email : string , actionCodeSettings ? : firebase.auth.ActionCodeSettings | null ) : Promise < any > ;
    setPersistence (persistence : firebase.auth.Auth.Persistence ) : Promise < any > ;
    signInAndRetrieveDataWithCredential (credential : firebase.auth.AuthCredential ) : Promise < any > ;
    signInAnonymously ( ) : Promise < any > ;
    signInWithCredential (credential : firebase.auth.AuthCredential ) : Promise < any > ;
    signInWithCustomToken (token : string ) : Promise < any > ;
    signInWithEmailAndPassword (email : string , password : string ) : Promise < any > ;
    signInWithPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : Promise < any > ;
    signInWithPopup (provider : firebase.auth.AuthProvider ) : Promise < any > ;
    signInWithRedirect (provider : firebase.auth.AuthProvider ) : Promise < any > ;
    signOut ( ) : Promise < any > ;
    useDeviceLanguage ( ) : any ;
    verifyPasswordResetCode (code : string ) : Promise < any > ;
  }

  interface AuthCredential {
    providerId : string ;
  }

  interface AuthProvider {
    providerId : string ;
  }

  interface ConfirmationResult {
    confirm (verificationCode : string ) : Promise < any > ;
    verificationId : string ;
  }

  class EmailAuthProvider extends EmailAuthProvider_Instance {
    static PROVIDER_ID : string ;
    static credential (email : string , password : string ) : firebase.auth.AuthCredential ;
  }
  class EmailAuthProvider_Instance implements firebase.auth.AuthProvider {
    providerId : string ;
  }

  interface Error {
    code : string ;
    message : string ;
  }

  class FacebookAuthProvider extends FacebookAuthProvider_Instance {
    static PROVIDER_ID : string ;
    static credential (token : string ) : firebase.auth.AuthCredential ;
  }
  class FacebookAuthProvider_Instance implements firebase.auth.AuthProvider {
    addScope (scope : string ) : firebase.auth.AuthProvider ;
    providerId : string ;
    setCustomParameters (customOAuthParameters : Object ) : firebase.auth.AuthProvider ;
  }

  class GithubAuthProvider extends GithubAuthProvider_Instance {
    static PROVIDER_ID : string ;
    static credential (token : string ) : firebase.auth.AuthCredential ;
  }
  class GithubAuthProvider_Instance implements firebase.auth.AuthProvider {
    addScope (scope : string ) : firebase.auth.AuthProvider ;
    providerId : string ;
    setCustomParameters (customOAuthParameters : Object ) : firebase.auth.AuthProvider ;
  }

  class GoogleAuthProvider extends GoogleAuthProvider_Instance {
    static PROVIDER_ID : string ;
    static credential (idToken ? : string | null , accessToken ? : string | null ) : firebase.auth.AuthCredential ;
  }
  class GoogleAuthProvider_Instance implements firebase.auth.AuthProvider {
    addScope (scope : string ) : firebase.auth.AuthProvider ;
    providerId : string ;
    setCustomParameters (customOAuthParameters : Object ) : firebase.auth.AuthProvider ;
  }

  class PhoneAuthProvider extends PhoneAuthProvider_Instance {
    static PROVIDER_ID : string ;
    static credential (verificationId : string , verificationCode : string ) : firebase.auth.AuthCredential ;
  }
  class PhoneAuthProvider_Instance implements firebase.auth.AuthProvider {
    constructor (auth ? : firebase.auth.Auth | null ) ;
    providerId : string ;
    verifyPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : Promise < any > ;
  }

  class RecaptchaVerifier extends RecaptchaVerifier_Instance {
  }
  class RecaptchaVerifier_Instance implements firebase.auth.ApplicationVerifier {
    constructor (container : any | string , parameters ? : Object | null , app ? : firebase.app.App | null ) ;
    clear ( ) : any ;
    render ( ) : Promise < any > ;
    type : string ;
    verify ( ) : Promise < any > ;
  }

  class TwitterAuthProvider extends TwitterAuthProvider_Instance {
    static PROVIDER_ID : string ;
    static credential (token : string , secret : string ) : firebase.auth.AuthCredential ;
  }
  class TwitterAuthProvider_Instance implements firebase.auth.AuthProvider {
    providerId : string ;
    setCustomParameters (customOAuthParameters : Object ) : firebase.auth.AuthProvider ;
  }

  type UserCredential = { additionalUserInfo ? : firebase.auth.AdditionalUserInfo | null , credential : firebase.auth.AuthCredential | null , operationType ? : string | null , user : firebase.User | null } ;
}

declare namespace firebase.auth.Auth {
  type Persistence = string ;
  var Persistence : {
    LOCAL : Persistence ,
    NONE : Persistence ,
    SESSION : Persistence ,
  };
}

declare namespace firebase.database {
  interface DataSnapshot {
    child (path : string ) : firebase.database.DataSnapshot ;
    exists ( ) : boolean ;
    exportVal ( ) : any ;
    forEach (action : (a : firebase.database.DataSnapshot ) => boolean ) : boolean ;
    getPriority ( ) : string | number | null ;
    hasChild (path : string ) : boolean ;
    hasChildren ( ) : boolean ;
    key : string | null ;
    numChildren ( ) : number ;
    ref : firebase.database.Reference ;
    toJSON ( ) : Object | null ;
    val ( ) : any ;
  }

  interface Database {
    app : firebase.app.App ;
    goOffline ( ) : any ;
    goOnline ( ) : any ;
    ref (path ? : string ) : firebase.database.Reference ;
    refFromURL (url : string ) : firebase.database.Reference ;
  }

  interface OnDisconnect {
    cancel (onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    remove (onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    set (value : any , onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    setWithPriority (value : any , priority : number | string | null , onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    update (values : Object , onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
  }

  interface Query {
    endAt (value : number | string | boolean | null , key ? : string ) : firebase.database.Query ;
    equalTo (value : number | string | boolean | null , key ? : string ) : firebase.database.Query ;
    isEqual (other : firebase.database.Query | null ) : boolean ;
    limitToFirst (limit : number ) : firebase.database.Query ;
    limitToLast (limit : number ) : firebase.database.Query ;
    off (eventType ? : string , callback ? : (a : firebase.database.DataSnapshot , b ? : string | null ) => any , context ? : Object | null ) : any ;
    on (eventType : string , callback : (a : firebase.database.DataSnapshot | null , b ? : string ) => any , cancelCallbackOrContext ? : Object | null , context ? : Object | null ) : (a : firebase.database.DataSnapshot | null , b ? : string ) => any ;
    once (eventType : string , successCallback ? : (a : firebase.database.DataSnapshot , b ? : string ) => any , failureCallbackOrContext ? : Object | null , context ? : Object | null ) : Promise < any > ;
    orderByChild (path : string ) : firebase.database.Query ;
    orderByKey ( ) : firebase.database.Query ;
    orderByPriority ( ) : firebase.database.Query ;
    orderByValue ( ) : firebase.database.Query ;
    ref : firebase.database.Reference ;
    startAt (value : number | string | boolean | null , key ? : string ) : firebase.database.Query ;
    toJSON ( ) : Object ;
    toString ( ) : string ;
  }

  interface Reference extends firebase.database.Query {
    child (path : string ) : firebase.database.Reference ;
    key : string | null ;
    onDisconnect ( ) : firebase.database.OnDisconnect ;
    parent : firebase.database.Reference | null ;
    path : string ;
    push (value ? : any , onComplete ? : (a : Error | null ) => any ) : firebase.database.ThenableReference ;
    remove (onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    root : firebase.database.Reference ;
    set (value : any , onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    setPriority (priority : string | number | null , onComplete : (a : Error | null ) => any ) : Promise < any > ;
    setWithPriority (newVal : any , newPriority : string | number | null , onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
    transaction (transactionUpdate : (a : any ) => any , onComplete ? : (a : Error | null , b : boolean , c : firebase.database.DataSnapshot | null ) => any , applyLocally ? : boolean ) : Promise < any > ;
    update (values : Object , onComplete ? : (a : Error | null ) => any ) : Promise < any > ;
  }

  interface ThenableReference extends firebase.database.Reference , PromiseLike < any > {
  }

  function enableLogging (logger ? : boolean | ( (a : string ) => any ) , persistent ? : boolean ) : any ;
}

declare namespace firebase.database.ServerValue {
  var TIMESTAMP : Object ;
}

declare namespace firebase.messaging {
  interface Messaging {
    deleteToken (token : string ) : Promise < any > | null ;
    getToken ( ) : Promise < any > | null ;
    onMessage (nextOrObserver : firebase.Observer < any , any > | ( (a : Object ) => any ) ) : firebase.Unsubscribe ;
    onTokenRefresh (nextOrObserver : firebase.Observer < any , any > | ( (a : Object ) => any ) ) : firebase.Unsubscribe ;
    requestPermission ( ) : Promise < any > | null ;
    setBackgroundMessageHandler (callback : (a : Object ) => any ) : any ;
    useServiceWorker (registration : any ) : any ;
  }
}

declare namespace firebase.storage {
  interface FullMetadata extends firebase.storage.UploadMetadata {
    bucket : string ;
    downloadURLs : string [] ;
    fullPath : string ;
    generation : string ;
    metageneration : string ;
    name : string ;
    size : number ;
    timeCreated : string ;
    updated : string ;
  }

  interface Reference {
    bucket : string ;
    child (path : string ) : firebase.storage.Reference ;
    delete ( ) : Promise < any > ;
    fullPath : string ;
    getDownloadURL ( ) : Promise < any > ;
    getMetadata ( ) : Promise < any > ;
    name : string ;
    parent : firebase.storage.Reference | null ;
    put (data : any | any | any , metadata ? : firebase.storage.UploadMetadata ) : firebase.storage.UploadTask ;
    putString (data : string , format ? : firebase.storage.StringFormat , metadata ? : firebase.storage.UploadMetadata ) : firebase.storage.UploadTask ;
    root : firebase.storage.Reference ;
    storage : firebase.storage.Storage ;
    toString ( ) : string ;
    updateMetadata (metadata : firebase.storage.SettableMetadata ) : Promise < any > ;
  }

  interface SettableMetadata {
    cacheControl ? : string | null ;
    contentDisposition ? : string | null ;
    contentEncoding ? : string | null ;
    contentLanguage ? : string | null ;
    contentType ? : string | null ;
    customMetadata ? : { [ /* warning: coerced from ? */ key: string ]: string } | null ;
  }

  interface Storage {
    app : firebase.app.App ;
    maxOperationRetryTime : number ;
    maxUploadRetryTime : number ;
    ref (path ? : string ) : firebase.storage.Reference ;
    refFromURL (url : string ) : firebase.storage.Reference ;
    setMaxOperationRetryTime (time : number ) : any ;
    setMaxUploadRetryTime (time : number ) : any ;
  }

  type StringFormat = string ;
  var StringFormat : {
    BASE64 : StringFormat ,
    BASE64URL : StringFormat ,
    DATA_URL : StringFormat ,
    RAW : StringFormat ,
  };

  type TaskEvent = string ;
  var TaskEvent : {
    STATE_CHANGED : TaskEvent ,
  };

  type TaskState = string ;
  var TaskState : {
    CANCELED : TaskState ,
    ERROR : TaskState ,
    PAUSED : TaskState ,
    RUNNING : TaskState ,
    SUCCESS : TaskState ,
  };

  interface UploadMetadata extends firebase.storage.SettableMetadata {
    md5Hash ? : string | null ;
  }

  interface UploadTask {
    cancel ( ) : boolean ;
    catch (onRejected : (a : Error ) => any ) : Promise < any > ;
    on (event : firebase.storage.TaskEvent , nextOrObserver ? : firebase.Observer < any , any > | null | ( (a : Object ) => any ) , error ? : ( (a : Error ) => any ) | null , complete ? : ( firebase.Unsubscribe ) | null ) : Function ;
    pause ( ) : boolean ;
    resume ( ) : boolean ;
    snapshot : firebase.storage.UploadTaskSnapshot ;
    then (onFulfilled ? : ( (a : firebase.storage.UploadTaskSnapshot ) => any ) | null , onRejected ? : ( (a : Error ) => any ) | null ) : Promise < any > ;
  }

  interface UploadTaskSnapshot {
    bytesTransferred : number ;
    downloadURL : string | null ;
    metadata : firebase.storage.FullMetadata ;
    ref : firebase.storage.Reference ;
    state : firebase.storage.TaskState ;
    task : firebase.storage.UploadTask ;
    totalBytes : number ;
  }
}

declare namespace firebase.firestore {
  /**
   * Document data (for use with `DocumentReference.set()`) consists of fields
   * mapped to values.
   */
  export type DocumentData = {[field: string]: any};

  /**
   * Update data (for use with `DocumentReference.update()`) consists of field
   * paths (e.g. 'foo' or 'foo.baz') mapped to values. Fields that contain dots
   * reference nested fields within the document.
   */
  export type UpdateData = {[fieldPath: string]: any};

  /** Settings used to configure a `Firestore` instance. */
  export interface Settings {
    /** The hostname to connect to. */
    host?: string;
    /** Whether to use SSL when connecting. */
    ssl?: boolean;
  }

  export type LogLevel = 'debug' | 'error' | 'silent';

  function setLogLevel(logLevel: LogLevel): void;

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
     * @return A promise that represents successfully enabling persistent
     * storage.
     */
    enablePersistence(): Promise<void>;

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
    runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>):
        Promise<T>;

    /**
     * Creates a write batch, used for performing multiple writes as a single
     * atomic operation.
     */
    batch(): WriteBatch;

    /**
     * The `firebase.app.App` associated with this `Firestore` instance.
     */
    app: firebase.app.App;

    INTERNAL: {delete: () => Promise<void>};
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
    set(documentRef: DocumentReference, data: DocumentData,
        options?: SetOptions): Transaction;

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
        documentRef: DocumentReference, field: string|FieldPath, value: any,
        ...moreFieldsAndValues: any[]): Transaction;

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
    set(documentRef: DocumentReference, data: DocumentData,
        options?: SetOptions): WriteBatch;

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
        documentRef: DocumentReference, field: string|FieldPath, value: any,
        ...moreFieldsAndValues: any[]): WriteBatch;

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
   * Options for use with `DocumentReference.onSnapshot()` to control the
   * behavior of the snapshot listener.
   */
  export interface DocumentListenOptions {
    /**
     * Raise an event even if only metadata of the document changed. Default is
     * false.
     */
    readonly includeMetadataChanges?: boolean;
  }

  /**
   * An options object that configures the behavior of `set()` calls in
   * `DocumentReference`, `WriteBatch` and `Transaction`. These calls can be
   * configured to perform granular merges instead of overwriting the target
   * documents in their entirety by providing a `SetOptions` with `merge: true`.
   */
  export interface SetOptions {
    /**
     * Changes the behavior of a set() call to only replace the values specified
     * in its data argument. Fields omitted from the set() call remain
     * untouched.
     */
    readonly merge?: boolean;
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
    update(field: string|FieldPath, value: any, ...moreFieldsAndValues: any[]):
        Promise<void>;

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
     * Note: get() attempts to provide up-to-date data when possible by waiting
     * for data from the server, but it may return cached data or fail if you
     * are offline and the server cannot be reached.
     *
     * @return A Promise resolved with a DocumentSnapshot containing the
     * current document contents.
     */
    get(): Promise<DocumentSnapshot>;

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
    onSnapshot(options: DocumentListenOptions, observer: {
      next?: (snapshot: DocumentSnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }): () => void;
    onSnapshot(
        onNext: (snapshot: DocumentSnapshot) => void,
        onError?: (error: Error) => void,
        onCompletion?: () => void): () => void;
    onSnapshot(
        options: DocumentListenOptions,
        onNext: (snapshot: DocumentSnapshot) => void,
        onError?: (error: Error) => void,
        onCompletion?: () => void): () => void;
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
  }

  /**
   * A `DocumentSnapshot` contains data read from a document in your Firestore
   * database. The data can be extracted with `.data()` or `.get(<field>)` to
   * get a specific field.
   */
  export class DocumentSnapshot {
    private constructor();

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
     * Retrieves all fields in the document as an Object.
     *
     * @return An Object containing all fields in the document.
     */
    data(): DocumentData;

    /**
     * Retrieves the field specified by `fieldPath`.
     *
     * @param fieldPath The path (e.g. 'foo' or 'foo.bar') to a specific field.
     * @return The data at the specified field location or undefined if no such
     * field exists in the document.
     */
    get(fieldPath: string|FieldPath): any;
  }

  /**
   * The direction of a `Query.orderBy()` clause is specified as 'desc' or 'asc'
   * (descending or ascending).
   */
  export type OrderByDirection = 'desc' | 'asc';

  /**
   * Filter conditions in a `Query.where()` clause are specified using the
   * strings '<', '<=', '==', '>=', and '>'.
   */
  export type WhereFilterOp = '<' | '<=' | '==' | '>=' | '>';

  /**
   * Options for use with `Query.onSnapshot() to control the behavior of the
   * snapshot listener.
   */
  export interface QueryListenOptions {
    /**
     * Raise an event even if only metadata changes (i.e. one of the
     * `QuerySnapshot.metadata` properties). Default is false.
     */
    readonly includeQueryMetadataChanges?: boolean;

    /**
     * Raise an event even if only metadata of a document in the query results
     * changes (i.e. one of the `DocumentSnapshot.metadata` properties on one of
     * the documents). Default is false.
     */
    readonly includeDocumentMetadataChanges?: boolean;
  }

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
    where(fieldPath: string|FieldPath, opStr: WhereFilterOp, value: any): Query;

    /**
     * Creates and returns a new Query that's additionally sorted by the
     * specified field, optionally in descending order instead of ascending.
     *
     * @param fieldPath The field to sort by.
     * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
     * not specified, order will be ascending.
     * @return The created Query.
     */
    orderBy(fieldPath: string|FieldPath, directionStr?: OrderByDirection):
        Query;

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
     * Executes the query and returns the results as a QuerySnapshot.
     *
     * @return A Promise that will be resolved with the results of the Query.
     */
    get(): Promise<QuerySnapshot>;

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
      next?: (snapshot: QuerySnapshot) => void; error?: (error: Error) => void;
      complete?: () => void;
    }): () => void;
    onSnapshot(options: QueryListenOptions, observer: {
      next?: (snapshot: QuerySnapshot) => void; error?: (error: Error) => void;
      complete?: () => void;
    }): () => void;
    onSnapshot(
        onNext: (snapshot: QuerySnapshot) => void,
        onError?: (error: Error) => void,
        onCompletion?: () => void): () => void;
    onSnapshot(
        options: QueryListenOptions, onNext: (snapshot: QuerySnapshot) => void,
        onError?: (error: Error) => void,
        onCompletion?: () => void): () => void;
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
    /**
     * An array of the documents that changed since the last snapshot. If this
     * is the first snapshot, all documents will be in the list as added
     * changes.
     */
    readonly docChanges: DocumentChange[];

    /** An array of all the documents in the QuerySnapshot. */
    readonly docs: DocumentSnapshot[];

    /** The number of documents in the QuerySnapshot. */
    readonly size: number;

    /** True if there are no documents in the QuerySnapshot. */
    readonly empty: boolean;

    /**
     * Enumerates all of the documents in the QuerySnapshot.
     *
     * @param callback A callback to be called with a `DocumentSnapshot` for
     * each document in the snapshot.
     * @param thisArg The `this` binding for the callback.
     */
    forEach(callback: (result: DocumentSnapshot) => void, thisArg?: any): void;
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
    readonly doc: DocumentSnapshot;

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
    readonly parent: DocumentReference|null;

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
  export type FirestoreErrorCode = 'cancelled'|'unknown'|'invalid-argument'|
      'deadline-exceeded'|'not-found'|'already-exists'|'permission-denied'|
      'resource-exhausted'|'failed-precondition'|'aborted'|'out-of-range'|
      'unimplemented'|'internal'|'unavailable'|'data-loss'|'unauthenticated';

  /** An error returned by a Firestore operation. */
  // TODO(b/63008957): FirestoreError should extend firebase.FirebaseError
  export interface FirestoreError {
    code: FirestoreErrorCode;
    message: string;
    name: string;
    stack?: string;
  }
}

declare module 'firebase' {
  export = firebase;
}
