import { Path } from "./Path";
import { RepoInfo } from "./RepoInfo";
import { Query } from "../Query";
import { EventRegistrationInterface } from "../utils/classes/event/EventRegistration";

export class Repo {
  public database;
  public repoInfo: RepoInfo;
  constructor(repoInfo, forceRestClient, public app) {}
  addEventCallbackForQuery(query: Query, eventRegistration: EventRegistrationInterface) {}
  interrupt() {}
  removeEventCallbackForQuery(query: Query, eventRegistration: EventRegistrationInterface) {}
  resume() {}
  serverTime() {}
  setWithPriority(path, newVal, newPriority, onComplete) {}
  startTransaction(path, transactionUpdate, onComplete, applyLocally) {}
  update(path, childrenToMerge, onComplete) {}
}