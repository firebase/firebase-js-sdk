import { FirebaseOptions } from '@firebase/app-exp';

// __karma__ is an untyped global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __karma__: any;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PROJECT_CONFIG = require('../../../../../config/project.json');

const EMULATOR_PORT = process.env.AUTH_EMULATOR_PORT;
const EMULATOR_PROJECT_ID = process.env.AUTH_EMULATOR_PROJECT_ID;

export const USE_EMULATOR = !!EMULATOR_PORT;

export const PROJECT_ID = USE_EMULATOR ? EMULATOR_PROJECT_ID : PROJECT_CONFIG.projectId;
export const AUTH_DOMAIN = USE_EMULATOR ? 'emulator-auth-domain' : PROJECT_CONFIG.authDomain;
export const API_KEY = USE_EMULATOR ? 'emulator-api-key' : PROJECT_CONFIG.apiKey;



export function getAppConfig(): FirebaseOptions {
  // Prefer the karma config, then fallback on node process.env stuff
  return getKarma()?.config?.authAppConfig || {
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    authDomain: AUTH_DOMAIN
  };
};

export function getEmulatorUrl(): string | null {
  // Check karma first, then fallback on node process
  const emulatorPort: string | null = getKarma()?.config?.authEmulatorPort || (USE_EMULATOR ? EMULATOR_PORT : null);

  return emulatorPort ? `http://localhost:${emulatorPort}` : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getKarma(): any {
  return typeof __karma__ !== 'undefined' ? __karma__ : undefined;
}