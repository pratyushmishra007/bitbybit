import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserInfo {
  id: string;
  name: string;
  color: string;
}

// Helper functions for Base64 encoding/decoding binary data
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Yjs Provider using Supabase Realtime for sync
 * Uses Supabase broadcast channels to sync Y.Doc updates and awareness
 */
export class SupabaseProvider {
  private doc: Y.Doc;
  private awareness: Awareness;
  private channel: RealtimeChannel | null = null;
  private sessionId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private connected: boolean = false;
  private pendingUpdates: Uint8Array[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private isSynced: boolean = false;

  constructor(
    sessionId: string,
    doc: Y.Doc,
    user: { id: string; name: string }
  ) {
    this.sessionId = sessionId;
    this.doc = doc;
    this.userId = user.id;
    this.userName = user.name;
    this.userColor = this.generateUserColor(user.id);
    this.awareness = new Awareness(doc);

    // Set local awareness state
    this.awareness.setLocalState({
      user: {
        id: this.userId,
        name: this.userName,
        color: this.userColor,
      },
      cursor: null,
    });

    // Listen for local document changes
    this.doc.on('update', this.handleDocUpdate.bind(this));

    // Listen for awareness changes
    this.awareness.on('change', this.handleAwarenessChange.bind(this));

    // Connect to Supabase channel
    this.connect();
  }

  private generateUserColor(userId: string): string {
    // Generate consistent color based on user ID
    const colors = [
      '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#00BCD4', '#009688', '#4CAF50',
      '#FF9800', '#FF5722', '#795548', '#607D8B'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private async connect() {
    const channelName = `collab:${this.sessionId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive own broadcasts
          ack: true,   // Acknowledge reception
        },
      },
    });

    // Listen for document updates from other clients
    this.channel.on('broadcast', { event: 'doc-update' }, ({ payload }) => {
      if (payload.userId !== this.userId) {
        try {
          const update = base64ToUint8Array(payload.update);
          Y.applyUpdate(this.doc, update, 'remote');
          console.log('📥 Applied remote update from', payload.userId);
        } catch (error) {
          console.error('Error applying remote update:', error);
        }
      }
    });

    // Listen for awareness updates
    this.channel.on('broadcast', { event: 'awareness' }, ({ payload }) => {
      if (payload.userId !== this.userId) {
        try {
          const update = base64ToUint8Array(payload.update);
          applyAwarenessUpdate(this.awareness, update, 'remote');
        } catch (error) {
          console.error('Error applying awareness update:', error);
        }
      }
    });

    // Listen for sync requests (when new client joins)
    this.channel.on('broadcast', { event: 'sync-request' }, ({ payload }) => {
      if (payload.userId !== this.userId) {
        // Send full document state to the new client
        console.log('📤 Sync requested by', payload.userId);
        this.sendFullSync(payload.userId);
      }
    });

    // Listen for full sync response
    this.channel.on('broadcast', { event: 'sync-response' }, ({ payload }) => {
      if (payload.targetUserId === this.userId) {
        try {
          const update = base64ToUint8Array(payload.state);
          Y.applyUpdate(this.doc, update, 'remote');
          this.isSynced = true;
          console.log('📥 Applied full sync from', payload.userId);
        } catch (error) {
          console.error('Error applying sync response:', error);
        }
      }
    });

    // Subscribe to channel
    await this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.connected = true;
        console.log('✅ Connected to collaboration channel');

        // Request sync from other clients
        this.requestSync();

        // Send pending updates
        this.flushPendingUpdates();

        // Broadcast awareness
        this.broadcastAwareness();
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.connected = false;
        console.log('❌ Disconnected from collaboration channel');
      }
    });

    // Periodically broadcast awareness (for cursor positions)
    this.syncInterval = setInterval(() => {
      if (this.connected) {
        this.broadcastAwareness();
      }
    }, 3000);
  }

  private handleDocUpdate(update: Uint8Array, origin: unknown) {
    // Only broadcast updates originating locally
    if (origin !== 'remote') {
      if (this.connected) {
        this.broadcastUpdate(update);
      } else {
        // Queue update for later
        this.pendingUpdates.push(update);
      }
    }
  }

  private handleAwarenessChange() {
    if (this.connected) {
      this.broadcastAwareness();
    }
  }

  private async broadcastUpdate(update: Uint8Array) {
    if (!this.channel) return;

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'doc-update',
        payload: {
          userId: this.userId,
          update: uint8ArrayToBase64(update),
        },
      });
      console.log('📤 Broadcasted update');
    } catch (error) {
      console.error('Error broadcasting update:', error);
      this.pendingUpdates.push(update);
    }
  }

  private async broadcastAwareness() {
    if (!this.channel) return;

    try {
      const awarenessUpdate = encodeAwarenessUpdate(
        this.awareness,
        [this.awareness.clientID]
      );

      await this.channel.send({
        type: 'broadcast',
        event: 'awareness',
        payload: {
          userId: this.userId,
          update: uint8ArrayToBase64(awarenessUpdate),
        },
      });
    } catch (error) {
      console.error('Error broadcasting awareness:', error);
    }
  }

  private async requestSync() {
    if (!this.channel) return;

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'sync-request',
        payload: {
          userId: this.userId,
        },
      });
    } catch (error) {
      console.error('Error requesting sync:', error);
    }
  }

  private async sendFullSync(targetUserId: string) {
    if (!this.channel) return;

    try {
      const state = Y.encodeStateAsUpdate(this.doc);

      await this.channel.send({
        type: 'broadcast',
        event: 'sync-response',
        payload: {
          userId: this.userId,
          targetUserId,
          state: uint8ArrayToBase64(state),
        },
      });
      console.log('📤 Sent full sync to', targetUserId);
    } catch (error) {
      console.error('Error sending full sync:', error);
    }
  }

  private flushPendingUpdates() {
    while (this.pendingUpdates.length > 0) {
      const update = this.pendingUpdates.shift();
      if (update) {
        this.broadcastUpdate(update);
      }
    }
  }

  /**
   * Update cursor position in awareness
   */
  updateCursor(cursor: { line: number; column: number } | null) {
    const currentState = this.awareness.getLocalState() || {};
    this.awareness.setLocalState({
      ...currentState,
      cursor,
    });
  }

  /**
   * Get all remote awareness states (other users' cursors)
   */
  getRemoteStates(): Map<number, UserInfo & { cursor: { line: number; column: number } | null }> {
    const states = new Map();
    this.awareness.getStates().forEach((state, clientId) => {
      if (clientId !== this.awareness.clientID && state.user) {
        states.set(clientId, {
          ...state.user,
          cursor: state.cursor,
        });
      }
    });
    return states;
  }

  /**
   * Subscribe to awareness changes
   */
  onAwarenessChange(callback: () => void) {
    this.awareness.on('change', callback);
    return () => this.awareness.off('change', callback);
  }

  /**
   * Get the Yjs document
   */
  getDoc(): Y.Doc {
    return this.doc;
  }

  /**
   * Get awareness instance
   */
  getAwareness(): Awareness {
    return this.awareness;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect and cleanup
   */
  async destroy() {
    // Clear awareness
    this.awareness.setLocalState(null);

    // Clear interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Unsubscribe from channel
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.connected = false;
    console.log('🔌 Disconnected from collaboration');
  }
}
