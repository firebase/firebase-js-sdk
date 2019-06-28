/**
 * @license
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

import { expect } from 'chai';
import * as sinon from 'sinon';
import {
  EventManager,
  ListenOptions,
  QueryListener
} from '../../../src/core/event_manager';
import { Query } from '../../../src/core/query';
import { OnlineState } from '../../../src/core/types';
import { View } from '../../../src/core/view';
import { ChangeType, ViewSnapshot } from '../../../src/core/view_snapshot';
import { documentKeySet } from '../../../src/model/collections';
import { DocumentSet } from '../../../src/model/document_set';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  ackTarget,
  applyDocChanges,
  doc,
  documentUpdates,
  keys,
  path
} from '../../util/helpers';

describe('EventManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, mock object.
  function fakeQueryListener(query: Query): any {
    return {
      query,
      onViewSnapshot: () => {},
      onError: () => {},
      applyOnlineStateChange: () => {}
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, mock object.
  function makeSyncEngineSpy(): any {
    const stub = {
      listen: sinon.stub().returns(Promise.resolve(0)),
      subscribe: sinon.spy(),
      unlisten: sinon.spy()
    };
    return stub;
  }

  it('handles many listenables per query', async () => {
    const query = Query.atPath(path('foo/bar'));
    const fakeListener1 = fakeQueryListener(query);
    const fakeListener2 = fakeQueryListener(query);

    const syncEngineSpy = makeSyncEngineSpy();
    const eventManager = new EventManager(syncEngineSpy);

    await eventManager.listen(fakeListener1);
    expect(syncEngineSpy.listen.calledWith(query)).to.be.true;

    await eventManager.listen(fakeListener2);
    expect(syncEngineSpy.listen.callCount).to.equal(1);

    await eventManager.unlisten(fakeListener2);
    expect(syncEngineSpy.unlisten.callCount).to.equal(0);

    await eventManager.unlisten(fakeListener1);
    expect(syncEngineSpy.unlisten.calledWith(query)).to.be.true;
  });

  it('handles unlisten on unknown listenable gracefully', async () => {
    const syncEngineSpy = makeSyncEngineSpy();
    const query = Query.atPath(path('foo/bar'));
    const fakeListener1 = fakeQueryListener(query);
    const eventManager = new EventManager(syncEngineSpy);
    await eventManager.unlisten(fakeListener1);
    expect(syncEngineSpy.unlisten.callCount).to.equal(0);
  });

  it('notifies listenables in the right order', async () => {
    const query1 = Query.atPath(path('foo/bar'));
    const query2 = Query.atPath(path('bar/baz'));
    const eventOrder: string[] = [];

    const fakeListener1 = fakeQueryListener(query1);
    fakeListener1.onViewSnapshot = () => {
      eventOrder.push('listenable1');
    };
    const fakeListener2 = fakeQueryListener(query2);
    fakeListener2.onViewSnapshot = () => {
      eventOrder.push('listenable2');
    };
    const fakeListener3 = fakeQueryListener(query1);
    fakeListener3.onViewSnapshot = () => {
      eventOrder.push('listenable3');
    };

    const syncEngineSpy = makeSyncEngineSpy();
    const eventManager = new EventManager(syncEngineSpy);

    await eventManager.listen(fakeListener1);
    await eventManager.listen(fakeListener2);
    await eventManager.listen(fakeListener3);
    expect(syncEngineSpy.listen.callCount).to.equal(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, mock ViewSnapshot.
    const viewSnap1: any = { query: query1 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, mock ViewSnapshot.
    const viewSnap2: any = { query: query2 };
    eventManager.onWatchChange([viewSnap1, viewSnap2]);

    expect(eventOrder).to.deep.equal([
      'listenable1',
      'listenable3',
      'listenable2'
    ]);
  });

  it('will forward onOnlineStateChange calls', async () => {
    const query = Query.atPath(path('foo/bar'));
    const fakeListener1 = fakeQueryListener(query);
    const events: OnlineState[] = [];
    fakeListener1.applyOnlineStateChange = (onlineState: OnlineState) => {
      events.push(onlineState);
    };

    const syncEngineSpy = makeSyncEngineSpy();
    const eventManager = new EventManager(syncEngineSpy);

    await eventManager.listen(fakeListener1);
    expect(events).to.deep.equal([OnlineState.Unknown]);
    eventManager.onOnlineStateChange(OnlineState.Online);
    expect(events).to.deep.equal([OnlineState.Unknown, OnlineState.Online]);
  });
});

describe('QueryListener', () => {
  addEqualityMatcher();

  function queryListener(
    query: Query,
    events?: ViewSnapshot[],
    errors?: Error[],
    options?: ListenOptions
  ): QueryListener {
    return new QueryListener(
      query,
      {
        next: (snap: ViewSnapshot) => {
          if (events !== undefined) {
            events.push(snap);
          }
        },
        error: (error: Error) => {
          if (errors !== undefined) {
            errors.push(error);
          }
        }
      },
      options
    );
  }

  it('raises collection events', () => {
    const events: ViewSnapshot[] = [];
    const otherEvents: ViewSnapshot[] = [];
    const query = Query.atPath(path('rooms'));
    const doc1 = doc('rooms/Eros', 1, { name: 'Eros' });
    const doc2 = doc('rooms/Hades', 2, { name: 'Hades' });
    const doc2prime = doc('rooms/Hades', 3, { name: 'Hades', owner: 'Jonny' });

    const eventListener = queryListener(query, events);
    const otherListener = queryListener(query, otherEvents);

    const view = new View(query, documentKeySet());
    const snap1 = applyDocChanges(view, doc1, doc2).snapshot!;
    const snap2 = applyDocChanges(view, doc2prime).snapshot!;

    const change1 = { type: ChangeType.Added, doc: doc1 };
    const change2 = { type: ChangeType.Added, doc: doc2 };
    const change3 = { type: ChangeType.Modified, doc: doc2prime };
    // Second listener should receive doc2prime as added document not
    // Modified.
    const change4 = { type: ChangeType.Added, doc: doc2prime };

    eventListener.onViewSnapshot(snap1);
    eventListener.onViewSnapshot(snap2);
    otherListener.onViewSnapshot(snap2);

    expect(events).to.deep.equal([snap1, snap2]);
    expect(events[0].docChanges).to.deep.equal([change1, change2]);
    expect(events[1].docChanges).to.deep.equal([change3]);

    const expectedSnap2 = {
      query: snap2.query,
      docs: snap2.docs,
      oldDocs: DocumentSet.emptySet(snap2.docs),
      docChanges: [change1, change4],
      fromCache: snap2.fromCache,
      syncStateChanged: true,
      mutatedKeys: keys()
    };
    expect(otherEvents).to.deep.equal([expectedSnap2]);
  });

  it('raises error event', () => {
    const events: Error[] = [];
    const query = Query.atPath(path('rooms/Eros'));

    const listener = queryListener(query, [], events);

    listener.onError(Error('bad'));
    expect(events[0]).to.deep.equal(new Error('bad'));
  });

  it('raises event for empty collection after sync', () => {
    const events: ViewSnapshot[] = [];
    const query = Query.atPath(path('rooms'));

    const eventListenable = queryListener(query, events);

    const view = new View(query, documentKeySet());
    const snap1 = applyDocChanges(view).snapshot!;

    const changes = view.computeDocChanges(documentUpdates());
    const snap2 = view.applyChanges(changes, true, ackTarget()).snapshot!;

    eventListenable.onViewSnapshot(snap1); // no event
    eventListenable.onViewSnapshot(snap2); // empty event

    expect(events).to.deep.equal([snap2]);
  });

  it("raises 'hasPendingWrites' for pending mutation in initial snapshot", () => {
    const events: ViewSnapshot[] = [];
    const query = Query.atPath(path('rooms'));
    const doc1 = doc(
      'rooms/Eros',
      1,
      { name: 'Eros' },
      { hasLocalMutations: true }
    );

    const eventListenable = queryListener(query, events);

    const view = new View(query, documentKeySet());
    const changes = view.computeDocChanges(documentUpdates(doc1));
    const snap1 = view.applyChanges(changes, true, ackTarget()).snapshot!;

    eventListenable.onViewSnapshot(snap1);

    expect(events[0].hasPendingWrites).to.be.true;
  });

  it("doesn't raise 'hasPendingWrites' for committed mutation in initial snapshot", () => {
    const events: ViewSnapshot[] = [];
    const query = Query.atPath(path('rooms'));
    const doc1 = doc(
      'rooms/Eros',
      1,
      { name: 'Eros' },
      { hasCommittedMutations: true }
    );

    const eventListenable = queryListener(query, events);

    const view = new View(query, documentKeySet());
    const changes = view.computeDocChanges(documentUpdates(doc1));
    const snap1 = view.applyChanges(changes, true, ackTarget()).snapshot!;

    eventListenable.onViewSnapshot(snap1);

    expect(events[0].hasPendingWrites).to.be.false;
  });

  it('does not raise events for metadata changes unless specified', () => {
    const filteredEvents: ViewSnapshot[] = [];
    const fullEvents: ViewSnapshot[] = [];
    const query = Query.atPath(path('rooms'));
    const doc1 = doc('rooms/Eros', 1, { name: 'Eros' });
    const doc2 = doc('rooms/Hades', 2, { name: 'Hades' });

    const filteredListener = queryListener(query, filteredEvents);
    const fullListener = queryListener(query, fullEvents, [], {
      includeMetadataChanges: true
    });

    const view = new View(query, documentKeySet());
    const snap1 = applyDocChanges(view, doc1).snapshot!;

    const changes = view.computeDocChanges(documentUpdates());
    const snap2 = view.applyChanges(changes, true, ackTarget(doc1)).snapshot!;
    const snap3 = applyDocChanges(view, doc2).snapshot!;

    filteredListener.onViewSnapshot(snap1); // local event
    filteredListener.onViewSnapshot(snap2); // no event
    filteredListener.onViewSnapshot(snap3); // doc2 update.

    fullListener.onViewSnapshot(snap1); // local event
    fullListener.onViewSnapshot(snap2); // state change event
    fullListener.onViewSnapshot(snap3); // doc2 update.

    expect(filteredEvents).to.deep.equal([snap1, snap3]);
    expect(fullEvents.length).to.deep.equal(3);
    expect(fullEvents).to.deep.equal([snap1, snap2, snap3]);
  });

  it('raises metadata events only when specified', () => {
    const filteredEvents: ViewSnapshot[] = [];
    const fullEvents: ViewSnapshot[] = [];
    const query = Query.atPath(path('rooms'));
    const doc1 = doc(
      'rooms/Eros',
      1,
      { name: 'Eros' },
      { hasLocalMutations: true }
    );
    const doc2 = doc('rooms/Hades', 2, { name: 'Hades' });
    const doc1prime = doc('rooms/Eros', 1, { name: 'Eros' });
    const doc3 = doc('rooms/Other', 3, { name: 'Other' });

    const filteredListener = queryListener(query, filteredEvents);
    const fullListener = queryListener(query, fullEvents, [], {
      includeMetadataChanges: true
    });

    const view = new View(query, documentKeySet());
    const snap1 = applyDocChanges(view, doc1, doc2).snapshot!;
    const snap2 = applyDocChanges(view, doc1prime).snapshot!;
    const snap3 = applyDocChanges(view, doc3).snapshot!;

    const change1 = { type: ChangeType.Added, doc: doc1 };
    const change2 = { type: ChangeType.Added, doc: doc2 };
    const change3 = { type: ChangeType.Metadata, doc: doc1prime };
    const change4 = { type: ChangeType.Added, doc: doc3 };

    filteredListener.onViewSnapshot(snap1);
    filteredListener.onViewSnapshot(snap2);
    filteredListener.onViewSnapshot(snap3);
    fullListener.onViewSnapshot(snap1);
    fullListener.onViewSnapshot(snap2);
    fullListener.onViewSnapshot(snap3);

    expect(filteredEvents).to.deep.equal([snap1, snap3]);
    expect(filteredEvents[0].docChanges).to.deep.equal([change1, change2]);
    expect(filteredEvents[1].docChanges).to.deep.equal([change4]);

    // Second listener should receive doc2prime as added document not
    // Modified.
    expect(fullEvents).to.deep.equal([snap1, snap2, snap3]);

    expect(fullEvents[1].docChanges).to.deep.equal([change3]);
  });

  it(
    'Metadata-only document changes are filtered out when ' +
      'includeMetadataChanges is false',
    () => {
      const filteredEvents: ViewSnapshot[] = [];
      const query = Query.atPath(path('rooms'));
      const doc1 = doc(
        'rooms/Eros',
        1,
        { name: 'Eros' },
        { hasLocalMutations: true }
      );
      const doc2 = doc('rooms/Hades', 2, { name: 'Hades' });
      const doc1prime = doc('rooms/Eros', 1, { name: 'Eros' });
      const doc3 = doc('rooms/Other', 3, { name: 'Other' });
      const filteredListener = queryListener(query, filteredEvents);

      const view = new View(query, documentKeySet());
      const snap1 = applyDocChanges(view, doc1, doc2).snapshot!;
      const snap2 = applyDocChanges(view, doc1prime, doc3).snapshot!;

      const change3 = { type: ChangeType.Added, doc: doc3 };

      filteredListener.onViewSnapshot(snap1);
      filteredListener.onViewSnapshot(snap2);

      const expectedSnap2 = {
        query: snap2.query,
        docs: snap2.docs,
        oldDocs: snap1.docs,
        docChanges: [change3],
        fromCache: snap2.fromCache,
        syncStateChanged: snap2.syncStateChanged,
        mutatedKeys: snap2.mutatedKeys
      };
      expect(filteredEvents).to.deep.equal([snap1, expectedSnap2]);
    }
  );

  it("Suppresses write acknowledgment if Watch hasn't caught up", () => {
    // This test verifies that we don't get three events for a ServerTimestamp
    // mutation. We suppress the event generated by the write acknowledgement
    // and instead wait for Watch to catch up.
    const events: ViewSnapshot[] = [];
    const query = Query.atPath(path('coll'));
    const doc1 = doc('coll/a', 1, { time: 1 }, { hasLocalMutations: true });
    // This event is suppressed
    const doc1Committed = doc(
      'coll/a',
      2,
      { time: 2 },
      { hasCommittedMutations: true }
    );
    const doc1Acknowledged = doc('coll/a', 2, { time: 2 });
    const doc2 = doc('coll/b', 1, { time: 1 }, { hasLocalMutations: true });
    const doc2Modified = doc(
      'coll/b',
      2,
      { time: 3 },
      { hasLocalMutations: true }
    );
    const doc2Acknowledged = doc('coll/b', 2, { time: 3 });
    const listener = queryListener(query, events, [], {
      includeMetadataChanges: true
    });

    const view = new View(query, documentKeySet());
    const snap1 = applyDocChanges(view, doc1, doc2).snapshot!;
    const snap2 = applyDocChanges(view, doc1Committed, doc2Modified).snapshot!;
    const snap3 = applyDocChanges(view, doc1Acknowledged, doc2Acknowledged)
      .snapshot!;

    listener.onViewSnapshot(snap1);
    listener.onViewSnapshot(snap2);
    listener.onViewSnapshot(snap3);

    expect(snap1.docChanges).to.deep.equal([
      { type: ChangeType.Added, doc: doc1 },
      { type: ChangeType.Added, doc: doc2 }
    ]);
    expect(snap2.docChanges).to.deep.equal([
      { type: ChangeType.Modified, doc: doc2Modified }
    ]);
    expect(snap3.docChanges).to.deep.equal([
      { type: ChangeType.Modified, doc: doc1Acknowledged },
      { type: ChangeType.Metadata, doc: doc2Acknowledged }
    ]);

    expect(events).to.deep.equal([snap1, snap2, snap3]);
  });

  it('Will wait for sync if online', () => {
    const query = Query.atPath(path('rooms'));

    const doc1 = doc('rooms/Eros', 1, { name: 'Eros' });
    const doc2 = doc('rooms/Hades', 2, { name: 'Hades' });
    const events: ViewSnapshot[] = [];
    const listener = queryListener(query, events, [], {
      waitForSyncWhenOnline: true
    });

    const view = new View(query, documentKeySet());
    const changes1 = view.computeDocChanges(documentUpdates(doc1));
    const snap1 = view.applyChanges(changes1, true).snapshot!;
    const changes2 = view.computeDocChanges(documentUpdates(doc2));
    const snap2 = view.applyChanges(changes2, true).snapshot!;
    const changes3 = view.computeDocChanges(documentUpdates());
    const snap3 = view.applyChanges(changes3, true, ackTarget(doc1, doc2))
      .snapshot!;

    listener.applyOnlineStateChange(OnlineState.Online); // no event
    listener.onViewSnapshot(snap1); // no event
    listener.applyOnlineStateChange(OnlineState.Unknown); // no event
    listener.applyOnlineStateChange(OnlineState.Online); // no event
    listener.onViewSnapshot(snap2); // no event
    listener.onViewSnapshot(snap3); // event because synced

    const expectedSnap = {
      query,
      docs: snap3.docs,
      oldDocs: DocumentSet.emptySet(snap3.docs),
      docChanges: [
        { type: ChangeType.Added, doc: doc1 },
        { type: ChangeType.Added, doc: doc2 }
      ],
      fromCache: false,
      syncStateChanged: true,
      mutatedKeys: keys()
    };
    expect(events).to.deep.equal([expectedSnap]);
  });

  it('Will raise initial event when going offline', () => {
    const query = Query.atPath(path('rooms'));

    const doc1 = doc('rooms/Eros', 1, { name: 'Eros' });
    const doc2 = doc('rooms/Hades', 2, { name: 'Hades' });
    const events: ViewSnapshot[] = [];
    const listener = queryListener(query, events, [], {
      waitForSyncWhenOnline: true
    });

    const view = new View(query, documentKeySet());
    const changes1 = view.computeDocChanges(documentUpdates(doc1));
    const snap1 = view.applyChanges(changes1, true).snapshot!;
    const changes2 = view.computeDocChanges(documentUpdates(doc2));
    const snap2 = view.applyChanges(changes2, true).snapshot!;

    listener.applyOnlineStateChange(OnlineState.Online); // no event
    listener.onViewSnapshot(snap1); // no event
    listener.applyOnlineStateChange(OnlineState.Offline); // event
    listener.applyOnlineStateChange(OnlineState.Online); // no event
    listener.applyOnlineStateChange(OnlineState.Offline); // no event
    listener.onViewSnapshot(snap2); // another event

    const expectedSnap1 = {
      query,
      docs: snap1.docs,
      oldDocs: DocumentSet.emptySet(snap1.docs),
      docChanges: [{ type: ChangeType.Added, doc: doc1 }],
      fromCache: true,
      syncStateChanged: true,
      mutatedKeys: keys()
    };
    const expectedSnap2 = {
      query,
      docs: snap2.docs,
      oldDocs: snap1.docs,
      docChanges: [{ type: ChangeType.Added, doc: doc2 }],
      fromCache: true,
      syncStateChanged: false,
      mutatedKeys: keys()
    };
    expect(events).to.deep.equal([expectedSnap1, expectedSnap2]);
  });

  it('Will raise initial event when going offline and there are no docs', () => {
    const query = Query.atPath(path('rooms'));

    const events: ViewSnapshot[] = [];
    const listener = queryListener(query, events);

    const view = new View(query, documentKeySet());
    const changes1 = view.computeDocChanges(documentUpdates());
    const snap1 = view.applyChanges(changes1, true).snapshot!;

    listener.applyOnlineStateChange(OnlineState.Online); // no event
    listener.onViewSnapshot(snap1); // no event
    listener.applyOnlineStateChange(OnlineState.Offline); // event

    const expectedSnap = {
      query,
      docs: snap1.docs,
      oldDocs: DocumentSet.emptySet(snap1.docs),
      docChanges: [],
      fromCache: true,
      syncStateChanged: true,
      mutatedKeys: keys()
    };
    expect(events).to.deep.equal([expectedSnap]);
  });

  it('Will raise initial event when offline and there are no docs', () => {
    const query = Query.atPath(path('rooms'));

    const events: ViewSnapshot[] = [];
    const listener = queryListener(query, events);

    const view = new View(query, documentKeySet());
    const changes1 = view.computeDocChanges(documentUpdates());
    const snap1 = view.applyChanges(changes1, true).snapshot!;

    listener.applyOnlineStateChange(OnlineState.Offline);
    listener.onViewSnapshot(snap1);

    const expectedSnap = {
      query,
      docs: snap1.docs,
      oldDocs: DocumentSet.emptySet(snap1.docs),
      docChanges: [],
      fromCache: true,
      syncStateChanged: true,
      mutatedKeys: keys()
    };
    expect(events).to.deep.equal([expectedSnap]);
  });
});
