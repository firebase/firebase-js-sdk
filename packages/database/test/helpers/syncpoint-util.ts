/**
 * @license
 * Copyright 2022 Google LLC
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

import assert from 'assert';

import { FirebaseApp, initializeApp } from '@firebase/app';
import { expect } from 'chai';
import * as chai from 'chai';
import _ from 'lodash';
import sinonChai from 'sinon-chai';

import {
  ReferenceImpl,
  DataSnapshot,
  child,
  query,
  ref,
  limitToFirst,
  limitToLast,
  startAfter,
  startAt,
  equalTo,
  endAt,
  endBefore,
  orderByChild,
  orderByKey,
  orderByPriority
} from '../../src/api/Reference_impl';
import { nodeFromJSON } from '../../src/core/snap/nodeFromJSON';
import {
  ListenProvider,
  resetSyncTreeTag,
  SyncTree,
  syncTreeAckUserWrite,
  syncTreeAddEventRegistration,
  syncTreeApplyServerMerge,
  syncTreeApplyServerOverwrite,
  syncTreeApplyTaggedQueryMerge,
  syncTreeApplyTaggedQueryOverwrite,
  syncTreeApplyUserMerge,
  syncTreeApplyUserOverwrite,
  syncTreeRemoveEventRegistration
} from '../../src/core/SyncTree';
import { Path, pathChild, pathEquals } from '../../src/core/util/Path';
import { Change } from '../../src/core/view/Change';
import { CancelEvent, DataEvent, Event } from '../../src/core/view/Event';
import {
  CallbackContext,
  EventRegistration,
  QueryContext
} from '../../src/core/view/EventRegistration';
import { getDatabase } from '../../src/index';

chai.use(sinonChai);

function objectMap(object, mapFn) {
  const newObj = {};
  Object.keys(object).forEach(key => {
    newObj[key] = mapFn(object[key]);
  });
  return newObj;
}

// eslint-disable-next-line @typescript-eslint/ban-types
function removeIf<T>(array: T[], callback: Function) {
  let i = 0;
  while (i < array.length) {
    if (callback(array[i], i)) {
      array.splice(i, 1);
      return true;
    } else {
      ++i;
    }
  }
}
class TestEventRegistration implements EventRegistration {
  private eventListener_: CallbackContext;
  constructor(listener: CallbackContext) {
    this.eventListener_ = listener;
  }
  respondsTo(eventType: string): boolean {
    return true;
  }
  createEvent(change: Change, query: QueryContext): Event {
    let snap;
    if (change.type === 'value') {
      snap = new DataSnapshot(
        change.snapshotNode,
        new ReferenceImpl(query._repo, query._path),
        query._queryParams.getIndex()
      );
    } else {
      const childRef = child(
        new ReferenceImpl(query._repo, query._path),
        change.childName
      );
      const index = query._queryParams.getIndex();
      snap = new DataSnapshot(change.snapshotNode, childRef, index);
    }
    return new DataEvent(change.type, this, snap, change.prevName);
  }
  createCancelEvent(error: Error, path: Path): CancelEvent | null {
    if (this.eventListener_.hasCancelCallback) {
      return new CancelEvent(this, error, path);
    } else {
      return null;
    }
  }
  getEventRunner(eventData: DataEvent): () => void {
    const self = this;
    return function myEventRunner() {
      return self.eventListener_.onValue(
        eventData.snapshot,
        eventData.prevName
      );
    };
  }

  matches(otherEventRegistration: EventRegistration) {
    if (otherEventRegistration instanceof TestEventRegistration) {
      return (
        (this as unknown as TestEventRegistration) === otherEventRegistration
      );
    }
    return false;
  }
  hasAnyCallback(): boolean {
    return true;
  }
}

class SyncPointListenProvider implements ListenProvider {
  private listens_: { [key: string]: boolean };
  constructor() {
    this.listens_ = {};
  }
  startListening(
    query: QueryContext,
    tag: number | null,
    hashFn: () => string,
    onComplete: (a: string, b?: unknown) => Event[]
  ): Event[] {
    const queryParams = query._queryIdentifier;
    const path = query._path;
    const logTag = queryParams + (tag ? ' - (' + tag + ')' : '');
    const key = this.getQueryKey(query, tag);
    const existing = this.listens_[key];
    assert(!existing, 'Duplicate listen');
    this.listens_[key] = true;
    return [];
  }
  stopListening(query: QueryContext, tag: number | null) {
    const queryParams = query._queryIdentifier;
    const path = query._path;
    const logTag = queryParams + (tag ? ' - (' + tag + ')' : '');
    const key = this.getQueryKey(query, tag);
    const existing = this.listens_[key];
    assert(existing, "Missing record of query that we're removing");
    delete this.listens_[key];
  }
  getQueryKey(query: QueryContext, tag: number | null) {
    return (
      query._path.toString() +
      '|' +
      query._queryIdentifier +
      (tag ? '|' + tag : '')
    );
  }
}

export class SyncPointTestParser {
  app: FirebaseApp;
  listens_: any = {};
  listenProvider_: ListenProvider;
  private syncTree_: SyncTree;
  constructor() {
    this.app = initializeApp(
      { databaseURL: 'http://tests.fblocal.com:9000' },
      'SYNCPOINT'
    );
  }

  // Check the number of required arguments
  getTestPath(optBasePath: string | string[], path?: string) {
    if (optBasePath) {
      return pathChild(new Path(optBasePath), path);
    }
    return new Path(path);
  }
  private testRunner(testSpec, optBasePath?) {
    resetSyncTreeTag();
    this.listenProvider_ = new SyncPointListenProvider();
    this.syncTree_ = new SyncTree(this.listenProvider_);
    const eventEquals = function (expectedEvent, actualChange) {
      expect(actualChange.eventType).to.equal(expectedEvent.type);
      if (actualChange.eventType !== 'value') {
        const childName = actualChange.snapshot.key;
        expect(childName).to.equal(expectedEvent.name);
        expect(actualChange.prevName).to.equal(expectedEvent.prevName);
      }
      const actualHash = actualChange.snapshot._node.hash();
      const expectedHash = nodeFromJSON(expectedEvent.data).hash();
      expect(actualHash).to.eql(expectedHash);
    };

    const eventExactMatch = function (expected, actual) {
      if (expected.length < actual.length) {
        throw new Error('Got extra events: ' + actual);
      } else if (expected.length > actual.length) {
        throw new Error('Missing events: ' + actual);
      } else {
        for (let j = 0; j < expected.length; ++j) {
          const actualEvent = actual[j];
          const expectedEvent = expected[j];
          eventEquals(expectedEvent, actualEvent);
        }
      }
    };
    const EVENT_ORDERING = [
      'child_removed',
      'child_added',
      'child_moved',
      'child_changed',
      'value'
    ];
    const assertEventsOrdered = function (e1, e2) {
      const idx1 = EVENT_ORDERING.indexOf(e1);
      const idx2 = EVENT_ORDERING.indexOf(e2);
      if (idx1 > idx2) {
        throw new Error('Received ' + e2 + ' after ' + e1);
      }
    };

    const eventSetMatch = (expected: any, actual: DataEvent[]) => {
      // don't worry about order for now
      if (expected.length !== actual.length) {
        throw new Error('Mismatched lengths');
      }
      expect(expected.length).to.equal(actual.length);

      let currentExpected = expected;
      let currentActual = actual;
      while (currentExpected.length > 0) {
        // Step 1: find location range in expected
        // we expect all events for a particular path to be in a group
        const currentPath = this.getTestPath(
          optBasePath,
          currentExpected[0].path
        );
        let i = 1;
        while (
          i < currentExpected.length &&
          pathEquals(
            currentPath,
            this.getTestPath(optBasePath, currentExpected[i].path)
          )
        ) {
          i++;
        }

        // Step 2: foreach in actual, asserting location
        for (let j = 0; j < i; ++j) {
          const actualEventData = currentActual[j];
          const eventFn =
            actualEventData.eventRegistration.getEventRunner(actualEventData);
          eventFn();
          const specStep = currentSpec;
          const actualPath = this.getTestPath(optBasePath, specStep.path);
          if (!pathEquals(currentPath, actualPath)) {
            throw new Error(
              'Expected path ' +
                actualPath.toString() +
                ' to equal ' +
                currentPath.toString()
            );
          }
        }

        // Step 3: slice each array
        const expectedSlice = currentExpected.slice(0, i);
        const actualSlice = currentActual.slice(0, i);
        const actualMap = {};
        // foreach in actual, stack up to enforce ordering, find in expected
        for (let x = 0; x < actualSlice.length; ++x) {
          const actualEvent = actualSlice[x];
          actualEvent.eventRegistration.getEventRunner(actualEvent)();
          const spec = currentSpec;
          const listenId =
            this.getTestPath(optBasePath, spec.path).toString() +
            '|' +
            spec.ref._queryIdentifier;
          if (listenId in actualMap) {
            // stack this event up, and make sure it obeys ordering constraints
            const eventStack = actualMap[listenId];
            assertEventsOrdered(
              eventStack[eventStack.length - 1].eventType,
              actualEvent.eventType
            );
            eventStack.push(actualEvent);
          } else {
            // this is the first event for this listen, just initialize it
            actualMap[listenId] = [actualEvent];
          }
          // Ordering has been enforced, make sure we can find this in the expected events
          const found = removeIf(expectedSlice, expectedEvent => {
            checkValidProperties(expectedEvent, [
              'type',
              'path',
              'name',
              'prevName',
              'data'
            ]);
            if (expectedEvent.type === actualEvent.eventType) {
              if (expectedEvent.type !== 'value') {
                if (expectedEvent.name !== actualEvent.snapshot.key) {
                  return false;
                }
                if (
                  expectedEvent.type !== 'child_removed' &&
                  expectedEvent.prevName !== actualEvent.prevName
                ) {
                  return false;
                }
              }
              // make sure the snapshots match
              const snapHash = actualEvent.snapshot._node.hash();
              const expectedHash = nodeFromJSON(expectedEvent.data).hash();
              return snapHash === expectedHash;
            } else {
              return false;
            }
          });
          if (!found) {
            throw new Error('Could not find matching expected event');
          }
        }
        currentExpected = currentExpected.slice(i);
        currentActual = currentActual.slice(i);
      }
    };

    const parseQuery = function (q, params) {
      if (!('tag' in params)) {
        throw new Error('Non-default queries must have a tag');
      }
      // eslint-disable-next-line guard-for-in
      for (const paramName in params) {
        const paramValue = params[paramName];
        if (paramName === 'limitToFirst') {
          q = query(q, limitToFirst(paramValue));
        } else if (paramName === 'limitToLast') {
          q = query(q, limitToLast(paramValue));
        } else if (paramName === 'startAfter') {
          q = query(q, startAfter(paramValue.index, paramValue.name));
        } else if (paramName === 'startAt') {
          q = query(q, startAt(paramValue.index, paramValue.name));
        } else if (paramName === 'endAt') {
          q = query(q, endAt(paramValue.index, paramValue.name));
        } else if (paramName === 'endBefore') {
          q = query(q, endBefore(paramValue.index, paramValue.name));
        } else if (paramName === 'equalTo') {
          q = query(q, equalTo(paramValue.index, paramValue.name));
        } else if (paramName === 'orderBy') {
          q = query(q, orderByChild(paramValue));
        } else if (paramName === 'orderByKey') {
          q = query(q, orderByKey());
        } else if (paramName === 'orderByPriority') {
          q = query(q, orderByPriority());
        } else if (paramName !== 'tag') {
          throw new Error('Unsupported query parameter: ' + paramName);
        }
      }
      return q;
    };

    const testListener = function (spec) {
      // Hack: have the callback return the spec for the listen that triggered it.
      return function myListener() {
        currentSpec = spec;
      };
    };

    const checkValidProperties = function (obj, expectedProperties) {
      for (const prop in obj) {
        if (expectedProperties.indexOf(prop) < 0) {
          throw new Error('Unexpected property found in spec: "' + prop + '"');
        }
      }
    };
    let currentSpec;
    console.log('Running ' + testSpec.name);
    let currentWriteId = 0;
    const registrations = {};

    for (let i = 0; i < testSpec.steps.length; ++i) {
      // TODO: Create a separate object structure specifically for the steps
      const spec = _.cloneDeep(testSpec.steps[i]);
      if ('.comment' in spec) {
        console.log(' > ' + spec['.comment']);
      }
      if ('debug' in spec) {
        console.log('start debugging');
        debugger; // eslint-disable-line no-debugger
      }
      delete spec['.comment'];
      delete spec['debug'];
      // Almost everything has a path...
      const path =
        typeof spec.path !== 'undefined' &&
        this.getTestPath(optBasePath, spec.path);
      let events;
      const database = getDatabase(this.app);
      if (spec.type === 'listen') {
        checkValidProperties(spec, [
          'type',
          'path',
          'params',
          'events',
          'callbackId'
        ]);
        let q = query(ref(database, path.toString()));
        if ('params' in spec) {
          q = parseQuery(q, spec.params);
        }
        spec['ref'] = q;
        const callbackId = 'callbackId' in spec ? spec['callbackId'] : null;
        let eventRegistration = callbackId && registrations[callbackId];
        if (!eventRegistration) {
          const listener = testListener(spec);
          eventRegistration = new TestEventRegistration(
            new CallbackContext(listener)
          );
          if (callbackId !== null) {
            registrations[callbackId] = eventRegistration;
          }
        }
        events = syncTreeAddEventRegistration(
          this.syncTree_,
          q,
          eventRegistration
        );
        eventExactMatch(spec.events, events);
      } else if (spec.type === 'unlisten') {
        checkValidProperties(spec, ['type', 'path', 'callbackId', 'events']);
        let q = query(ref(database, path.toString()));
        if ('params' in spec) {
          q = parseQuery(q, spec.params);
        }
        const callbackId = 'callbackId' in spec ? spec['callbackId'] : null;
        const eventRegistration = callbackId && registrations[callbackId];
        if (!eventRegistration) {
          throw new Error(
            "Couldn't find previous listen with callbackId " + callbackId
          );
        }
        events = syncTreeRemoveEventRegistration(
          this.syncTree_,
          q,
          eventRegistration
        );
        eventExactMatch(spec.events, events);
      } else if (spec.type === 'serverUpdate') {
        checkValidProperties(spec, ['type', 'path', 'data', 'tag', 'events']);
        const update = nodeFromJSON(spec.data);
        if ('tag' in spec) {
          events = syncTreeApplyTaggedQueryOverwrite(
            this.syncTree_,
            path,
            update,
            spec.tag
          );
        } else {
          events = syncTreeApplyServerOverwrite(this.syncTree_, path, update);
        }
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'serverMerge') {
        checkValidProperties(spec, ['type', 'path', 'data', 'tag', 'events']);
        const serverMerge = objectMap(spec.data, raw => {
          return nodeFromJSON(raw);
        });
        if ('tag' in spec) {
          events = syncTreeApplyTaggedQueryMerge(
            this.syncTree_,
            path,
            serverMerge,
            spec.tag
          );
        } else {
          events = syncTreeApplyServerMerge(this.syncTree_, path, serverMerge);
        }
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'set') {
        checkValidProperties(spec, [
          'type',
          'path',
          'data',
          'visible',
          'events'
        ]);
        const toSet = nodeFromJSON(spec.data);
        const visible =
          typeof spec.visible === 'undefined' ? true : spec.visible;
        events = syncTreeApplyUserOverwrite(
          this.syncTree_,
          path,
          toSet,
          currentWriteId++,
          visible
        );
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'update') {
        checkValidProperties(spec, ['type', 'path', 'data', 'events']);
        const merge = objectMap(spec.data, raw => {
          return nodeFromJSON(raw);
        });
        events = syncTreeApplyUserMerge(
          this.syncTree_,
          path,
          merge,
          currentWriteId++
        );
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'ackUserWrite') {
        checkValidProperties(spec, ['type', 'writeId', 'revert', 'events']);
        const toClear = spec.writeId;
        const revert = spec.revert || false;
        events = syncTreeAckUserWrite(this.syncTree_, toClear, revert);
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'suppressWarning') {
        // suppresses Jasmine's "Spec has no expectations" warning so that "expect no errors" tests run green.
        expect(true).to.eq(true);
      } else {
        throw new Error('Unknown step: ' + spec.type);
      }
    }
  }
  defineTest(spec) {
    it(spec.name, () => {
      this.testRunner(spec);
      this.testRunner(spec, 'foo/bar/baz');
    });
  }
}
