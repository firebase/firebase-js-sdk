import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";

export class FirebaseMessaging {
  constructor();
}

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    messaging?: {
      (app?: FirebaseApp): FirebaseMessaging;
      Messaging: typeof FirebaseMessaging
    }
  }
  interface FirebaseApp {
    messaging?(): FirebaseMessaging;
  }
}
