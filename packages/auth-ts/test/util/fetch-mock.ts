import * as sinon from 'sinon';

let routes: {[url: string]: Response} = {};

function fakeFetch(requestInfo: RequestInfo): Promise<Response> {
  if (typeof requestInfo !== 'string') {
    throw new Error('Only string URLs supported at this time');
  }
  if (requestInfo in routes) {
    return Promise.resolve(routes[requestInfo]);
  }
  throw new Error(`Attempted real HTTP connection, no mock for ${requestInfo}`);
}

export function mockFetch(url: string, body: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes[url] = new (window as any).Response(body, {
    status: 200,
    headers: {
      'Content-type': 'application/json'
    }
  });
  sinon.stub(window, "fetch").callsFake(fakeFetch);
}

export function restoreFetch(): void {
  sinon.restore();
  routes = {};
}