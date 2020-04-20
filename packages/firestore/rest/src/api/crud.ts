import {DocumentReference, FirebaseFirestore} from "./database";
import {DocumentSnapshot} from "../../../src/api/database";

export function initializeFirestore(
  firestore: FirebaseFirestore,
  settings: Settings
): Promise<void>;

export function getDocument(reference: DocumentReference) : Promise<DocumentSnapshot> {
  
}
