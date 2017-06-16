import { stringify } from '../../../utils/json';
import { Path } from '../util/Path';
import { EventRegistration } from './EventRegistration';
import { DataSnapshot } from '../../api/DataSnapshot';

/**
 * Encapsulates the data needed to raise an event
 * @interface
 */
export interface Event {
  /**
   * @return {!fb.core.util.Path}
   */
  getPath(): Path;

  /**
   * @return {!string}
   */
  getEventType(): string;

  /**
   * @return {!function()}
   */
  getEventRunner(): () => void;

  /**
   * @return {!string}
   */
  toString(): string;
}


/**
 * Encapsulates the data needed to raise an event
 * @implements {Event}
 */
export class DataEvent implements Event {
  /**
   * @param {!string} eventType One of: value, child_added, child_changed, child_moved, child_removed
   * @param {!EventRegistration} eventRegistration The function to call to with the event data. User provided
   * @param {!fb.api.DataSnapshot} snapshot The data backing the event
   * @param {?string=} prevName Optional, the name of the previous child for child_* events.
   */
  constructor(public eventType: 'value' | ' child_added' | ' child_changed' | ' child_moved' | ' child_removed',
              public eventRegistration: EventRegistration,
              public snapshot: DataSnapshot,
              public prevName?: string | null) {
  }

  /**
   * @inheritDoc
   */
  getPath(): Path {
    const ref = this.snapshot.getRef();
    if (this.eventType === 'value') {
      return ref.path;
    } else {
      return ref.getParent().path;
    }
  }

  /**
   * @inheritDoc
   */
  getEventType(): string {
    return this.eventType;
  }

  /**
   * @inheritDoc
   */
  getEventRunner(): () => void {
    return this.eventRegistration.getEventRunner(this);
  }

  /**
   * @inheritDoc
   */
  toString(): string {
    return this.getPath().toString() + ':' + this.eventType + ':' +
      stringify(this.snapshot.exportVal());
  }
}


export class CancelEvent implements Event {
  /**
   * @param {EventRegistration} eventRegistration
   * @param {Error} error
   * @param {!fb.core.util.Path} path
   */
  constructor(public eventRegistration: EventRegistration,
              public error: Error,
              public path: Path) {
  }

  /**
   * @inheritDoc
   */
  getPath() {
    return this.path;
  }

  /**
   * @inheritDoc
   */
  getEventType() {
    return 'cancel';
  }

  /**
   * @inheritDoc
   */
  getEventRunner() {
    return this.eventRegistration.getEventRunner(this);
  }

  /**
   * @inheritDoc
   */
  toString() {
    return this.path.toString() + ':cancel';
  }
}
