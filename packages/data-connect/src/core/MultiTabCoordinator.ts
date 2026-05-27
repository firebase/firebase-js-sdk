/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PersistentCacheProvider } from '../cache/IndexedDbCacheProvider';

export interface ServerRequestMessage {
  type: 'Server Request';
  requestID: string;
  requestType: 'execute' | 'subscribe' | 'unsubscribe';
  queryRef: any;
  followerId: string;
}

export interface ServerResponseMessage {
  type: 'Server Response';
  requestID: string;
  queryRef: any;
  leaderId: string;
  result?: any;
  error?: any;
}

export interface CacheUpdateMessage {
  type: 'Cache Update';
  leaderId: string;
  updatedKeys: string[];
  fetchTime: number;
}

export interface LeaderUpdateMessage {
  type: 'Leader Update';
  oldLeaderId: string;
  newLeaderId: string;
}

type IpcMessage =
  | ServerRequestMessage
  | ServerResponseMessage
  | CacheUpdateMessage
  | LeaderUpdateMessage;

/**
 * MultiTabCoordinator orchestrates multi-tab elections, IPC routing, heartbeats, and subscription pruning.
 */
export class MultiTabCoordinator {
  private channel: BroadcastChannel | null = null;
  private clientId: string;
  private leaderId: string | null = null;
  private isLeaderState = false;

  private heartbeatInterval: any = null;
  private monitorInterval: any = null;
  private followerHeartbeatInterval: any = null;
  private sweepInterval: any = null;
  private lockReleaseFn: (() => void) | null = null;

  // Keep track of client-to-subscriptions map for Sweep routine on Leader
  private followerSubscriptions = new Map<string, Set<string>>();

  constructor(
    private readonly dbName: string,
    private readonly provider: PersistentCacheProvider,
    private readonly onLeaderChangeCb: (isLeader: boolean) => void,
    private readonly onServerRequestCb: (msg: ServerRequestMessage) => Promise<void>,
    private readonly onServerResponseCb: (msg: ServerResponseMessage) => void,
    private readonly onCacheUpdateCb: (msg: CacheUpdateMessage) => Promise<void>
  ) {
    this.clientId = Math.random().toString(36).substring(2, 15);
    this.provider.myClientId = this.clientId;
  }

