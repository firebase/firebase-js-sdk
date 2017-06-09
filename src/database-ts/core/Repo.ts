import { FirebaseApp } from "../../app/firebase_app";
import { Path } from "./util/Path";
import { RepoInfo } from "./RepoInfo";
import { Query } from "../api/Query";
import { EventRegistrationInterface } from "./view/EventRegistration";
import { AuthTokenProvider } from "./AuthTokenProvider";
import { StatsManager } from "./stats/StatsManager";
import { StatsReporter } from "./stats/StatsReporter";
import { EventQueue } from "./view/EventQueue";
import { ReadonlyRestClient } from "./ReadonlyRestClient";
import { Database } from "../api/Database";
import { SnapshotHolder } from "./SnapshotHolder";
import { SparseSnapshotTree } from "./SparseSnapshotTree";
import { SyncTree } from "./SyncTree";

/**
 * @return {boolean} true if we think we're currently being crawled.
*/
function beingCrawled() {
  var userAgent = (typeof window === 'object' && window['navigator'] && window['navigator']['userAgent']) || '';

  // For now we whitelist the most popular crawlers.  We should refine this to be the set of crawlers we
  // believe to support JavaScript/AJAX rendering.
  // NOTE: Google Webmaster Tools doesn't really belong, but their "This is how a visitor to your website
  // would have seen the page" is flaky if we don't treat it as a crawler.
  return userAgent.search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i) >= 0;
};


export class Repo {
  /**
   * Default values
   */
  private infoData = new SnapshotHolder();
  private infoSyncTree;
  private interceptServerDataCallback_ = null;
  private onDisconnect = new SparseSnapshotTree();
  private stats;
  private statsListener;
  private statsReporter;
  private eventQueue = new EventQueue();
  private nextWriteId = 1;
  private persistentConnection = null;
  private server;
  private serverSyncTree;

  public database;
  public dataUpdateCount = 0;
  
  constructor(public repoInfo: RepoInfo, forceRestClient, public app: FirebaseApp) {
    const authTokenProvider = new AuthTokenProvider(app);
    this.stats = StatsManager.getCollection(repoInfo);

    if (forceRestClient || beingCrawled()) {
      this.server = new ReadonlyRestClient(this.repoInfo, this.onDataUpdate.bind(this), authTokenProvider);

      // Minor hack: Fire onConnect immediately, since there's no actual connection.
      setTimeout(this.onConnectStatus.bind(this, true), 0);
    } else {
      var authOverride = app.options['databaseAuthVariableOverride'];
      // Validate authOverride
      if (typeof authOverride !== 'undefined' && authOverride !== null) {
        if (typeof authOverride !== 'object') {
          throw new Error('Only objects are supported for option databaseAuthVariableOverride');
        }
        try {
          JSON.stringify(authOverride);
        } catch (e) {
          throw new Error('Invalid authOverride provided: ' + e);
        }
      }
    }

    authTokenProvider.addTokenChangeListener(token => {
      this.server.refreshAuthToken(token);
    });

    // In the case of multiple Repos for the same repoInfo (i.e. there are multiple Firebase.Contexts being used),
    // we only want to create one StatsReporter.  As such, we'll report stats over the first Repo created.
    this.statsReporter = StatsManager.getOrCreateReporter(repoInfo, () => new StatsReporter(this.stats, this.server));

    this.transactions_init();

    // Used for .info.
    this.infoSyncTree = new SyncTree({
      startListening: (query, tag, currentHashFn, onComplete) => {
        var infoEvents = [];
        var node = this.infoData.getNode(query.path);
        // This is possibly a hack, but we have different semantics for .info endpoints. We don't raise null events
        // on initial data...
        if (!node.isEmpty()) {
          infoEvents = this.infoSyncTree.applyServerOverwrite(query.path, node);
          setTimeout(function() {
            onComplete('ok');
          }, 0);
        }
        return infoEvents;
      },
      stopListening: () => {}
    });
    this.updateInfo('connected', false);

    // A list of data pieces and paths to be set when this client disconnects.
    this.database = new Database(this);

    this.serverSyncTree = new SyncTree({
      startListening: (query, tag, currentHashFn, onComplete) => {
        this.server.listen(query, currentHashFn, tag, (status, data) => {
          var events = onComplete(status, data);
          this.eventQueue.raiseEventsForChangedPath(query.path, events);
        });
        // No synchronous events for network-backed sync trees
        return [];
      },
      stopListening: (query, tag) => {
        this.server.unlisten(query, tag);
      }
    });
  }
  addEventCallbackForQuery(query: Query, eventRegistration: EventRegistrationInterface) {}
  interrupt() {}
  private onConnectStatus(connectStatus) {
    this.updateInfo('connected', connectStatus);
    if (connectStatus === false) {
      this.runOnDisconnectEvents();
    }
  }
  private onDataUpdate() {}
  removeEventCallbackForQuery(query: Query, eventRegistration: EventRegistrationInterface) {}
  resume() {}
  private runOnDisconnectEvents() {}
  serverTime() {}
  setWithPriority(path, newVal, newPriority, onComplete) {}
  startTransaction(path, transactionUpdate, onComplete, applyLocally) {}
  private transactions_init() {};
  update(path, childrenToMerge, onComplete) {}
  private updateInfo(pathString, value) {}
}