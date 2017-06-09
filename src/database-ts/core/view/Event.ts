import { Path } from "../util/Path";

export interface EventInterface {
  getPath(): Path
  getEventType(): string
  getEventRunner(): Function
  toString(): string
}

export class DataEvent implements EventInterface{
  constructor(public eventType, public eventRegistration, public snapshot, public prevName?) {}
  getPath() {
    var ref = this.snapshot.getRef();
    if (this.eventType === 'value') {
      return ref.path;
    } else {
      return ref.getParent().path;
    }
  }
  getEventType() { 
    return this.eventType; 
  }
  getEventRunner() {
    return this.eventRegistration.getEventRunner(this);
  }
  toString() {
    return this.getPath().toString() + ':' + this.eventType + ':' +
      JSON.stringify(this.snapshot.exportVal());
  }
}

export class CancelEvent implements EventInterface {
  constructor(public eventRegistration, public error, public path) {}
  getPath() {
    return this.path;
  }
  getEventType() {
    return 'cancel';
  }
  getEventRunner() {
    return this.eventRegistration.getEventRunner(this);
  }
  toString() {
    return `${this.path.toString()}:cancel`;
  }
}