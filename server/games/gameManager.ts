import { CrashEngine } from "./crashEngine.js";
import { LudoEngine } from "./ludoEngine.js";
import { gameLedger } from "./gameLedger.js";
import { antiCheat } from "./antiCheat.js";
import { GameSettings } from "./types.js";

const initialSettings: GameSettings = {
  crashMaintenance: false,
  ludoMaintenance: false,
  crashCountdownSec: 6,
  crashMinDurationSec: 2,
  crashMaxDurationSec: 45,
  crashHouseEdge: 0.03,
  ludoTurnDurationSec: 15,
  ludoMaxTimeouts: 3,
  ludoDefaultStakes: [25, 50, 100, 250],
  maxAutoCashout: 250,
  antiCheatRateLimit: 6,
};

export const crashEngine = new CrashEngine(initialSettings);
export const ludoEngine = new LudoEngine(initialSettings);
export { gameLedger, antiCheat };

export function updateGlobalGameSettings(newSettings: Partial<GameSettings>) {
  crashEngine.updateSettings(newSettings);
  ludoEngine.updateSettings(newSettings);
}

export function getGlobalGameSettings(): GameSettings {
  return crashEngine.getSettings();
}

export function getAdminGameTelemetry() {
  const settings = getGlobalGameSettings();
  const crashState = crashEngine.getAuthoritativeState();
  const ledgerStats = gameLedger.getStats();
  const recentTransactions = gameLedger.getRecentEntries(20);
  const suspiciousAlerts = antiCheat.getSuspiciousAlerts(20);
  const publicRooms = ludoEngine.getPublicRooms();
  const completedLudo = ludoEngine.getCompletedGames();

  return {
    settings,
    crash: {
      roundId: crashState.roundId,
      status: crashState.status,
      multiplier: crashState.currentMultiplier,
      activeBetsCount: crashState.activeBets.length,
      recentHistory: crashState.recentHistory,
      houseEdge: settings.crashHouseEdge,
      isMaintenance: settings.crashMaintenance,
    },
    ludo: {
      activeRoomsCount: publicRooms.length,
      rooms: publicRooms,
      completedGamesCount: completedLudo.length,
      isMaintenance: settings.ludoMaintenance,
    },
    ledger: {
      stats: ledgerStats,
      recentTransactions,
    },
    antiCheat: {
      suspiciousAlerts,
    },
  };
}
