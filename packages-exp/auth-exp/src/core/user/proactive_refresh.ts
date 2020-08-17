import { User } from '../../model/user';
import { AuthErrorCode } from '../errors';

// Refresh the token five minutes before expiration
export const _OFFSET_DURATION = 5 * 1000 * 60;

export const _RETRY_BACKOFF_MIN = 30 * 1000;
export const _RETRY_BACKOFF_MAX = 16 * 60 * 1000;

export class ProactiveRefresh {
  private isRunning = false;
  private timerId: number | null = null;
  private errorBackoff = _RETRY_BACKOFF_MIN;

  constructor(private readonly user: User) {}

  _start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.schedule();
  }

  _stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
    }
  }

  private getInterval(wasError: boolean): number {
    if (wasError) {
      const interval = this.errorBackoff;
      this.errorBackoff = Math.min(this.errorBackoff * 2, _RETRY_BACKOFF_MAX);
      return interval;
    } else {
      // Reset the error backoff
      this.errorBackoff = _RETRY_BACKOFF_MIN;
      const expTime = this.user.stsTokenManager.expirationTime ?? 0;
      const interval = expTime - Date.now() - _OFFSET_DURATION;
      return Math.max(0, interval);
    }
  }

  private schedule(wasError = false): void {
    if (!this.isRunning) {
      // Just in case...
      return;
    }

    this.timerId = window.setTimeout(async () => {
      await this.iteration();
    }, this.getInterval(wasError));
  }

  private async iteration(): Promise<void> {
    try {
      await this.user.getIdToken(true);
    } catch (e) {
      // Only retry on network errors
      if (e.code === `auth/${AuthErrorCode.NETWORK_REQUEST_FAILED}`) {
        this.schedule(/* wasError */ true);
      }
      return;
    }
    this.schedule();
  }
}