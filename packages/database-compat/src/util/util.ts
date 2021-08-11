import { Logger } from '@firebase/logger';

const logClient = new Logger('@firebase/database-compat');

export const warn = function (msg: string) {
  const message = 'FIREBASE WARNING: ' + msg;
  logClient.warn(message);
};
