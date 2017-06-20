export class EventAccumulator {
  public eventData = [];
  public promise;
  public resolve;
  public reject;
  constructor(private expectedEvents: number) {
    if (!this.expectedEvents) throw new Error('EventAccumulator:You must pass a number of expected events to the constructor');
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  addEvent(eventData?: any) {
    this.eventData = [
      ...this.eventData,
      eventData
    ];
    if (this.eventData.length >= this.expectedEvents) {
      this.resolve(this.eventData);
    }
  }
  reset(expectedEvents?: number) {
    this.expectedEvents = expectedEvents || this.expectedEvents;
    this.eventData = [];
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}