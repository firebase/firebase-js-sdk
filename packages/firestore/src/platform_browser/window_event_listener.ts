import {OnlineState, TargetId, VisibilityState} from '../core/types';
import {ObjectMap} from '../util/obj_map';
import {Query} from '../core/query';
import {AsyncQueue} from '../util/async_queue';
import {SyncEngine} from '../core/sync_engine';
import {TabNotificationChannel} from '../local/web_storage';

export class WindowEventListener {
  constructor(private asyncQueue: AsyncQueue, private notificationChannel: TabNotificationChannel) {
  }

  register(): boolean {
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilityChange', () => {
        let visibility = VisibilityState.Unknown;

        if (window.document.visibilityState === 'visible') {
          visibility = VisibilityState.Foreground;
        } else if (window.document.visibilityState === 'hidden') {
          visibility = VisibilityState.Background;
        }

        this.asyncQueue.schedule(() => {
          this.notificationChannel.setVisibility(visibility);
          return Promise.resolve();
        });
      });
      return true;
    }

    return false;
  }
}
