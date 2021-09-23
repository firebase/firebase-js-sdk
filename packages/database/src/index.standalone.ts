import { Client } from 'faye-websocket';

import { setWebSocketImpl } from './realtime/WebSocketConnection';

setWebSocketImpl(Client);

// Identical to the exports from api.ts, but doesn't include getDatabase()
// to avoid dependency on @firebase/app.
// This entry point should only be consumed by Admin SDK
export {
    Database,
    EmulatorMockTokenOptions,
    enableLogging,
    goOffline,
    goOnline,
    connectDatabaseEmulator
  } from './api/Database';
  export {
    Query,
    DatabaseReference,
    ListenOptions,
    Unsubscribe,
    ThenableReference
  } from './api/Reference';
  export { OnDisconnect } from './api/OnDisconnect';
  export {
    DataSnapshot,
    EventType,
    QueryConstraint,
    QueryConstraintType,
    endAt,
    endBefore,
    equalTo,
    get,
    limitToFirst,
    limitToLast,
    off,
    onChildAdded,
    onChildChanged,
    onChildMoved,
    onChildRemoved,
    onDisconnect,
    onValue,
    orderByChild,
    orderByKey,
    orderByPriority,
    orderByValue,
    push,
    query,
    ref,
    refFromURL,
    remove,
    set,
    setPriority,
    setWithPriority,
    startAfter,
    startAt,
    update,
    child
  } from './api/Reference_impl';
  export { increment, serverTimestamp } from './api/ServerValue';
  export {
    runTransaction,
    TransactionOptions,
    TransactionResult
  } from './api/Transaction';
  
  // internal exports
  export { setSDKVersion as _setSDKVersion } from './core/version';
  export {
    ReferenceImpl as _ReferenceImpl,
    QueryImpl as _QueryImpl
  } from './api/Reference_impl';
  export { repoManagerDatabaseFromApp as _repoManagerDatabaseFromApp } from './api/Database';
  export {
    validatePathString as _validatePathString,
    validateWritablePath as _validateWritablePath
  } from './core/util/validation';
  export { UserCallback as _UserCallback } from './core/view/EventRegistration';
  export { QueryParams as _QueryParams } from './core/view/QueryParams';
  
  /* eslint-disable camelcase */
  export {
    hijackHash as _TEST_ACCESS_hijackHash,
    forceRestClient as _TEST_ACCESS_forceRestClient
  } from './api/test_access';
  /* eslint-enable camelcase */
  