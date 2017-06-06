import { Repo } from "./Repo";

export class RepoInfo {
  public host: Repo;
  constructor(host, secure, namespace, webSocketOnly, persistenceKey?) {}
}