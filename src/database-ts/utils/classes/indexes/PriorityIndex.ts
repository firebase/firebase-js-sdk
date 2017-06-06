import { Index } from "./Index";

export class PriorityIndex extends Index {
  static singleton = new PriorityIndex();
  constructor() { super(); }
  dance() {}
}