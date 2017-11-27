import { FirebaseApp, FirebaseNamespace } from "@firebase/app-types";
import { Observer, Unsubscribe } from "@firebase/util";

export class FirebaseMessaging {
  constructor();

  deleteToken(token: string): Promise<any> | null;
  getToken(): Promise<any> | null;
  onMessage(
    nextOrObserver: Observer<any, any> | ((a: Object) => any),
    onError?: (error: any) => any,
    onComplete?: () => any
  ): Unsubscribe;
  onTokenRefresh(
    nextOrObserver: Observer<any, any> | ((a: Object) => any),
    onError?: (error: any) => any,
    onComplete?: () => any
  ): Unsubscribe;
  requestPermission(): Promise<any> | null;
  setBackgroundMessageHandler(callback: (a: Object) => any): any;
  useServiceWorker(registration: any): any;
}
