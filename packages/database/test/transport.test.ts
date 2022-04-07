import { CONSTANTS } from '@firebase/util';
import { expect } from 'chai';

import { forceLongPolling, forceWebSockets } from '../src';
import { BrowserPollConnection } from '../src/realtime/BrowserPollConnection';
import { WebSocketConnection } from '../src/realtime/WebSocketConnection';

describe('Force Transport', () => {
  xit('should enable websockets and disable longPolling', () => {
    forceWebSockets();
    expect(WebSocketConnection.isAvailable()).to.equal(true);
    expect(BrowserPollConnection.isAvailable()).to.equal(false);
  });
  it('should enable longPolling and disable websockets', () => {
    CONSTANTS.NODE_CLIENT =  false;
    forceLongPolling();
    expect(WebSocketConnection.isAvailable()).to.equal(false);
    expect(BrowserPollConnection.isAvailable()).to.equal(true);
  });
});
