import { Path } from "./Path";

export class Repo {
  public database;
  serverTime() {}
  setWithPriority(path, newVal, newPriority, onComplete) {}
  startTransaction(path, transactionUpdate, onComplete, applyLocally) {}
  update(path, childrenToMerge, onComplete) {}
}