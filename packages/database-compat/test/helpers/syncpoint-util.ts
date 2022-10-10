import firebase, { FirebaseApp } from '@firebase/app-compat';
import { expect, use } from 'chai';
import { Query } from '@firebase/database';
import { RepoInfo } from '@firebase/database/src/core/RepoInfo';
import { ListenProvider, resetSyncTreeTag, SyncTree } from '@firebase/database/src/core/SyncTree';
import { Path, pathChild } from '@firebase/database/src/core/util/Path';
import { Event } from '@firebase/database/src/core/view/Event';
import { EventRegistration, QueryContext } from '@firebase/database/src/core/view/EventRegistration';
import assert from 'assert';
import { nodeFromJSON } from '@firebase/database/src/core/snap/nodeFromJSON';

function removeIf<T>(array: T[], callback: Function) {
              var i = 0;
              while (i < array.length) {
                  if (callback(array[i], i)) {
                      array.splice(i, 1);
                      return true;
                  }
                  else {
                      ++i;
                  }
          }
class TestEventRegistration implements EventRegistration {
  private eventListener_;
  constructor(listener) {
    this.eventListener_ = listener;
  }
  respondsTo(eventType: string): boolean {
    return true;
  }
}

    TestEventRegistration.prototype.respondsTo = function() {
      return true;
    };

    TestEventRegistration.prototype.createEvent = function(change, query) {
      var snap;
      if (change.type === 'value') {
        snap = new fb.api.DataSnapshot(change.snapshotNode, query.ref);
      } else {
        snap = new fb.api.DataSnapshot(change.snapshotNode, query.ref.child(change.childName));
      }
      return new fb.core.view.DataEvent(change.type, this, snap, change.prevName);
    };

    TestEventRegistration.prototype.getEventRunner = function(eventData) {
      var self = this;
      return function() {
        return self.eventListener_(eventData.snapshot, eventData.prevName);
      };
    };

    TestEventRegistration.prototype.matches = function(otherEventRegistration) {
      return this === otherEventRegistration;
    };

    TestEventRegistration.prototype.hasAnyCallback = function() {
      return true;
    };
function patchFakeAuthFunctions(app: FirebaseApp) {
    var token_ = null;
  
    app['INTERNAL'] = app['INTERNAL'] || {};
  
    app['INTERNAL']['getToken'] = function(forceRefresh) {
      return Promise.resolve(token_);
    };
  
    app['INTERNAL']['addAuthTokenListener'] = function(listener) {
    };
  
    app['INTERNAL']['removeAuthTokenListener'] = function(listener) {
    };
  
    return app;
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
    this.app = firebase.initializeApp({databaseURL: 'http://tests.fblocal.com:9000'},
                                   'SYNCPOINT');
    patchFakeAuthFunctions(this.app);
    this.syncTree_ = new SyncTree(this.listenProvider_);
  }
  
  getTestPath(opt_basePath, path) {
    if(opt_basePath) {
      return pathChild(new Path(opt_basePath), path);
    }
  }
  private testRunner(testSpec, opt_basePath) {
    resetSyncTreeTag();
    var eventEquals = function(expectedEvent, actualChange) {
      expect(actualChange.eventType).to.equal(expectedEvent.type);
      if (actualChange.eventType !== 'value') {
        var childName = actualChange.snapshot.key;
        expect(childName).to.equal(expectedEvent.name);
        expect(actualChange.prevName).to.equal(expectedEvent.prevName);
      }
      var actualHash = actualChange.snapshot.node_.hash();
      var expectedHash = nodeFromJSON(expectedEvent.data).hash();
      expect(actualHash).to.be(expectedHash);
    };

    var eventExactMatch = function(expected, actual) {
      if (expected.length < actual.length) {
        throw new Error('Got extra events: ' + actual);
      } else if (expected.length > actual.length) {
        throw new Error('Missing events: ' + actual);
      } else {
        for (var j = 0; j < expected.length; ++j) {
          var actualEvent = actual[j];
          var expectedEvent = expected[j];
          eventEquals(expectedEvent, actualEvent);
        }
      }
    };

    var EVENT_ORDERING = ['child_removed', 'child_added', 'child_moved', 'child_changed', 'value'];
    var assertEventsOrdered = function(e1, e2) {
      var idx1 = EVENT_ORDERING.indexOf(e1);
      var idx2 = EVENT_ORDERING.indexOf(e2);
      if (idx1 > idx2) {
        throw new Error('Received ' + e2 + ' after ' + e1);
      }
    };

    var eventSetMatch = function(expected, actual) {

      // don't worry about order for now
      if (expected.length !== actual.length) {
        throw new Error('Mismatched lengths');
      }
      expect(expected.length).to.be(actual.length);

      var currentExpected = expected;
      var currentActual = actual;
      while (currentExpected.length > 0) {
        // Step 1: find location range in expected
        // we expect all events for a particular path to be in a group
        var currentPath = this.getTestPath(currentExpected[0].path);
        var i = 1;
        while (i < currentExpected.length && currentPath.equals(this.getTestPath(currentExpected[i].path))) {
          i++;
        }

        // Step 2: foreach in actual, asserting location
        for (var j = 0; j < i; ++j) {
          var actualEventData = currentActual[j];
          var eventFn = actualEventData.eventRegistration.getEventRunner(actualEventData);
          var specStep = eventFn();
          var actualPath = this.getTestPath(specStep.path);
          if (!currentPath.equals(actualPath)) {
            throw new Error('Expected path ' + actualPath.toString() + ' to equal ' + currentPath.toString());
          }
        }

        // Step 3: slice each array
        var expectedSlice = currentExpected.slice(0, i);
        var actualSlice = currentActual.slice(0, i);

        // foreach in actual, stack up to enforce ordering, find in expected
        var actualMap = {};
        for (var x = 0; x < actualSlice.length; ++x) {
          var actualEvent = actualSlice[x];
          var spec = actualEvent.eventRegistration.getEventRunner(actualEvent)();
          var listenId = this.getTestPath(spec.path).toString() + '|' + spec.ref.queryIdentifier();
          if (listenId in actualMap) {
            // stack this event up, and make sure it obeys ordering constraints
            var eventStack = actualMap[listenId];
            assertEventsOrdered(eventStack[eventStack.length - 1].eventType, actualEvent.eventType);
            eventStack.push(actualEvent);
          } else {
            // this is the first event for this listen, just initialize it
            actualMap[listenId] = [actualEvent];
          }
          
          }
          // Ordering has been enforced, make sure we can find this in the expected events
          var found = removeIf(expectedSlice, function(expectedEvent) {
            checkValidProperties(expectedEvent, ['type', 'path', 'name', 'prevName', 'data']);
            if (expectedEvent.type === actualEvent.eventType) {
              if (expectedEvent.type !== 'value') {
                if (expectedEvent.name !== actualEvent.snapshot.key) {
                  return false;
                }
                if (expectedEvent.type !== 'child_removed' && expectedEvent.prevName !== actualEvent.prevName) {
                  return false;
                }
              }
              // make sure the snapshots match
              var snapHash = actualEvent.snapshot.node_.hash();
              var expectedHash = nodeFromJSON(expectedEvent.data).hash();
              return snapHash === expectedHash;
            } else {
              return false;
            }
          });
          if (!found) {
            console.log(actualEvent);
            throw new Error('Could not find matching expected event');
          }
        }
        currentExpected = currentExpected.slice(i);
        currentActual = currentActual.slice(i);
      }

    var parseQuery = function(query, params) {
      if ('tag' in params) {
        throw new Error('Non-default queries must have a tag');
      }
      for (const paramName in params) {
        const paramValue = params[paramName];
        if (paramName === 'limitToFirst') {
          query = query.limitToFirst(paramValue);
        } else if (paramName === 'limitToLast') {
          query = query.limitToLast(paramValue);
        } else if (paramName === 'startAt') {
          query = query.startAt(paramValue.index, paramValue.name);
        } else if (paramName === 'endAt') {
          query = query.endAt(paramValue.index, paramValue.name);
        } else if (paramName === 'equalTo') {
          query = query.equalTo(paramValue.index, paramValue.name);
        } else if (paramName === 'orderBy') {
          query = query.orderByChild(paramValue);
        } else if (paramName === 'orderByKey') {
          query = query.orderByKey();
        } else if (paramName === 'orderByPriority') {
          query = query.orderByPriority();
        } else if (paramName !== 'tag') {
          throw new Error('Unsupported query parameter: ' + paramName);
        }
      }
      return query;
    };

    var testListener = function(spec) {
      // Hack: have the callback return the spec for the listen that triggered it.
      return function() {
        return spec;
      };
    };

    var checkValidProperties = function(obj, expectedProperties) {
      for(const prop in obj) {
        if (expectedProperties.indexOf(prop) < 0) {
          throw new Error('Unexpected property found in spec: "' + prop + '"');
        }
      }
    };
  }
  defineTest(spec) {
    xit(spec.name, () => {});
  }
}


