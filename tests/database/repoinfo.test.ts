import { testRepoInfo } from "./helpers/util";
import { CONSTANTS } from "../../src/database/realtime/Constants";
import { expect } from "chai";

describe('RepoInfo', function() {
  it('should return the correct URL', function() {
    var repoInfo = testRepoInfo('test-ns');

    var urlParams = {};
    urlParams[CONSTANTS.VERSION_PARAM] = CONSTANTS.PROTOCOL_VERSION;
    urlParams[CONSTANTS.LAST_SESSION_PARAM] = 'test';

    var websocketUrl = repoInfo.connectionURL(CONSTANTS.WEBSOCKET, urlParams);
    expect(websocketUrl).to.equal('ws://test-ns.fblocal.com:9000/.ws?v=5&ls=test');

    var longPollingUrl = repoInfo.connectionURL(CONSTANTS.LONG_POLLING, urlParams);
    expect(longPollingUrl).to.equal('http://test-ns.fblocal.com:9000/.lp?v=5&ls=test');
  });
});
