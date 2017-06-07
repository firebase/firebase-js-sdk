import { Repo } from "./Repo";
import { LocalStorage } from "../../utils/libs/storage";

export class RepoInfo {
  public host: string;
  public domain;
  public internalHost;
  constructor(host, public secure, public namespace, public webSocketOnly, public persistenceKey = '') {
    this.host = host.toLowerCase();
    this.domain = this.host.substr(this.host.indexOf('.') + 1);
    this.internalHost = LocalStorage.get('host:' + host) || this.host;
  }
}