var syncpoint = function() {

  // if (typeof fb === 'undefined') {
  //   console.log('Skipping SyncPoint tests, since fb.core.RepoInfo isn\'t defined.');

  //   return {
  //     defineTest: function(spec) {
  //       xit(spec.name, function(){})
  //     }
  //   };
  // }

  var app = firebase.initializeApp({databaseURL: 'http://tests.fblocal.com:9000'},
                                   'SYNCPOINT');
  TESTS.patchFakeAuthFunctions(app);
  var repoInfo = new fb.core.RepoInfo('tests.fblocal.com:9000',
                                      /*secure=*/ false,
                                      'tests',
                                      /*webSocketOnly=*/ false);
  var repo = new fb.core.Repo(repoInfo, false, app);
  var testRunner = function(testSpec, opt_basePath) {

    var testListenProvider = function() {
      this.listens_ = {};
    };

    var getTestPath = function(path) {
      if (opt_basePath) {
        return new fb.core.util.Path(opt_basePath).child(path);
      } else {
        return new fb.core.util.Path(path);
      }
    };

    testListenProvider.prototype.startListening = function(query, tag) {
      var queryParams = query.queryIdentifier();
      var path = query.path;
      var logTag = queryParams + (tag ? ' - (' + tag + ')' : '');
      var key = this.getQueryKey(query, tag);
      var existing = fb.util.obj.get(this.listens_, key);
      fb.core.util.assert(!existing, 'Duplicate listen');
      this.listens_[key] = true;
      return [];
    };

    testListenProvider.prototype.getQueryKey = function(query, tag) {
      return query.path.toString() + '|' + query.queryIdentifier() + (tag ? '|' + tag : '');
    };

    testListenProvider.prototype.stopListening = function(query, tag) {
      var queryParams = query.queryIdentifier();
      var path = query.path;
      var logTag = queryParams + (tag ? ' - (' + tag + ')' : '');
      var key = this.getQueryKey(query, tag);
      var existing = fb.util.obj.get(this.listens_, key);
      fb.core.util.assert(existing, "Missing record of query that we're removing");
      delete this.listens_[key];
    };

    // HACK to reset global state
    fb.core.SyncTree.nextQueryTag_ = 1;
    var syncTree = new fb.core.SyncTree(new testListenProvider());
    var eventEquals = function(expectedEvent, actualChange) {
      expect(actualChange.eventType).toEqual(expectedEvent.type);
      if (actualChange.eventType !== 'value') {
        var childName = actualChange.snapshot.key;
        expect(childName).toEqual(expectedEvent.name);
        expect(actualChange.prevName).toEqual(expectedEvent.prevName);
      }
      var actualHash = actualChange.snapshot.node_.hash();
      var expectedHash = fb.core.snap.NodeFromJSON(expectedEvent.data).hash();
      expect(actualHash).toBe(expectedHash);
    };

    var eventExactMatch = function(expected, actual) {
      if (expected.length < actual.length) {
        throw new Error('Got extra events: ' + actual);
      } else if (expected.length > actual.length) {
        throw new Error('Missing events: ' + actual);
      } else {
        for (var j = 0; j < expected.length; ++j) {
          var actualEvent = actual[j];
          var expectedEvent = expected[j];
          eventEquals(expectedEvent, actualEvent);
        }
      }
    };

    var EVENT_ORDERING = ['child_removed', 'child_added', 'child_moved', 'child_changed', 'value'];
    var assertEventsOrdered = function(e1, e2) {
      var idx1 = EVENT_ORDERING.indexOf(e1);
      var idx2 = EVENT_ORDERING.indexOf(e2);
      if (idx1 > idx2) {
        throw new Error('Received ' + e2 + ' after ' + e1);
      }
    };

    var eventSetMatch = function(expected, actual) {

      // don't worry about order for now
      if (expected.length !== actual.length) {
        throw new Error('Mismatched lengths');
      }
      expect(expected.length).to.be(actual.length);

      var currentExpected = expected;
      var currentActual = actual;
      while (currentExpected.length > 0) {
        // Step 1: find location range in expected
        // we expect all events for a particular path to be in a group
        var currentPath = getTestPath(currentExpected[0].path);
        var i = 1;
        while (i < currentExpected.length && currentPath.equals(getTestPath(currentExpected[i].path))) {
          i++;
        }

        // Step 2: foreach in actual, asserting location
        for (var j = 0; j < i; ++j) {
          var actualEventData = currentActual[j];
          var eventFn = actualEventData.eventRegistration.getEventRunner(actualEventData);
          var specStep = eventFn();
          var actualPath = getTestPath(specStep.path);
          if (!currentPath.equals(actualPath)) {
            throw new Error('Expected path ' + actualPath.toString() + ' to equal ' + currentPath.toString());
          }
        }

        // Step 3: slice each array
        var expectedSlice = currentExpected.slice(0, i);
        var actualSlice = currentActual.slice(0, i);

        // foreach in actual, stack up to enforce ordering, find in expected
        var actualMap = {};
        for (var x = 0; x < actualSlice.length; ++x) {
          var actualEvent = actualSlice[x];
          var spec = actualEvent.eventRegistration.getEventRunner(actualEvent)();
          var listenId = getTestPath(spec.path).toString() + '|' + spec.ref.queryIdentifier();
          if (fb.util.obj.contains(actualMap, listenId)) {
            // stack this event up, and make sure it obeys ordering constraints
            var eventStack = fb.util.obj.get(actualMap, listenId);
            assertEventsOrdered(eventStack[eventStack.length - 1].eventType, actualEvent.eventType);
            eventStack.push(actualEvent);
          } else {
            // this is the first event for this listen, just initialize it
            actualMap[listenId] = [actualEvent];
          }
          // Ordering has been enforced, make sure we can find this in the expected events
          var found = goog.array.removeIf(expectedSlice, function(expectedEvent) {
            checkValidProperties(expectedEvent, ['type', 'path', 'name', 'prevName', 'data']);
            if (expectedEvent.type === actualEvent.eventType) {
              if (expectedEvent.type !== 'value') {
                if (expectedEvent.name !== actualEvent.snapshot.key) {
                  return false;
                }
                if (expectedEvent.type !== 'child_removed' && expectedEvent.prevName !== actualEvent.prevName) {
                  return false;
                }
              }
              // make sure the snapshots match
              var snapHash = actualEvent.snapshot.node_.hash();
              var expectedHash = fb.core.snap.NodeFromJSON(expectedEvent.data).hash();
              return snapHash === expectedHash;
            } else {
              return false;
            }
          });
          if (!found) {
            console.log(actualEvent);
            throw new Error('Could not find matching expected event');
          }
        }
        currentExpected = currentExpected.slice(i);
        currentActual = currentActual.slice(i);
      }
    };

    var parseQuery = function(query, params) {
      if ('tag' in params) {
        throw new Error('Non-default queries must have a tag');
      }
      for (const paramName in params) {
        const paramValue = params[paramName];
        if (paramName === 'limitToFirst') {
          query = query.limitToFirst(paramValue);
        } else if (paramName === 'limitToLast') {
          query = query.limitToLast(paramValue);
        } else if (paramName === 'startAt') {
          query = query.startAt(paramValue.index, paramValue.name);
        } else if (paramName === 'endAt') {
          query = query.endAt(paramValue.index, paramValue.name);
        } else if (paramName === 'equalTo') {
          query = query.equalTo(paramValue.index, paramValue.name);
        } else if (paramName === 'orderBy') {
          query = query.orderByChild(paramValue);
        } else if (paramName === 'orderByKey') {
          query = query.orderByKey();
        } else if (paramName === 'orderByPriority') {
          query = query.orderByPriority();
        } else if (paramName !== 'tag') {
          throw new Error('Unsupported query parameter: ' + paramName);
        }
      }
      return query;
    };

    var testListener = function(spec) {
      // Hack: have the callback return the spec for the listen that triggered it.
      return function() {
        return spec;
      };
    };

    var checkValidProperties = function(obj, expectedProperties) {
      for(const prop in obj) {
        if (expectedProperties.indexOf(prop) < 0) {
          throw new Error('Unexpected property found in spec: "' + prop + '"');
        }
      }
    };

    var TestEventRegistration = function(listener) {
      this.eventListener_ = listener;
    };

    TestEventRegistration.prototype.respondsTo = function() {
      return true;
    };

    TestEventRegistration.prototype.createEvent = function(change, query) {
      var snap;
      if (change.type === 'value') {
        snap = new fb.api.DataSnapshot(change.snapshotNode, query.ref);
      } else {
        snap = new fb.api.DataSnapshot(change.snapshotNode, query.ref.child(change.childName));
      }
      return new fb.core.view.DataEvent(change.type, this, snap, change.prevName);
    };

    TestEventRegistration.prototype.getEventRunner = function(eventData) {
      var self = this;
      return function() {
        return self.eventListener_(eventData.snapshot, eventData.prevName);
      };
    };

    TestEventRegistration.prototype.matches = function(otherEventRegistration) {
      return this === otherEventRegistration;
    };

    TestEventRegistration.prototype.hasAnyCallback = function() {
      return true;
    };

    console.log('Running ' + testSpec.name);
    var currentWriteId = 0;
    var registrations = {};

    for (var i = 0; i < testSpec.steps.length; ++i) {
      var spec = goog.object.unsafeClone(testSpec.steps[i]);
      if (goog.object.containsKey(spec, '.comment')) {
        console.log(' > ' + spec['.comment']);
      }
      if (goog.object.containsKey(spec, 'debug')) {
        console.log('start debugging');
        debugger;
      }
      delete spec['.comment'];
      delete spec['debug'];
      // Almost everything has a path...
      var path = (typeof spec.path !== 'undefined') && getTestPath(spec.path);
      var events;
      if (spec.type === 'listen') {
        checkValidProperties(spec, ['type', 'path', 'params', 'events', 'callbackId']);
        var query = new Firebase(repo, path);
        if (goog.object.containsKey(spec, 'params')) {
          query = parseQuery(query, spec.params);
        }
        spec['ref'] = query;
        var callbackId = ('callbackId' in spec) ? spec['callbackId'] : null;
        var eventRegistration = callbackId && registrations[callbackId];
        if (!eventRegistration) {
          var listener = testListener(spec);
          eventRegistration = new TestEventRegistration(listener);
          if (callbackId !== null) {
            registrations[callbackId] = eventRegistration;
          }
        }
        events = syncTree.addEventRegistration(query, eventRegistration);
        eventExactMatch(spec.events, events);
      } else if (spec.type === 'unlisten') {
        checkValidProperties(spec, ['type', 'path', 'callbackId', 'events']);
        query = new Firebase(repo, path);
        if ('params' in spec) {
          query = parseQuery(query, spec.params);
        }
        callbackId = ('callbackId' in spec) ? spec['callbackId'] : null;
        eventRegistration = callbackId && registrations[callbackId];
        if (!eventRegistration) {
          throw new Error("Couldn't find previous listen with callbackId " + callbackId);
        }
        events = syncTree.removeEventRegistration(query, eventRegistration);
        eventExactMatch(spec.events, events);
      } else if (spec.type === 'serverUpdate') {
        checkValidProperties(spec, ['type', 'path', 'data', 'tag', 'events']);
        var update = fb.core.snap.NodeFromJSON(spec.data);
        if (goog.object.containsKey(spec, 'tag')) {
          events = syncTree.applyTaggedQueryOverwrite(path, update, spec.tag);
        } else {
          events = syncTree.applyServerOverwrite(path, update);
        }
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'serverMerge') {
        checkValidProperties(spec, ['type', 'path', 'data', 'tag', 'events']);
        var serverMerge = goog.object.map(spec.data, function(raw) {
          return fb.core.snap.NodeFromJSON(raw);
        });
        if (goog.object.containsKey(spec, 'tag')) {
          events = syncTree.applyTaggedQueryMerge(path, serverMerge, spec.tag);
        } else {
          events = syncTree.applyServerMerge(path, serverMerge);
        }
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'set') {
        checkValidProperties(spec, ['type', 'path', 'data', 'visible', 'events']);
        var toSet = fb.core.snap.NodeFromJSON(spec.data);
        var visible = typeof spec.visible == 'undefined' ? true : spec.visible;
        events = syncTree.applyUserOverwrite(path, toSet, currentWriteId++, visible);
        //console.log(events);
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'update') {
        checkValidProperties(spec, ['type', 'path', 'data', 'events']);
        var merge = goog.object.map(spec.data, function(raw) {
          return fb.core.snap.NodeFromJSON(raw);
        });
        events = syncTree.applyUserMerge(path, merge, currentWriteId++);
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'ackUserWrite') {
        checkValidProperties(spec, ['type', 'writeId', 'revert', 'events']);
        var toClear = spec.writeId;
        var revert = spec.revert || false;
        events = syncTree.ackUserWrite(toClear, revert);
        eventSetMatch(spec.events, events);
      } else if (spec.type === 'suppressWarning') {
        // suppresses Jasmine's "Spec has no expectations" warning so that "expect no errors" tests run green.
        expect(true).toBe(true);
      } else {
        throw new Error('Unknown step: ' + spec.type);
      }
    }
  };

  var defineTest = function(spec) {
    it(spec.name, function() {
      testRunner(spec);
      // run again at a deeper location
      testRunner(spec, '/foo/bar/baz');
    });
  };

  return {
    defineTest: defineTest
  };
};
