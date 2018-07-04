export function isNil(obj: any): boolean {
  return obj === undefined || obj === null;
}

/**
 * Check the length of the provided array. If it is empty return an array
 * that is populated with all the Realtime Database child events.
 * @param events
 */
export function validateEventsArray(events?: any[]) {
  if (isNil(events) || events!.length === 0) {
    events = ['child_added', 'child_removed', 'child_changed', 'child_moved'];
  }
  return events;
}
