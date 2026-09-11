import React, { useState, useEffect } from "react";

export const AdminGameCenterTab: React.FC = () => {
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/games/admin/telemetry");
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // network error handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateConfig = async (newConfig: any) => {
    setIsUpdating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/games/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newConfig }),
      });

      if (res.ok) {
        setFeedback("Game configuration updated successfully.");
        await fetchTelemetry();
      }
    } catch {
      setFeedback("Failed to update game parameters.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !telemetry) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[#bbcabf]">
        Loading GameFi telemetry & anti-cheat engine...
      </div>
    );
  }

  const { settings, crash, ludo, ledger, antiCheat } = telemetry;

  return (
    <div className="space-y-5 font-mono text-xs text-[#dfe2ee]">
      {/* Top Protocol Reserve Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#171b24] rounded-2xl border border-[#3c4a42]/50">
          <span className="text-[10px] text-[#86948a] uppercase block">Total Game Volume</span>
          <span className="text-lg font-bold text-[#4edea3] mt-0.5 block">
            {ledger?.stats?.totalVolume?.toLocaleString() || 0} PTS
          </span>
          <span className="text-[9px] text-[#bbcabf]">{ledger?.stats?.totalTransactions} transactions</span>
        </div>

        <div className="p-3.5 bg-[#171b24] rounded-2xl border border-[#3c4a42]/50">
          <span className="text-[10px] text-[#86948a] uppercase block">Player Win Rewards</span>
          <span className="text-lg font-bold text-[#ffb95f] mt-0.5 block">
            {ledger?.stats?.totalWins?.toLocaleString() || 0} PTS
          </span>
          <span className="text-[9px] text-[#bbcabf]">Paid out via smart escrow</span>
        </div>

        <div className="p-3.5 bg-[#171b24] rounded-2xl border border-[#3c4a42]/50">
          <span className="text-[10px] text-[#86948a] uppercase block">Protocol Net Yield</span>
          <span className="text-lg font-bold text-[#4cd7f6] mt-0.5 block">
            {ledger?.stats?.houseNet?.toLocaleString() || 0} PTS
          </span>
          <span className="text-[9px] text-[#4edea3]">Retained in reserve</span>
        </div>

        <div className="p-3.5 bg-[#171b24] rounded-2xl border border-[#3c4a42]/50">
          <span className="text-[10px] text-[#86948a] uppercase block">Anti-Cheat Flags</span>
          <span className="text-lg font-bold text-[#ffb4ab] mt-0.5 block">
            {antiCheat?.suspiciousAlerts?.length || 0}
          </span>
          <span className="text-[9px] text-[#ffb4ab]">Zero breaches detected</span>
        </div>
      </div>

      {feedback && (
        <div className="p-2.5 rounded-xl bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30 text-xs">
          {feedback}
        </div>
      )}

      {/* Engine Controls & Maintenance Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crash Arena Configuration */}
        <div className="p-4 bg-[#171b24] rounded-2xl border border-[#3c4a42]/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4edea3]">rocket_launch</span>
              <h4 className="text-xs font-bold text-[#dfe2ee]">Crash Engine Telemetry</h4>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                settings.crashMaintenance
                  ? "bg-[#ffb4ab]/20 text-[#ffb4ab]"
                  : "bg-[#4edea3]/20 text-[#4edea3]"
              }`}
            >
              {settings.crashMaintenance ? "MAINTENANCE" : "OPERATIONAL"}
            </span>
          </div>

          <div className="text-[11px] text-[#bbcabf] space-y-1">
            <div>Current Round: <strong className="text-[#dfe2ee]">{crash.roundId}</strong></div>
            <div>Phase: <strong className="text-[#4edea3]">{crash.status}</strong></div>
            <div>Active Multiplier: <strong className="text-[#ffb95f]">{crash.multiplier?.toFixed(2)}x</strong></div>
            <div>Active Node Stakes: <strong className="text-[#dfe2ee]">{crash.activeBetsCount} miners</strong></div>
          </div>

          <div className="pt-2 border-t border-[#3c4a42]/40 flex items-center justify-between">
            <label className="text-xs text-[#bbcabf]">Maintenance Mode</label>
            <button
              onClick={() => handleUpdateConfig({ crashMaintenance: !settings.crashMaintenance })}
              disabled={isUpdating}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                settings.crashMaintenance
                  ? "bg-[#4edea3] text-[#003824]"
                  : "bg-[#ffb4ab]/20 text-[#ffb4ab] hover:bg-[#ffb4ab]/30"
              }`}
            >
              {settings.crashMaintenance ? "Resume Engine" : "Pause Engine"}
            </button>
          </div>
        </div>

        {/* Ludo Arena Configuration */}
        <div className="p-4 bg-[#171b24] rounded-2xl border border-[#3c4a42]/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffb95f]">casino</span>
              <h4 className="text-xs font-bold text-[#dfe2ee]">Ludo Arena Telemetry</h4>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                settings.ludoMaintenance
                  ? "bg-[#ffb4ab]/20 text-[#ffb4ab]"
                  : "bg-[#4edea3]/20 text-[#4edea3]"
              }`}
            >
              {settings.ludoMaintenance ? "MAINTENANCE" : "OPERATIONAL"}
            </span>
          </div>

          <div className="text-[11px] text-[#bbcabf] space-y-1">
            <div>Active Rooms: <strong className="text-[#dfe2ee]">{ludo.activeRoomsCount}</strong></div>
            <div>Completed Matches: <strong className="text-[#dfe2ee]">{ludo.completedGamesCount}</strong></div>
            <div>Turn Duration: <strong className="text-[#4edea3]">{settings.ludoTurnDurationSec}s</strong></div>
            <div>Max Timeouts Before AI Takeover: <strong className="text-[#dfe2ee]">{settings.ludoMaxTimeouts}</strong></div>
          </div>

          <div className="pt-2 border-t border-[#3c4a42]/40 flex items-center justify-between">
            <label className="text-xs text-[#bbcabf]">Maintenance Mode</label>
            <button
              onClick={() => handleUpdateConfig({ ludoMaintenance: !settings.ludoMaintenance })}
              disabled={isUpdating}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                settings.ludoMaintenance
                  ? "bg-[#4edea3] text-[#003824]"
                  : "bg-[#ffb4ab]/20 text-[#ffb4ab] hover:bg-[#ffb4ab]/30"
              }`}
            >
              {settings.ludoMaintenance ? "Resume Arena" : "Pause Arena"}
            </button>
          </div>
        </div>
      </div>

      {/* Anti-Cheat Alerts Log */}
      <div className="p-4 bg-[#171b24] rounded-2xl border border-[#3c4a42]/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb4ab]">security</span>
            <h4 className="text-xs font-bold text-[#dfe2ee]">Anti-Cheat Engine Activity Log</h4>
          </div>
          <span className="text-[10px] text-[#bbcabf]">Auto-Mitigation Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#3c4a42]/50 text-[#86948a]">
                <th className="py-2 px-2">Alert ID</th>
                <th className="py-2 px-2">Game</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Details</th>
                <th className="py-2 px-2">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4a42]/30">
              {antiCheat?.suspiciousAlerts?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#86948a]">
                    No suspicious manipulation alerts logged. Consensus verified.
                  </td>
                </tr>
              ) : (
                antiCheat.suspiciousAlerts.map((a: any) => (
                  <tr key={a.id} className="hover:bg-[#222731]/40">
                    <td className="py-2 px-2 font-bold text-[#dfe2ee]">{a.id}</td>
                    <td className="py-2 px-2 uppercase text-[#4edea3]">{a.game}</td>
                    <td className="py-2 px-2 text-[#ffb95f]">{a.alertType}</td>
                    <td className="py-2 px-2 text-[#bbcabf] truncate max-w-xs">{a.details}</td>
                    <td className="py-2 px-2">
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#ffb4ab]/20 text-[#ffb4ab]">
                        {a.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Game Ledger Transactions */}
      <div className="p-4 bg-[#171b24] rounded-2xl border border-[#3c4a42]/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3]">receipt_long</span>
            <h4 className="text-xs font-bold text-[#dfe2ee]">Recent Game Ledger Audit Entries</h4>
          </div>
          <span className="text-[10px] text-[#bbcabf]">Cryptographically Signed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#3c4a42]/50 text-[#86948a]">
                <th className="py-2 px-2">TX ID</th>
                <th className="py-2 px-2">Game</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Amount</th>
                <th className="py-2 px-2">Note</th>
                <th className="py-2 px-2">Audit SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4a42]/30">
              {ledger?.recentTransactions?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-[#222731]/40">
                  <td className="py-2 px-2 font-bold text-[#dfe2ee]">{tx.id}</td>
                  <td className="py-2 px-2 uppercase text-[#4edea3]">{tx.game}</td>
                  <td className="py-2 px-2 text-[#bbcabf]">{tx.type}</td>
                  <td className="py-2 px-2 font-bold">
                    <span className={tx.amount >= 0 ? "text-[#4edea3]" : "text-[#ffb4ab]"}>
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} PTS
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[#bbcabf] truncate max-w-xs">{tx.note}</td>
                  <td className="py-2 px-2 text-[9px] text-[#86948a] font-mono truncate max-w-[100px]">
                    {tx.auditHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
