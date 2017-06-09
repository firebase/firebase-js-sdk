import { RepoInfo } from "../RepoInfo";
import { StatsCollection } from "./StatsCollection";

export const StatsManager = {
  getCollection(repoInfo: RepoInfo) {
    const hashString = repoInfo.toString();
    if (!StatsCollection.collections[hashString]) {
      StatsCollection.collections[hashString] = new StatsCollection();
    }
    return StatsCollection.collections[hashString];
  },
  getOrCreateReporter(repoInfo: RepoInfo, creatorFunction) {
    const hashString = repoInfo.toString();
    if (!StatsCollection.reporters[hashString]) {
      StatsCollection.reporters[hashString] = creatorFunction();
    }

    return StatsCollection.reporters[hashString];
  }
}