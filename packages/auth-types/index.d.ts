import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";

export class FirebaseAuth {
  constructor();
}

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    auth?: {
      (app?: FirebaseApp): FirebaseAuth;
      Auth: typeof FirebaseAuth
    }
  }
  interface FirebaseApp {
    auth?(): FirebaseAuth;
  }
}
