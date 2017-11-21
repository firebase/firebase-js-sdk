import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";

export class FirebaseStorage {
  constructor();
}

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    storage?: {
      (app?: FirebaseApp): FirebaseStorage;
      Storage: typeof FirebaseStorage
    }
  }
  interface FirebaseApp {
    storage?(): FirebaseStorage;
  }
}
