import { Path } from "./Path";
import { RepoInfo } from "./RepoInfo";

export class Repo {
  public database;
  public repoInfo: RepoInfo;
  constructor(repoInfo, forceRestClient, public app) {}
  interrupt() {}
  resume() {}
  serverTime() {}
  setWithPriority(path, newVal, newPriority, onComplete) {}
  startTransaction(path, transactionUpdate, onComplete, applyLocally) {}
  update(path, childrenToMerge, onComplete) {}
}