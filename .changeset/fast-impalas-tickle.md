---
"@firebase/firestore": patch
---

Fixed an issue that caused `DocumentReference`s in `DocumentSnapshot`s to be returned with the custom converter of the original `DocumentReference`. 