  async init(): Promise<void> {
    // Enable BroadcastChannel for IPC communication
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`fdc_ipc_${this.dbName}`);
      this.channel.onmessage = (event) => this.handleIpcMessage(event.data);
    }

    // Standard elect queue and monitoring setup
    this.requestWebLockElection();
    this.startFollowerHeartbeat();
    this.startLeaderMonitoring();
  }

  get myClientId(): string {
    return this.clientId;
  }

  get isLeader(): boolean {
    return this.isLeaderState;
  }

  /**
   * Claims leadership Web Lock. Uses transactional lease validation on acquisition.
   */
  private requestWebLockElection(): void {
    if (typeof navigator === 'undefined' || !navigator.locks) {
      // Safe fallback in non-browser or restricted environments
      this.promoteToLeader();
      return;
    }

    navigator.locks.request(`fdc_leader_lock_${this.dbName}`, async (lock) => {
      const db = await this.getDb();
      const tx = db.transaction('metadata', 'readonly');
      const metadata = tx.objectStore('metadata');
      
      const currentLeaderId = await new Promise<string | undefined>((resolve) => {
        const req = metadata.get('leaderId');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });

      const lastHeartbeat = await new Promise<number | undefined>((resolve) => {
        const req = metadata.get('leaderHeartbeat');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });

      const now = Date.now();
      if (currentLeaderId && currentLeaderId !== this.clientId && lastHeartbeat && (now - lastHeartbeat <= 5000)) {
        // Another active Leader took over during the zombie lock acquisition period. Yield.
        return;
      }

      // Promote to Leader and hold the Web Lock
      await this.promoteToLeader();

      await new Promise<void>((resolve) => {
        this.lockReleaseFn = resolve;
      });
    }).catch(() => {
      // Fallback if locks fail
      this.promoteToLeader();
    });
  }

  private async promoteToLeader(): Promise<void> {
    this.isLeaderState = true;
    const oldLeader = this.leaderId || '';
    this.leaderId = this.clientId;

    // Persist leader election to IndexedDB
    const db = await this.getDb();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    store.put(this.clientId, 'leaderId');
    store.put(Date.now(), 'leaderHeartbeat');

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });

    // Notify all tabs that leadership has changed
    this.broadcastMessage({
      type: 'Leader Update',
      oldLeaderId: oldLeader,
      newLeaderId: this.clientId
    });

    this.onLeaderChangeCb(true);

    // Launch Leader heartbeat & sweep routines
    this.startLeaderHeartbeat();
    this.startOrphanSweep();
  }

  private startLeaderHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isLeaderState) {
        clearInterval(this.heartbeatInterval);
        return;
      }
      try {
        const db = await this.getDb();
        const tx = db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        store.put(Date.now(), 'leaderHeartbeat');
      } catch {
        // Disk write/quota errors should demote/prevent zombification
      }
    }, 4000);
  }

  /** @internal */
  async verifyLeaderHeartbeat(): Promise<void> {
    if (this.isLeaderState) {
      return;
    }
    try {
      const db = await this.getDb();
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');

      const lastHeartbeat = await new Promise<number | undefined>((resolve) => {
        const req = store.get('leaderHeartbeat');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });

      if (lastHeartbeat) {
        const now = Date.now();
        if (now - lastHeartbeat > 5000) {
          await this.attemptTransactionalLeadershipClaim();
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  private startLeaderMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    this.monitorInterval = setInterval(() => {
      this.verifyLeaderHeartbeat().catch(() => {});
    }, 4000);
  }

  private async attemptTransactionalLeadershipClaim(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');

    const lastHeartbeat = await new Promise<number | undefined>((resolve) => {
      const req = store.get('leaderHeartbeat');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    const now = Date.now();
    if (!lastHeartbeat || (now - lastHeartbeat > 5000)) {
      store.put(this.clientId, 'leaderId');
      store.put(now, 'leaderHeartbeat');

      tx.oncomplete = () => {
        // Successfully claimed in DB, align the Web Lock
        this.requestWebLockElection();
      };
    }
  }

  private startFollowerHeartbeat(): void {
    if (this.followerHeartbeatInterval) {
      clearInterval(this.followerHeartbeatInterval);
    }
    this.followerHeartbeatInterval = setInterval(async () => {
      if (this.isLeaderState) {
        return;
      }
      try {
        const db = await this.getDb();
        const tx = db.transaction('followerHeartbeats', 'readwrite');
        const store = tx.objectStore('followerHeartbeats');
        store.put({ clientId: this.clientId, lastActiveTimestamp: Date.now() });
      } catch {
        // Ignore disk/quota errors
      }
    }, 10000);
  }

  private startOrphanSweep(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
    this.sweepInterval = setInterval(async () => {
      if (!this.isLeaderState) {
        clearInterval(this.sweepInterval);
        return;
      }
      try {
        const db = await this.getDb();
        const tx = db.transaction(['followerHeartbeats'], 'readwrite');
        const store = tx.objectStore('followerHeartbeats');
        
        const allHeartbeats = await new Promise<any[]>((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        const now = Date.now();
        const deletePromises: Array<Promise<void>> = [];

        for (const record of allHeartbeats) {
          if (now - record.lastActiveTimestamp > 30000) {
            // Follower crashed or frozen, delete registered ID
            const deleteReq = store.delete(record.clientId);
            deletePromises.push(new Promise((resolve) => {
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => resolve();
            }));

            // Prune registered follower subscriptions
            this.pruneFollowerSubscriptions(record.clientId);
          }
        }
        await Promise.all(deletePromises);
      } catch {
        // Sweep failures should not crash background loop
      }
    }, 30000);
  }

  private pruneFollowerSubscriptions(followerId: string): void {
    const subs = this.followerSubscriptions.get(followerId);
    if (!subs) {
      return;
    }
    this.followerSubscriptions.delete(followerId);

    for (const key of subs) {
      // Decrement client references across other follower tabs.
      let stillHasActiveTabs = false;
      for (const [fid, activeKeys] of this.followerSubscriptions.entries()) {
        if (activeKeys.has(key)) {
          stillHasActiveTabs = true;
          break;
        }
      }
      if (!stillHasActiveTabs) {
        // Clean up orphaned stream on the leader side
        this.broadcastMessage({
          type: 'Server Request',
          requestID: 'orphan_cleanup',
          requestType: 'unsubscribe',
          queryRef: { serializedKey: key },
          followerId: followerId
        });
      }
    }
  }

  private handleIpcMessage(msg: IpcMessage): void {
    if (!msg || typeof msg !== 'object') {
      return;
    }

    if (this.isLeaderState) {
      if (msg.type === 'Server Request') {
        if (msg.followerId === this.clientId) {
          return; // Avoid processing self-routed messages
        }
        if (msg.requestType === 'subscribe') {
          let subs = this.followerSubscriptions.get(msg.followerId);
          if (!subs) {
            subs = new Set();
            this.followerSubscriptions.set(msg.followerId, subs);
          }
          subs.add(msg.queryRef.serializedKey || JSON.stringify(msg.queryRef));
        } else if (msg.requestType === 'unsubscribe') {
          const subs = this.followerSubscriptions.get(msg.followerId);
          if (subs) {
            subs.delete(msg.queryRef.serializedKey || JSON.stringify(msg.queryRef));
          }
        }
        this.onServerRequestCb(msg).catch(() => {});
      }
    } else {
      if (msg.type === 'Server Response') {
        this.onServerResponseCb(msg);
      } else if (msg.type === 'Cache Update') {
        this.onCacheUpdateCb(msg).catch(() => {});
      } else if (msg.type === 'Leader Update') {
        this.leaderId = msg.newLeaderId;
        this.onLeaderChangeCb(false);
      }
    }
  }

  broadcastMessage(msg: IpcMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // Ignore serialization/channel closed errors
      }
    }
  }

  private getDb(): Promise<IDBDatabase> {
    return (this.provider as any).openDb();
  }

  demote(): void {
    if (this.isLeaderState) {
      this.isLeaderState = false;
      this.leaderId = null;
      if (this.lockReleaseFn) {
        this.lockReleaseFn();
        this.lockReleaseFn = null;
      }
      this.onLeaderChangeCb(false);
    }
  }

  close(): void {
    this.demote();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    if (this.followerHeartbeatInterval) {
      clearInterval(this.followerHeartbeatInterval);
    }
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
