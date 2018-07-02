
export function isNil(obj: any): boolean {
  return obj === undefined || obj === null;
}

export function validateEventsArray(events?: any[]) {
  if(isNil(events) || events!.length === 0) {
    events = ['child_added', 'child_removed', 'child_changed', 'child_moved'];
  }
  return events;
}
