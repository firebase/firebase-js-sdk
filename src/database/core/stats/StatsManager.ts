import { StatsCollection } from "./StatsCollection";

export const StatsManager = {
  collections_:{ },
  reporters_:{ },
  getCollection:function(repoInfo) {
    var hashString = repoInfo.toString();
    if (!this.collections_[hashString]) {
      this.collections_[hashString] = new StatsCollection();
    }
    return this.collections_[hashString];
  },
  getOrCreateReporter:function(repoInfo, creatorFunction) {
    var hashString = repoInfo.toString();
    if (!this.reporters_[hashString]) {
      this.reporters_[hashString] = creatorFunction();
    }

    return this.reporters_[hashString];
  }
};

