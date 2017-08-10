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

  class Promise < T > extends Promise_Instance < T > {
    static all (values : firebase.Promise < any > [] ) : firebase.Promise < any [] > ;
    static reject (error : Error ) : firebase.Promise < any > ;
    static resolve < T > (value ? : T ) : firebase.Promise < T > ;
  }
  class Promise_Instance < T > implements firebase.Thenable < any > {
    constructor (resolver : (a : (a : T ) => undefined , b : (a : Error ) => undefined ) => any ) ;
    catch (onReject ? : (a : Error ) => any ) : firebase.Thenable < any > ;
    then (onResolve ? : (a : T ) => any , onReject ? : (a : Error ) => any ) : firebase.Promise < any > ;
  }

  var SDK_VERSION : string ;

  interface Thenable < T > {
    catch (onReject ? : (a : Error ) => any ) : any ;
    then (onResolve ? : (a : T ) => any , onReject ? : (a : Error ) => any ) : firebase.Thenable < any > ;
  }

  type Unsubscribe = ( ) => void ;

  interface User extends firebase.UserInfo {
    delete ( ) : firebase.Promise < any > ;
    emailVerified : boolean ;
    getIdToken (forceRefresh ? : boolean ) : firebase.Promise < any > ;
    getToken (forceRefresh ? : boolean ) : firebase.Promise < any > ;
    isAnonymous : boolean ;
    linkAndRetrieveDataWithCredential (credential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    linkWithCredential (credential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    linkWithPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : firebase.Promise < any > ;
    linkWithPopup (provider : firebase.auth.AuthProvider ) : firebase.Promise < any > ;
    linkWithRedirect (provider : firebase.auth.AuthProvider ) : firebase.Promise < any > ;
    phoneNumber : string | null ;
    providerData : ( firebase.UserInfo | null ) [] ;
    reauthenticateAndRetrieveDataWithCredential (credential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    reauthenticateWithCredential (credential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    reauthenticateWithPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : firebase.Promise < any > ;
    reauthenticateWithPopup (provider : firebase.auth.AuthProvider ) : firebase.Promise < any > ;
    reauthenticateWithRedirect (provider : firebase.auth.AuthProvider ) : firebase.Promise < any > ;
    refreshToken : string ;
    reload ( ) : firebase.Promise < any > ;
    sendEmailVerification ( ) : firebase.Promise < any > ;
    toJSON ( ) : Object ;
    unlink (providerId : string ) : firebase.Promise < any > ;
    updateEmail (newEmail : string ) : firebase.Promise < any > ;
    updatePassword (newPassword : string ) : firebase.Promise < any > ;
    updatePhoneNumber (phoneCredential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    updateProfile (profile : { displayName : string | null , photoURL : string | null } ) : firebase.Promise < any > ;
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
}

declare namespace firebase.app {
  interface App {
    auth ( ) : firebase.auth.Auth ;
    database ( ) : firebase.database.Database ;
    delete ( ) : firebase.Promise < any > ;
    messaging ( ) : firebase.messaging.Messaging ;
    name : string ;
    options : Object ;
    storage (url ? : string ) : firebase.storage.Storage ;
  }
}

declare namespace firebase.auth {
  interface ActionCodeInfo {
  }

  type AdditionalUserInfo = { profile : Object | null , providerId : string , username ? : string | null } ;

  interface ApplicationVerifier {
    type : string ;
    verify ( ) : firebase.Promise < any > ;
  }

  interface Auth {
    app : firebase.app.App ;
    applyActionCode (code : string ) : firebase.Promise < any > ;
    checkActionCode (code : string ) : firebase.Promise < any > ;
    confirmPasswordReset (code : string , newPassword : string ) : firebase.Promise < any > ;
    createUserWithEmailAndPassword (email : string , password : string ) : firebase.Promise < any > ;
    currentUser : firebase.User | null ;
    fetchProvidersForEmail (email : string ) : firebase.Promise < any > ;
    getRedirectResult ( ) : firebase.Promise < any > ;
    onAuthStateChanged (nextOrObserver : firebase.Observer < any , any > | ( (a : firebase.User | null ) => any ) , error ? : (a : firebase.auth.Error ) => any , completed ? : firebase.Unsubscribe ) : firebase.Unsubscribe ;
    onIdTokenChanged (nextOrObserver : firebase.Observer < any , any > | ( (a : firebase.User | null ) => any ) , error ? : (a : firebase.auth.Error ) => any , completed ? : firebase.Unsubscribe ) : firebase.Unsubscribe ;
    sendPasswordResetEmail (email : string ) : firebase.Promise < any > ;
    setPersistence (persistence : firebase.auth.Auth.Persistence ) : firebase.Promise < any > ;
    signInAndRetrieveDataWithCredential (credential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    signInAnonymously ( ) : firebase.Promise < any > ;
    signInWithCredential (credential : firebase.auth.AuthCredential ) : firebase.Promise < any > ;
    signInWithCustomToken (token : string ) : firebase.Promise < any > ;
    signInWithEmailAndPassword (email : string , password : string ) : firebase.Promise < any > ;
    signInWithPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : firebase.Promise < any > ;
    signInWithPopup (provider : firebase.auth.AuthProvider ) : firebase.Promise < any > ;
    signInWithRedirect (provider : firebase.auth.AuthProvider ) : firebase.Promise < any > ;
    signOut ( ) : firebase.Promise < any > ;
    verifyPasswordResetCode (code : string ) : firebase.Promise < any > ;
  }

  interface AuthCredential {
    providerId : string ;
  }

  interface AuthProvider {
    providerId : string ;
  }

  interface ConfirmationResult {
    confirm (verificationCode : string ) : firebase.Promise < any > ;
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
    verifyPhoneNumber (phoneNumber : string , applicationVerifier : firebase.auth.ApplicationVerifier ) : firebase.Promise < any > ;
  }

  class RecaptchaVerifier extends RecaptchaVerifier_Instance {
  }
  class RecaptchaVerifier_Instance implements firebase.auth.ApplicationVerifier {
    constructor (container : any | string , parameters ? : Object | null , app ? : firebase.app.App | null ) ;
    clear ( ) : any ;
    render ( ) : firebase.Promise < any > ;
    type : string ;
    verify ( ) : firebase.Promise < any > ;
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
    cancel (onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    remove (onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    set (value : any , onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    setWithPriority (value : any , priority : number | string | null , onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    update (values : Object , onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
  }

  interface Query {
    endAt (value : number | string | boolean | null , key ? : string ) : firebase.database.Query ;
    equalTo (value : number | string | boolean | null , key ? : string ) : firebase.database.Query ;
    isEqual (other : firebase.database.Query | null ) : boolean ;
    limitToFirst (limit : number ) : firebase.database.Query ;
    limitToLast (limit : number ) : firebase.database.Query ;
    off (eventType ? : string , callback ? : (a : firebase.database.DataSnapshot , b ? : string | null ) => any , context ? : Object | null ) : any ;
    on (eventType : string , callback : (a : firebase.database.DataSnapshot | null , b ? : string ) => any , cancelCallbackOrContext ? : Object | null , context ? : Object | null ) : (a : firebase.database.DataSnapshot | null , b ? : string ) => any ;
    once (eventType : string , successCallback ? : (a : firebase.database.DataSnapshot , b ? : string ) => any , failureCallbackOrContext ? : Object | null , context ? : Object | null ) : firebase.Promise < any > ;
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
    remove (onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    root : firebase.database.Reference ;
    set (value : any , onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    setPriority (priority : string | number | null , onComplete : (a : Error | null ) => any ) : firebase.Promise < any > ;
    setWithPriority (newVal : any , newPriority : string | number | null , onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
    transaction (transactionUpdate : (a : any ) => any , onComplete ? : (a : Error | null , b : boolean , c : firebase.database.DataSnapshot | null ) => any , applyLocally ? : boolean ) : firebase.Promise < any > ;
    update (values : Object , onComplete ? : (a : Error | null ) => any ) : firebase.Promise < any > ;
  }

  interface ThenableReference extends firebase.database.Reference , firebase.Thenable < any > {
  }

  function enableLogging (logger ? : boolean | ( (a : string ) => any ) , persistent ? : boolean ) : any ;
}

declare namespace firebase.database.ServerValue {
  var TIMESTAMP : Object ;
}

declare namespace firebase.messaging {
  interface Messaging {
    deleteToken (token : string ) : firebase.Promise < any > | null ;
    getToken ( ) : firebase.Promise < any > | null ;
    onMessage (nextOrObserver : firebase.Observer < any , any > | ( (a : Object ) => any ) ) : firebase.Unsubscribe ;
    onTokenRefresh (nextOrObserver : firebase.Observer < any , any > | ( (a : Object ) => any ) ) : firebase.Unsubscribe ;
    requestPermission ( ) : firebase.Promise < any > | null ;
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
    delete ( ) : firebase.Promise < any > ;
    fullPath : string ;
    getDownloadURL ( ) : firebase.Promise < any > ;
    getMetadata ( ) : firebase.Promise < any > ;
    name : string ;
    parent : firebase.storage.Reference | null ;
    put (data : any | any | any , metadata ? : firebase.storage.UploadMetadata ) : firebase.storage.UploadTask ;
    putString (data : string , format ? : firebase.storage.StringFormat , metadata ? : firebase.storage.UploadMetadata ) : firebase.storage.UploadTask ;
    root : firebase.storage.Reference ;
    storage : firebase.storage.Storage ;
    toString ( ) : string ;
    updateMetadata (metadata : firebase.storage.SettableMetadata ) : firebase.Promise < any > ;
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
    catch (onRejected : (a : Error ) => any ) : firebase.Promise < any > ;
    on (event : firebase.storage.TaskEvent , nextOrObserver ? : firebase.Observer < any , any > | null | ( (a : Object ) => any ) , error ? : ( (a : Error ) => any ) | null , complete ? : ( firebase.Unsubscribe ) | null ) : Function ;
    pause ( ) : boolean ;
    resume ( ) : boolean ;
    snapshot : firebase.storage.UploadTaskSnapshot ;
    then (onFulfilled ? : ( (a : firebase.storage.UploadTaskSnapshot ) => any ) | null , onRejected ? : ( (a : Error ) => any ) | null ) : firebase.Promise < any > ;
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

declare module 'firebase' {
  export = firebase;
}
