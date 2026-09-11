// MSDQ Network GameFi - Authoritative Real-Time Document Listener & State Synchronization Manager
// Refactored to check for existing active sessions in Firebase on reconnection
// before initializing new listeners, ensuring players resume their previous game state
// rather than creating new round instances.

import {
  checkActiveSessionInFirebase,
  saveActiveSessionToFirebase,
  clearActiveSessionInFirebase,
  GameSession,
} from "./firebase";

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "offline";
export type { GameSession };

interface ChannelSubscription<T> {
  key: string;
  listeners: Set<(data: T) => void>;
  statusListeners: Set<(status: ConnectionStatus) => void>;
  eventSource: EventSource | null;
  abortController: AbortController | null;
  pollingTimer: any | null;
  status: ConnectionStatus;
  lastData: T | null;
  inFlight: boolean;
  syncFn: () => void;
  cleanupFn: () => void;
}

class GameSyncManager {
  private channels: Map<string, ChannelSubscription<any>> = new Map();
  private globalListenersAttached = false;
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  private sessionResumptionListeners: Set<(session: GameSession) => void> = new Set();
  private registeredUserIds: Set<string> = new Set();

  constructor() {
    this.ensureGlobalListeners();
  }

  // Idempotent global network & document lifecycle listeners (never duplicated)
  private ensureGlobalListeners() {
    if (this.globalListenersAttached || typeof window === "undefined") return;

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.globalListenersAttached = true;
  }

  private handleOnline = async () => {
    this.isOnline = true;

    // 1. Check for existing active sessions in Firebase on reconnection BEFORE initializing listeners
    // Ensures players resume their previous game state rather than creating new round instances.
    for (const userId of this.registeredUserIds) {
      try {
        const ludoCheck = await this.checkAndResumeActiveSession(userId, "ludo");
        if (ludoCheck.hasActiveSession && ludoCheck.session) {
          this.notifySessionResumed(ludoCheck.session);
        }
        const crashCheck = await this.checkAndResumeActiveSession(userId, "crash");
        if (crashCheck.hasActiveSession && crashCheck.session) {
          this.notifySessionResumed(crashCheck.session);
        }
      } catch (err) {
        console.warn("Reconnection session verification warning:", err);
      }
    }

    // 2. Synchronize active channels with updated states
    for (const channel of this.channels.values()) {
      channel.status = "reconnecting";
      channel.statusListeners.forEach((cb) => cb("reconnecting"));
      channel.syncFn();
    }
  };

  private handleOffline = () => {
    this.isOnline = false;
    for (const channel of this.channels.values()) {
      channel.status = "offline";
      channel.statusListeners.forEach((cb) => cb("offline"));
    }
  };

  private handleVisibilityChange = async () => {
    if (document.visibilityState === "visible" && this.isOnline) {
      // Check active sessions on tab focus restoration
      for (const userId of this.registeredUserIds) {
        try {
          const ludoCheck = await this.checkAndResumeActiveSession(userId, "ludo");
          if (ludoCheck.hasActiveSession && ludoCheck.session) {
            this.notifySessionResumed(ludoCheck.session);
          }
        } catch {}
      }

      // Refresh active document channels when tab returns to foreground
      for (const channel of this.channels.values()) {
        channel.syncFn();
      }
    }
  };

  /**
   * Subscribe to session resumption events.
   * Allows modules (like LudoGameModule) to restore their active room when an active session is resumed.
   */
  public onSessionResumed(listener: (session: GameSession) => void): () => void {
    this.sessionResumptionListeners.add(listener);
    return () => {
      this.sessionResumptionListeners.delete(listener);
    };
  }

  private notifySessionResumed(session: GameSession) {
    for (const listener of this.sessionResumptionListeners) {
      try {
        listener(session);
      } catch (err) {
        console.warn("Error notifying session resumption listener:", err);
      }
    }
  }

