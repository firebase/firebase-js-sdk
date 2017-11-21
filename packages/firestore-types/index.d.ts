import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";

export class FirebaseFirestore {
  constructor();
}

declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    firestore?: {
      (app?: FirebaseApp): FirebaseFirestore;
      Firestore: typeof FirebaseFirestore
    }
  }
  interface FirebaseApp {
    firestore?(): FirebaseFirestore;
  }
}
