import { errorPrefix as errorPrefixFxn } from '@firebase/util';

export const validateBoolean = function (
  fnName: string,
  argumentName: string,
  bool: unknown,
  optional: boolean
) {
  if (optional && bool === undefined) {
    return;
  }
  if (typeof bool !== 'boolean') {
    throw new Error(
      errorPrefixFxn(fnName, argumentName) + 'must be a boolean.'
    );
  }
};

export const validateEventType = function (
  fnName: string,
  eventType: string,
  optional: boolean
) {
  if (optional && eventType === undefined) {
    return;
  }

  switch (eventType) {
    case 'value':
    case 'child_added':
    case 'child_removed':
    case 'child_changed':
    case 'child_moved':
      break;
    default:
      throw new Error(
        errorPrefixFxn(fnName, 'eventType') +
          'must be a valid event type = "value", "child_added", "child_removed", ' +
          '"child_changed", or "child_moved".'
      );
  }
};