  /**
   * Check for existing active session in Firebase before initializing listeners or creating new rounds.
   * Returns active game state for seamless resumption.
   */
  public async checkAndResumeActiveSession(
    userId: string,
    gameType: "ludo" | "crash"
  ): Promise<{
    hasActiveSession: boolean;
    session: GameSession | null;
    activeRoom?: any;
    activeBet?: any;
  }> {
    if (!userId) {
      return { hasActiveSession: false, session: null };
    }

    this.registeredUserIds.add(userId);

    // 1. Check Firebase Firestore first for persisted session state
    let fbSession: GameSession | null = null;
    try {
      fbSession = await checkActiveSessionInFirebase(userId, gameType);
    } catch (err) {
      console.warn("Firebase active session check encountered error:", err);
    }

    // 2. Query authoritative game server to verify ongoing round/match
    try {
      const res = await fetch(`/api/games/active-session?userId=${encodeURIComponent(userId)}&gameType=${gameType}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hasActiveSession) {
          const activeRoom = data.activeLudoRoom;
          const activeBet = data.activeCrashBet;

          const session: GameSession = {
            id: `${userId}_${gameType}`,
            userId,
            userName: activeRoom?.myPlayer?.name || fbSession?.userName || "Player",
            gameType,
            status: "ACTIVE",
            roomId: activeRoom?.id || fbSession?.roomId,
            roomCode: activeRoom?.code || fbSession?.roomCode,
            roundId: activeBet?.roundId || fbSession?.roundId,
            stake: activeRoom?.entryFee || activeBet?.bet?.amount || fbSession?.stake,
            lastActiveAt: Date.now(),
          };

          // Save active state to Firebase
          await saveActiveSessionToFirebase(session).catch(() => {});

          return {
            hasActiveSession: true,
            session,
            activeRoom,
            activeBet,
          };
        }
      }
    } catch (err) {
      console.warn("Authoritative session check error:", err);
    }

    // 3. If Firebase session exists and is ACTIVE, attempt recovery
    if (fbSession && fbSession.status === "ACTIVE") {
      // If room still exists on server, fetch it
      if (gameType === "ludo" && fbSession.roomId) {
        try {
          const roomRes = await fetch(`/api/games/ludo/room/${fbSession.roomId}?userId=${encodeURIComponent(userId)}`);
          if (roomRes.ok) {
            const activeRoom = await roomRes.json();
            if (activeRoom && activeRoom.status !== "COMPLETED") {
              return {
                hasActiveSession: true,
                session: fbSession,
                activeRoom,
              };
            }
          }
        } catch {}
      }

      return {
        hasActiveSession: true,
        session: fbSession,
      };
    }

    return { hasActiveSession: false, session: null };
  }

  /**
   * Persist active session state to Firebase.
   */
  public async recordSession(session: GameSession): Promise<boolean> {
    if (session.userId) {
      this.registeredUserIds.add(session.userId);
    }
    return saveActiveSessionToFirebase(session);
  }

  /**
   * Terminate active session in Firebase when match concludes.
   */
  public async clearSession(userId: string, gameType: "ludo" | "crash"): Promise<void> {
    return clearActiveSessionInFirebase(userId, gameType, "COMPLETED");
  }

  /**
   * Subscribe to real-time Crash game state.
   * If a subscription for the given userId already exists, it shares the listener
   * instead of creating a duplicate network stream or timer.
   */
  public subscribeToCrashState(
    userId: string,
    onData: (state: any) => void,
    onStatusChange?: (status: ConnectionStatus) => void
  ): () => void {
    if (userId) this.registeredUserIds.add(userId);
    const channelKey = `crash:state:${userId || "anon"}`;
    return this.subscribeChannel<any>(
      channelKey,
      onData,
      onStatusChange,
      (channel) => this.initCrashStream(channel, userId)
    );
  }

  /**
   * Subscribe to real-time Ludo room state.
   * Cleans up cleanly on room exit or component unmount.
   */
  public subscribeToLudoRoom(
    roomId: string,
    userId: string,
    onData: (state: any) => void,
    onStatusChange?: (status: ConnectionStatus) => void
  ): () => void {
    if (userId) this.registeredUserIds.add(userId);
    const channelKey = `ludo:room:${roomId}:${userId || "anon"}`;
    return this.subscribeChannel<any>(
      channelKey,
      onData,
      onStatusChange,
      (channel) => this.initLudoRoomStream(channel, roomId, userId)
    );
  }

  /**
   * Subscribe to Ludo lobby data (active public rooms, leaderboards, match history).
   */
  public subscribeToLudoLobby(
    onData: (data: { rooms: any[]; leaderboards: any; history: any[] }) => void,
    onStatusChange?: (status: ConnectionStatus) => void
  ): () => void {
    const channelKey = "ludo:lobby";
    return this.subscribeChannel(
      channelKey,
      onData,
      onStatusChange,
      (channel) => this.initLudoLobbyPolling(channel)
    );
  }

  /**
   * Core channel subscription manager:
   * Guarantees de-duplication, ref-counting, and immediate cleanup when all listeners unmount.
   */
  private subscribeChannel<T>(
    channelKey: string,
    onData: (data: T) => void,
    onStatusChange: ((status: ConnectionStatus) => void) | undefined,
    initializer: (channel: ChannelSubscription<T>) => void
  ): () => void {
    this.ensureGlobalListeners();

    let channel = this.channels.get(channelKey) as ChannelSubscription<T> | undefined;

    if (!channel) {
      // Create new channel subscription
      channel = {
        key: channelKey,
        listeners: new Set(),
        statusListeners: new Set(),
        eventSource: null,
        abortController: null,
        pollingTimer: null,
        status: this.isOnline ? "connecting" : "offline",
        lastData: null,
        inFlight: false,
        syncFn: () => {},
        cleanupFn: () => {},
      };

      this.channels.set(channelKey, channel);
      initializer(channel);
    }

    // Add listener
    channel.listeners.add(onData);
    if (onStatusChange) {
      channel.statusListeners.add(onStatusChange);
      onStatusChange(channel.status);
    }

    // Deliver cached snapshot immediately if available
    if (channel.lastData !== null) {
      try {
        onData(channel.lastData);
      } catch {
        // Listener error recovery
      }
    }

    // Return unmount / cleanup handler
    return () => {
      const activeChannel = this.channels.get(channelKey);
      if (!activeChannel) return;

      activeChannel.listeners.delete(onData);
      if (onStatusChange) {
        activeChannel.statusListeners.delete(onStatusChange);
      }

      // If zero listeners remain for this document, completely tear down to prevent memory leaks!
      if (activeChannel.listeners.size === 0) {
        try {
          activeChannel.cleanupFn();
        } catch {
          // Cleanup error recovery
        }
        this.channels.delete(channelKey);
      }
    };
  }

  // --- Stream / Polling Initializers ---

  private initCrashStream(channel: ChannelSubscription<any>, userId: string) {
    // 1. Try Server-Sent Events (SSE) for zero-latency, push-based updates
    if (typeof EventSource !== "undefined") {
      try {
        const streamUrl = `/api/games/crash/stream?userId=${encodeURIComponent(userId)}`;
        const es = new EventSource(streamUrl);
        channel.eventSource = es;

        es.onopen = () => {
          channel.status = "connected";
          channel.statusListeners.forEach((cb) => cb("connected"));
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            channel.lastData = data;
            channel.listeners.forEach((cb) => cb(data));
          } catch {
            // Parse error recovery
          }
        };

        es.onerror = () => {
          // SSE connection dropped; transition to reconnecting
          if (channel.status === "connected") {
            channel.status = "reconnecting";
            channel.statusListeners.forEach((cb) => cb("reconnecting"));
          }
        };
      } catch {}
    }

    // 2. High-frequency abortable polling fallback
    const doFetch = async () => {
      if (channel.inFlight || !this.isOnline) return;

      if (channel.abortController) {
        channel.abortController.abort();
      }

      channel.abortController = new AbortController();
      channel.inFlight = true;

      try {
        const res = await fetch(`/api/games/crash/state?userId=${encodeURIComponent(userId)}`, {
          signal: channel.abortController.signal,
        });

        if (res.ok) {
          const data = await res.json();
          channel.lastData = data;
          channel.status = "connected";
          channel.statusListeners.forEach((cb) => cb("connected"));
          channel.listeners.forEach((cb) => cb(data));
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          if (this.isOnline && channel.status === "connected") {
            channel.status = "reconnecting";
            channel.statusListeners.forEach((cb) => cb("reconnecting"));
          }
        }
      } finally {
        channel.inFlight = false;
      }
    };

    channel.syncFn = () => {
      doFetch();
    };

    // Polling interval: 180ms
    const interval = setInterval(doFetch, 180);
    channel.pollingTimer = interval;

    // Initial immediate snapshot
    doFetch();

    channel.cleanupFn = () => {
      if (channel.eventSource) {
        channel.eventSource.close();
        channel.eventSource = null;
      }
      if (channel.pollingTimer) {
        clearInterval(channel.pollingTimer);
        channel.pollingTimer = null;
      }
      if (channel.abortController) {
        channel.abortController.abort();
        channel.abortController = null;
      }
    };
  }

  private initLudoRoomStream(channel: ChannelSubscription<any>, roomId: string, userId: string) {
    if (typeof EventSource !== "undefined") {
      try {
        const streamUrl = `/api/games/ludo/room/${encodeURIComponent(roomId)}/stream?userId=${encodeURIComponent(userId)}`;
        const es = new EventSource(streamUrl);
        channel.eventSource = es;

        es.onopen = () => {
          channel.status = "connected";
          channel.statusListeners.forEach((cb) => cb("connected"));
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            channel.lastData = data;
            channel.listeners.forEach((cb) => cb(data));
          } catch {}
        };

        es.onerror = () => {
          if (channel.status === "connected") {
            channel.status = "reconnecting";
            channel.statusListeners.forEach((cb) => cb("reconnecting"));
          }
        };
      } catch {}
    }

    const doFetch = async () => {
      if (channel.inFlight || !this.isOnline) return;

      if (channel.abortController) {
        channel.abortController.abort();
      }

      channel.abortController = new AbortController();
      channel.inFlight = true;

      try {
        const res = await fetch(`/api/games/ludo/room/${encodeURIComponent(roomId)}?userId=${encodeURIComponent(userId)}`, {
          signal: channel.abortController.signal,
        });

        if (res.ok) {
          const data = await res.json();
          channel.lastData = data;
          channel.status = "connected";
          channel.statusListeners.forEach((cb) => cb("connected"));
          channel.listeners.forEach((cb) => cb(data));
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && this.isOnline && channel.status === "connected") {
          channel.status = "reconnecting";
          channel.statusListeners.forEach((cb) => cb("reconnecting"));
        }
      } finally {
        channel.inFlight = false;
      }
    };

    channel.syncFn = () => {
      doFetch();
    };

    const interval = setInterval(doFetch, 750);
    channel.pollingTimer = interval;

    doFetch();

    channel.cleanupFn = () => {
      if (channel.eventSource) {
        channel.eventSource.close();
        channel.eventSource = null;
      }
      if (channel.pollingTimer) {
        clearInterval(channel.pollingTimer);
        channel.pollingTimer = null;
      }
      if (channel.abortController) {
        channel.abortController.abort();
        channel.abortController = null;
      }
    };
  }

  private initLudoLobbyPolling(channel: ChannelSubscription<any>) {
    const doFetch = async () => {
      if (channel.inFlight || !this.isOnline) return;

      if (channel.abortController) {
        channel.abortController.abort();
      }

      channel.abortController = new AbortController();
      channel.inFlight = true;

      try {
        const [roomsRes, lbRes, histRes] = await Promise.all([
          fetch("/api/games/ludo/rooms", { signal: channel.abortController.signal }),
          fetch("/api/games/ludo/leaderboards", { signal: channel.abortController.signal }),
          fetch("/api/games/ludo/history", { signal: channel.abortController.signal }),
        ]);

        if (roomsRes.ok && lbRes.ok && histRes.ok) {
          const [rData, lData, hData] = await Promise.all([
            roomsRes.json(),
            lbRes.json(),
            histRes.json(),
          ]);

          const payload = {
            rooms: rData.rooms || [],
            leaderboards: lData || null,
            history: hData.history || [],
          };

          channel.lastData = payload;
          channel.status = "connected";
          channel.statusListeners.forEach((cb) => cb("connected"));
          channel.listeners.forEach((cb) => cb(payload));
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && this.isOnline && channel.status === "connected") {
          channel.status = "reconnecting";
          channel.statusListeners.forEach((cb) => cb("reconnecting"));
        }
      } finally {
        channel.inFlight = false;
      }
    };

    channel.syncFn = () => {
      doFetch();
    };

    const interval = setInterval(doFetch, 4000);
    channel.pollingTimer = interval;

    doFetch();

    channel.cleanupFn = () => {
      if (channel.pollingTimer) {
        clearInterval(channel.pollingTimer);
        channel.pollingTimer = null;
      }
      if (channel.abortController) {
        channel.abortController.abort();
        channel.abortController = null;
      }
    };
  }
}

export const gameSyncManager = new GameSyncManager();
