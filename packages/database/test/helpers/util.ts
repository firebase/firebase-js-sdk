import { ConnectionTarget } from '../../src/api/test_access';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../../config/project.json');
const EMULATOR_PORT = process.env.RTDB_EMULATOR_PORT;
const EMULATOR_NAMESPACE = process.env.RTDB_EMULATOR_NAMESPACE;
const USE_EMULATOR = !!EMULATOR_PORT;

/*
 * When running against the emulator, the hostname will be "localhost" rather
 * than "<namespace>.firebaseio.com", and so we need to append the namespace
 * as a query param.
 *
 * Some tests look for hostname only while others need full url (with the
 * namespace provided as a query param), hence below declarations.
 */
export const DATABASE_ADDRESS = USE_EMULATOR
  ? `http://localhost:${EMULATOR_PORT}`
  : TEST_PROJECT.databaseURL;

export const DATABASE_URL = USE_EMULATOR
  ? `${DATABASE_ADDRESS}?ns=${EMULATOR_NAMESPACE}`
  : TEST_PROJECT.databaseURL;

export function testRepoInfo(url) {
  const regex = /https?:\/\/(.*).firebaseio.com/;
  const match = url.match(regex);
  if (!match) {
    throw new Error('Couldnt get Namespace from passed URL');
  }
  const [, ns] = match;
  return new ConnectionTarget(`${ns}.firebaseio.com`, true, ns, false);
}

export function repoInfoForConnectionTest() {
  if (USE_EMULATOR) {
    return new ConnectionTarget(
      /* host = */ `localhost:${EMULATOR_PORT}`,
      /* secure (useSsl) = */ false, // emulator does not support https or wss
      /* namespace = */ EMULATOR_NAMESPACE,
      /* webSocketOnly = */ false
    );
  } else {
    return testRepoInfo(TEST_PROJECT.databaseURL);
  }
}

export function shuffle(arr, randFn = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randFn() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
