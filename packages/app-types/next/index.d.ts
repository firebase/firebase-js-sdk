import { ComponentContainer } from '@firebase/component';

export interface FirebaseAppNext {
    /**
     * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
     * App.
     */
    readonly name: string;

    /**
     * The (read-only) configuration options from the app initialization.
     */
    readonly options: FirebaseOptionsNext;

    /**
     * The settable config flag for GDPR opt-in/opt-out
     */
    automaticDataCollectionEnabled: boolean;
}

export interface FirebaseAppInternalNext extends FirebaseAppNext {
    container: ComponentContainer;
    isDeleted: boolean;
    checkDestroyed(): void;
}

export interface FirebaseOptionsNext {
    apiKey?: string;
    authDomain?: string;
    databaseURL?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
}

export interface FirebaseAppConfigNext {
    name?: string;
    automaticDataCollectionEnabled?: boolean;
}

declare module '@firebase/component' {
    interface NameServiceMapping {
      'app-next': FirebaseAppNext;
    }
  }
  