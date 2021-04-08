/**
 * @license
 * Copyright 2017 Google LLC
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

import { Path, pathContains, pathEquals } from '../util/Path';
import { exceptionGuard, log, logger } from '../util/util';

import { Event } from './Event';

/**
 * The event queue serves a few purposes:
 * 1. It ensures we maintain event order in the face of event callbacks doing operations that result in more
 *    events being queued.
 * 2. raiseQueuedEvents() handles being called reentrantly nicely.  That is, if in the course of raising events,
 *    raiseQueuedEvents() is called again, the "inner" call will pick up raising events where the "outer" call
 *    left off, ensuring that the events are still raised synchronously and in order.
 * 3. You can use raiseEventsAtPath and raiseEventsForChangedPath to ensure only relevant previously-queued
 *    events are raised synchronously.
 *
 * NOTE: This can all go away if/when we move to async events.
 *
 */
export class EventQueue {
  eventLists_: EventList[] = [];

  /**
   * Tracks recursion depth of raiseQueuedEvents_, for debugging purposes.
   */
  recursionDepth_ = 0;
}

/**
 * @param eventDataList - The new events to queue.
 */
export function eventQueueQueueEvents(
  eventQueue: EventQueue,
  eventDataList: Event[]
) {
  // We group events by path, storing them in a single EventList, to make it easier to skip over them quickly.
  let currList: EventList | null = null;
  for (let i = 0; i < eventDataList.length; i++) {
    const data = eventDataList[i];
    const path = data.getPath();
    if (currList !== null && !pathEquals(path, currList.path)) {
      eventQueue.eventLists_.push(currList);
      currList = null;
    }

    if (currList === null) {
      currList = { events: [], path };
    }

    currList.events.push(data);
  }
  if (currList) {
    eventQueue.eventLists_.push(currList);
  }
}

/**
 * Queues the specified events and synchronously raises all events (including previously queued ones)
 * for the specified path.
 *
 * It is assumed that the new events are all for the specified path.
 *
 * @param path - The path to raise events for.
 * @param eventDataList - The new events to raise.
 */
export function eventQueueRaiseEventsAtPath(
  eventQueue: EventQueue,
  path: Path,
  eventDataList: Event[]
) {
  eventQueueQueueEvents(eventQueue, eventDataList);
  eventQueueRaiseQueuedEventsMatchingPredicate(eventQueue, eventPath =>
    pathEquals(eventPath, path)
  );
}

/**
 * Queues the specified events and synchronously raises all events (including previously queued ones) for
 * locations related to the specified change path (i.e. all ancestors and descendants).
 *
 * It is assumed that the new events are all related (ancestor or descendant) to the specified path.
 *
 * @param changedPath - The path to raise events for.
 * @param eventDataList - The events to raise
 */
export function eventQueueRaiseEventsForChangedPath(
  eventQueue: EventQueue,
  changedPath: Path,
  eventDataList: Event[]
) {
  eventQueueQueueEvents(eventQueue, eventDataList);
  eventQueueRaiseQueuedEventsMatchingPredicate(
    eventQueue,
    eventPath =>
      pathContains(eventPath, changedPath) ||
      pathContains(changedPath, eventPath)
  );
}

function eventQueueRaiseQueuedEventsMatchingPredicate(
  eventQueue: EventQueue,
  predicate: (path: Path) => boolean
) {
  eventQueue.recursionDepth_++;

  let sentAll = true;
  for (let i = 0; i < eventQueue.eventLists_.length; i++) {
    const eventList = eventQueue.eventLists_[i];
    if (eventList) {
      const eventPath = eventList.path;
      if (predicate(eventPath)) {
        eventListRaise(eventQueue.eventLists_[i]);
        eventQueue.eventLists_[i] = null;
      } else {
        sentAll = false;
      }
    }
  }

  if (sentAll) {
    eventQueue.eventLists_ = [];
  }

  eventQueue.recursionDepth_--;
}

interface EventList {
  events: Event[];
  path: Path;
}

/**
 * Iterates through the list and raises each event
 */
function eventListRaise(eventList: EventList) {
  for (let i = 0; i < eventList.events.length; i++) {
    const eventData = eventList.events[i];
    if (eventData !== null) {
      eventList.events[i] = null;
      const eventFn = eventData.getEventRunner();
      if (logger) {
        log('event: ' + eventData.toString());
      }
      exceptionGuard(eventFn);
    }
  }
}
