import { ComponentContainer } from '@firebase/component';

export interface FirebaseApp {
  /**
   * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
   * App.
   */
  readonly name: string;

  /**
   * The (read-only) configuration options from the app initialization.
   */
  readonly options: FirebaseOptions;

  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled: boolean;
}

export interface FirebaseAppInternal extends FirebaseApp {
  container: ComponentContainer;
  isDeleted: boolean;
  checkDestroyed(): void;
}

export interface FirebaseOptions {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export interface FirebaseAppConfig {
  name?: string;
  automaticDataCollectionEnabled?: boolean;
}

export interface PlatformLoggerService {
  getPlatformInfoString(): string;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'platform-logger': PlatformLoggerService;
  }
}
