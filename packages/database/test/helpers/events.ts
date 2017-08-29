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

import { TEST_PROJECT } from './util';
import { Reference } from '../../src/api/Reference';

/**
 * A set of functions to clean up event handlers.
 * @type {function()}
 */
export let eventCleanupHandlers = [];

/** Clean up outstanding event handlers */
export function eventCleanup() {
  for (let i = 0; i < eventCleanupHandlers.length; ++i) {
    eventCleanupHandlers[i]();
  }
  eventCleanupHandlers = [];
}

/**
 * The path component of the firebaseRef url
 * @param {Reference} firebaseRef
 * @return {string}
 */
function rawPath(firebaseRef: Reference) {
  return firebaseRef.toString().replace(TEST_PROJECT.databaseURL, '');
}

/**
 * Creates a struct which waits for many events.
 * @param {Array<Array>} pathAndEvents an array of tuples of [Firebase, [event type strings]]
 * @param {string=} helperName
 * @return {{waiter: waiter, watchesInitializedWaiter: watchesInitializedWaiter, unregister: unregister, addExpectedEvents: addExpectedEvents}}
 */
export function eventTestHelper(pathAndEvents, helperName?) {
  let resolve, reject;
  let promise = new Promise((pResolve, pReject) => {
    resolve = pResolve;
    reject = pReject;
  });
  let resolveInit, rejectInit;
  const initPromise = new Promise((pResolve, pReject) => {
    resolveInit = pResolve;
    rejectInit = pReject;
  });
  const expectedPathAndEvents = [];
  const actualPathAndEvents = [];
  const pathEventListeners = {};
  let initializationEvents = 0;

  helperName = helperName ? helperName + ': ' : '';

  // Listen on all of the required paths, with a callback function that just
  // appends to actualPathAndEvents.
  const make_eventCallback = function(type) {
    return function(snap) {
      // Get the ref of where the snapshot came from.
      const ref = type === 'value' ? snap.ref : snap.ref.parent;

      actualPathAndEvents.push([rawPath(ref), [type, snap.key]]);

      if (!pathEventListeners[ref].initialized) {
        initializationEvents++;
        if (type === 'value') {
          pathEventListeners[ref].initialized = true;
        }
      } else {
        // Call waiter here to trigger exceptions when the event is fired, rather than later when the
        // test framework is calling the waiter...  makes for easier debugging.
        waiter();
      }

      // We want to trigger the promise resolution if valid, so try to call waiter as events
      // are coming back.
      try {
        if (waiter()) {
          resolve();
        }
      } catch (e) {}
    };
  };

  // returns a function which indicates whether the events have been received
  // in the correct order.  If anything is wrong (too many events or
  // incorrect events, we throw).  Else we return false, indicating we should
  // keep waiting.
  const waiter = function() {
    const pathAndEventToString = function(pathAndEvent) {
      return (
        '{path: ' +
        pathAndEvent[0] +
        ', event:[' +
        pathAndEvent[1][0] +
        ', ' +
        pathAndEvent[1][1] +
        ']}'
      );
    };

    let i = 0;
    while (i < expectedPathAndEvents.length && i < actualPathAndEvents.length) {
      const expected = expectedPathAndEvents[i];
      const actual = actualPathAndEvents[i];

      if (
        expected[0] != actual[0] ||
        expected[1][0] != actual[1][0] ||
        expected[1][1] != actual[1][1]
      ) {
        throw helperName +
          'Event ' +
          i +
          ' incorrect. Expected: ' +
          pathAndEventToString(expected) +
          ' Actual: ' +
          pathAndEventToString(actual);
      }
      i++;
    }

    if (expectedPathAndEvents.length < actualPathAndEvents.length) {
      throw helperName +
        "Extra event detected '" +
        pathAndEventToString(actualPathAndEvents[i]) +
        "'.";
    }

    // If we haven't thrown and both arrays are the same length, then we're
    // done.
    return expectedPathAndEvents.length == actualPathAndEvents.length;
  };

  const listenOnPath = function(path) {
    const valueCB = make_eventCallback('value');
    const addedCB = make_eventCallback('child_added');
    const removedCB = make_eventCallback('child_removed');
    const movedCB = make_eventCallback('child_moved');
    const changedCB = make_eventCallback('child_changed');
    path.on('child_removed', removedCB);
    path.on('child_added', addedCB);
    path.on('child_moved', movedCB);
    path.on('child_changed', changedCB);
    path.on('value', valueCB);
    return function() {
      path.off('child_removed', removedCB);
      path.off('child_added', addedCB);
      path.off('child_moved', movedCB);
      path.off('child_changed', changedCB);
      path.off('value', valueCB);
    };
  };

  const addExpectedEvents = function(pathAndEvents) {
    const pathsToListenOn = [];
    for (let i = 0; i < pathAndEvents.length; i++) {
      const pathAndEvent = pathAndEvents[i];

      const path = pathAndEvent[0];
      //var event = pathAndEvent[1];

      pathsToListenOn.push(path);

      pathAndEvent[0] = rawPath(path);

      if (pathAndEvent[1][0] === 'value') pathAndEvent[1][1] = path.key;

      expectedPathAndEvents.push(pathAndEvent);
    }

    // There's some trickiness with event order depending on the order you attach event callbacks:
    //
    // When you listen on a/b/c, a/b, and a, we dedupe that to just listening on a.  But if you do it in that
    // order, we'll send "listen a/b/c, listen a/b, unlisten a/b/c, listen a, unlisten a/b" which will result in you
    // getting events something like "a/b/c: value, a/b: child_added c, a: child_added b, a/b: value, a: value"
    //
    // BUT, if all of the listens happen before you are connected to firebase (e.g. this is the first test you're
    // running), the dedupe will have taken affect and we'll just send "listen a", which results in:
    // "a/b/c: value, a/b: child_added c, a/b: value, a: child_added b, a: value"
    // Notice the 3rd and 4th events are swapped.
    // To mitigate this, we re-ordeer your event registrations and do them in order of shortest path to longest.

    pathsToListenOn.sort(function(a, b) {
      return a.toString().length - b.toString().length;
    });
    for (let i = 0; i < pathsToListenOn.length; i++) {
      let path = pathsToListenOn[i];
      if (!pathEventListeners[path.toString()]) {
        pathEventListeners[path.toString()] = {};
        pathEventListeners[path.toString()].initialized = false;
        pathEventListeners[path.toString()].unlisten = listenOnPath(path);
      }
    }

    promise = new Promise((pResolve, pReject) => {
      resolve = pResolve;
      reject = pReject;
    });
  };

  addExpectedEvents(pathAndEvents);

  const watchesInitializedWaiter = function() {
    for (let path in pathEventListeners) {
      if (!pathEventListeners[path].initialized) return false;
    }

    // Remove any initialization events.
    actualPathAndEvents.splice(
      actualPathAndEvents.length - initializationEvents,
      initializationEvents
    );
    initializationEvents = 0;

    resolveInit();
    return true;
  };

  const unregister = function() {
    for (let path in pathEventListeners) {
      if (pathEventListeners.hasOwnProperty(path)) {
        pathEventListeners[path].unlisten();
      }
    }
  };

  eventCleanupHandlers.push(unregister);
  return {
    promise,
    initPromise,
    waiter,
    watchesInitializedWaiter,
    unregister,

    addExpectedEvents: function(moreEvents) {
      addExpectedEvents(moreEvents);
    }
  };
}
