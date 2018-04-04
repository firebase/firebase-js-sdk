export interface TokenDetails {
  fcmToken: string;
  swScope: string;
  vapidKey: string | Uint8Array;
  subscription: PushSubscription;
  fcmSenderId: string;
  fcmPushSet: string;

  createTime?: number;
  endpoint?: string;
  auth?: string;
  p256dh?: string;
}
