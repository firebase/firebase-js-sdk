import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";

export class FirebaseDatabase {
  constructor();
}

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    database?: {
      (app?: FirebaseApp): FirebaseDatabase;
      Database: typeof FirebaseDatabase
    }
  }
  interface FirebaseApp {
    database?(): FirebaseDatabase;
  }
}
