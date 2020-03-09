import { FirebaseAppNext } from '@firebase/app-types/next';

export function storageInstanceKey(app: FirebaseAppNext, url?: string): string {
    return `${app.name}-${url}`;
}