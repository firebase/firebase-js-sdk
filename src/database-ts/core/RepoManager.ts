import { Repo } from "./Repo";
import { fatal } from "../../utils/libs/logger";
import { validateUrl } from "../../utils/libs/validation";
import { parseRepoInfo } from "./util/util";
import { FirebaseApp } from "../../app/firebase_app";
const DATABASE_URL_OPTION = 'databaseURL';

export class RepoManager {
  static getInstance() {
    return new RepoManager();
  }
  private repos: {
    [name: string]: Repo
  } = {};
  private useRestClient = false;
  interrupt() {
    for (let repo in this.repos) {
      this.repos[repo].interrupt();
    }
  }
  resume() {
    for (let repo in this.repos) {
      this.repos[repo].resume();
    }
  }
  createRepo(repoInfo, app) {
    var repo = this.repos[app.name];
    if (repo) {
      fatal('FIREBASE INTERNAL ERROR: Database initialized multiple times.');
    }
    repo = new Repo(repoInfo, this.useRestClient, app);
    this.repos[app.name] = repo;

    return repo;
  }
  deleteRepo(repo: Repo) {
    // This should never happen...
    if (this.repos[repo.app.name] !== repo) {
      fatal("Database " + repo.app.name + " has already been deleted.");
    }
    repo.interrupt();
    delete this.repos[repo.app.name];
  }
  databaseFromApp(app: FirebaseApp) {
    var dbUrl = app.options[DATABASE_URL_OPTION];
    if (dbUrl === undefined) {
      fatal("Can't determine Firebase Database URL.  Be sure to include " +
                         DATABASE_URL_OPTION +
                         " option when calling firebase.intializeApp().");
    }

    var parsedUrl = parseRepoInfo(dbUrl);
    var repoInfo = parsedUrl.repoInfo;

    validateUrl('Invalid Firebase Database URL', 1, parsedUrl);
    if (!parsedUrl.path.isEmpty()) {
      fatal("Database URL must point to the root of a Firebase Database " +
                         "(not including a child path).");
    }

    var repo = this.createRepo(repoInfo, app);

    return repo.database;
  }
  forceRestClient(forceRestClient) {
    this.useRestClient = forceRestClient;
  }
}