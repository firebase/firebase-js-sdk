import { Auth } from '../../src/model/auth';
import { Endpoint } from '../../src/api';
import { mock, Route } from '../mock_fetch';

const TEST_HOST = 'localhost';
const TEST_SCHEME = 'mock';
const TEST_KEY = 'test-api-key';

export const mockAuth: Auth = {
  name: 'test-app',
  config: {
    apiKey: 'test-api-key',
    apiHost: TEST_HOST,
    apiScheme: TEST_SCHEME
  }
};

export function mockEndpoint(
  endpoint: Endpoint,
  response: object,
  status = 200
): Route {
  return mock(
    `${TEST_SCHEME}://${TEST_HOST}${endpoint}?key=${TEST_KEY}`,
    response,
    status
  );
}
