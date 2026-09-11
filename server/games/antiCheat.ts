export interface SuspiciousActivityAlert {
  id: string;
  game: "crash" | "ludo";
  userId: string;
  userName: string;
  alertType: "SPEED_MANIPULATION" | "FAKE_DICE_CLAIM" | "INVALID_MULTIPLIER" | "RATE_LIMIT_EXCEEDED" | "DUPLICATE_ACTION";
  details: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
}

class AntiCheatEngine {
  private userActionTimestamps: Map<string, number[]> = new Map();
  private suspiciousAlerts: SuspiciousActivityAlert[] = [];
  private rateLimitWindowMs = 2000;
  private maxActionsPerWindow = 6;

  public checkRateLimit(userId: string, actionType: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const timestamps = this.userActionTimestamps.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < this.rateLimitWindowMs);

    if (recent.length >= this.maxActionsPerWindow) {
      this.recordAlert({
        game: actionType.startsWith("ludo") ? "ludo" : "crash",
        userId,
        userName: `User #${userId.slice(0, 8)}`,
        alertType: "RATE_LIMIT_EXCEEDED",
        details: `Rate limit triggered: ${recent.length} requests in ${this.rateLimitWindowMs}ms.`,
        severity: "medium",
      });
      return { allowed: false, reason: "Rate limit exceeded. Please slow down actions." };
    }

    recent.push(now);
    this.userActionTimestamps.set(userId, recent);
    return { allowed: true };
  }

  public recordAlert(alert: Omit<SuspiciousActivityAlert, "id" | "timestamp">) {
    const fullAlert: SuspiciousActivityAlert = {
      ...alert,
      id: `AC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: Date.now(),
    };
    this.suspiciousAlerts.unshift(fullAlert);
    if (this.suspiciousAlerts.length > 200) {
      this.suspiciousAlerts = this.suspiciousAlerts.slice(0, 200);
    }
  }

  public getSuspiciousAlerts(limit = 50): SuspiciousActivityAlert[] {
    return this.suspiciousAlerts.slice(0, limit);
  }

  public clearAlerts() {
    this.suspiciousAlerts = [];
  }
}

export const antiCheat = new AntiCheatEngine();
