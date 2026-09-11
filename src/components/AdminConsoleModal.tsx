import React, { useState } from "react";
import { AuditLog, EnclaveUser, Transaction, Announcement, AppNotification, GameConfig } from "../types";
import { SecurityHealthModule } from "./SecurityHealthModule";
import { AdminGameCenterTab } from "./games/AdminGameCenterTab";
import {
  AdminPtsConversionTab,
  AdminLiveGamesTab,
  AdminAnnouncementsTab,
  AdminNotificationsTab,
  AdminKycManagementTab,
  KycRecord,
} from "./admin/AdminExpandedTabs";

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  enclaveUsers: EnclaveUser[];
  onAddAuditLog: (log: AuditLog) => void;
  onUpdateUserStatus: (userId: string, status: "Active" | "Frozen" | "Flagged") => void;
  onAdjustUserBalance: (userId: string, delta: number) => void;
  baseMiningRate: number;
  onUpdateBaseMiningRate: (rate: number) => void;
  transactions?: Transaction[];
  onUpdateAuditLogStatus?: (logId: string, status: "pending" | "investigating" | "resolved") => void;
  conversionRate?: number;
  onUpdateConversionRate?: (rate: number) => void;
  msdqToPtsRate?: number;
  onUpdateMsdqToPtsRate?: (rate: number) => void;
  announcements?: Announcement[];
  onAddAnnouncement?: (announcement: Announcement) => void;
  onToggleAnnouncement?: (id: string) => void;
  onSendNotification?: (notif: AppNotification) => void;
  gameConfigs?: GameConfig[];
  onToggleGame?: (gameId: string) => void;
  onUpdateGameLimits?: (gameId: string, minBet: number, maxBet: number) => void;
  kycApplications?: KycRecord[];
  onReviewKyc?: (
    kycId: string,
    userId: string,
    status: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION",
    notes: string
  ) => void;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  enclaveUsers,
  onAddAuditLog,
  onUpdateUserStatus,
  onAdjustUserBalance,
  baseMiningRate,
  onUpdateBaseMiningRate,
  transactions = [],
  onUpdateAuditLogStatus,
  conversionRate = 100,
  onUpdateConversionRate = (_rate: number) => {},
  msdqToPtsRate = 90,
  onUpdateMsdqToPtsRate = (_rate: number) => {},
  announcements = [],
  onAddAnnouncement = () => {},
  onToggleAnnouncement = () => {},
  onSendNotification = () => {},
  gameConfigs = [],
  onToggleGame = () => {},
  onUpdateGameLimits = () => {},
  kycApplications = [],
  onReviewKyc = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "conversion"
    | "kyc"
    | "livegames"
    | "announcements"
    | "notifications"
    | "security"
    | "gamecenter"
    | "mining"
    | "multisig"
    | "ads"
    | "users"
    | "logs"
  >("overview");

  const [safeModeEnabled, setSafeModeEnabled] = useState(false);
  const [targetBlock, setTargetBlock] = useState(1500000);
  const [halvingCutPercent, setHalvingCutPercent] = useState(50);
  const [localBaseRate, setLocalBaseRate] = useState(baseMiningRate);
  const [antiBotDifficulty, setAntiBotDifficulty] = useState<"Low" | "Medium" | "High">("Medium");

  // Ad Mediation States
  const [admobActive, setAdmobActive] = useState(true);
  const [applovinActive, setApplovinActive] = useState(true);
  const [unityActive, setUnityActive] = useState(false);
  const [streamPayout, setStreamPayout] = useState(5);

  // User Search & Balance Modal
  const [searchUser, setSearchUser] = useState("");
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<EnclaveUser | null>(null);
  const [balanceAdjustmentAmount, setBalanceAdjustmentAmount] = useState<string>("500");

  // Audit Logs Filter
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");

  if (!isOpen) return null;

  const handleCommitMiningParams = () => {
    onUpdateBaseMiningRate(localBaseRate);
    onAddAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType: "HALVING_EMISSION",
      severity: "warning",
      details: `Admin adjusted Base Velocity to ${localBaseRate.toFixed(2)} MSDQ/hr, Target Block #${targetBlock.toLocaleString()}`,
      nodeSource: "Admin Console v2.4",
    });
    alert("Protocol Parameters Committed to Consensus Daemon.");
  };

  const handleApplyBalanceAdjustment = () => {
    if (!selectedUserForBalance) return;
    const delta = parseFloat(balanceAdjustmentAmount);
    if (!isNaN(delta)) {
      onAdjustUserBalance(selectedUserForBalance.id, delta);
      onAddAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString() + " UTC",
        eventType: "SECURITY_ENCLAVE",
        severity: "critical",
        details: `Manual balance adjustment of ${delta > 0 ? "+" : ""}${delta} MSDQ applied to Node ${selectedUserForBalance.walletAddress}`,
        nodeSource: "Admin Console v2.4",
      });
    }
    setSelectedUserForBalance(null);
  };

  const filteredUsers = enclaveUsers.filter(
    (u) =>
      u.walletAddress.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.tier.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSeverity = logSeverityFilter === "all" || log.severity === logSeverityFilter;
    const matchesSearch =
      log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.eventType.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.nodeSource.toLowerCase().includes(logSearch.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Calculate live quick risk score for badges and telemetry banner
  const quickPendingLogs = auditLogs.filter(
    (l) => l.status === "pending" || (!l.status && (l.severity === "critical" || l.severity === "warning"))
  );
  const quickFlagged = enclaveUsers.filter((u) => u.status === "Flagged");
  const quickFrozen = enclaveUsers.filter((u) => u.status === "Frozen");
  const quickKycZero = enclaveUsers.filter((u) => u.kycLevel === 0 && u.balanceMSDQ > 1000);
  const quickProcessingTx = transactions.filter((tx) => tx.status === "processing" || tx.status === "pending");

  const quickRiskScore = Math.min(
    100,
    Math.max(
      0,
      5 +
        quickPendingLogs.filter((l) => l.severity === "critical").length * 20 +
        quickPendingLogs.filter((l) => l.severity === "warning").length * 10 +
        quickFlagged.length * 22 +
        quickFrozen.length * 8 +
        quickKycZero.length * 6 +
        quickProcessingTx.length * 6
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0f131c] border border-[#ffb4ab]/40 shadow-[0_0_60px_rgba(255,180,171,0.15)] overflow-hidden">
        {/* Admin Header */}
        <div className="p-4 bg-[#1c2028] border-b border-[#3c4a42]/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ffb4ab]/15 border border-[#ffb4ab]/40 text-[#ffb4ab] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                  MSDQ Super-Admin Console
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/40">
                  ROOT v2.4
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#bbcabf] flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                  <span>MAINNET NORMAL</span>
                </span>
                <span>•</span>
                <span className="text-[#4cd7f6]">HARDENED ENCLAVE</span>
                <span>•</span>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-1 font-bold hover:underline transition-colors ${
                    quickRiskScore >= 75
                      ? "text-[#ffb4ab]"
                      : quickRiskScore >= 50
                      ? "text-[#ff897d]"
                      : quickRiskScore >= 25
                      ? "text-[#ffb95f]"
                      : "text-[#4edea3]"
                  }`}
                  title="Click to inspect Security Health Module"
                >
                  <span className="material-symbols-outlined text-[13px]">health_and_safety</span>
                  <span>RISK: {quickRiskScore}/100</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Safe Mode Killswitch */}
            <button
              onClick={() => {
                const next = !safeModeEnabled;
                setSafeModeEnabled(next);
                onAddAuditLog({
                  id: `log-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString() + " UTC",
                  eventType: "SECURITY_ENCLAVE",
                  severity: next ? "critical" : "success",
                  details: `EMERGENCY SAFE-MODE ${next ? "ACTIVATED - Withdrawals frozen" : "DEACTIVATED - Normal operations restored"}`,
                  nodeSource: "Killswitch Trigger",
                  status: "resolved",
                });
              }}
              className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                safeModeEnabled
                  ? "bg-[#ffb4ab] text-[#690005] border-[#ffb4ab] shadow-[0_0_15px_rgba(255,180,171,0.4)] animate-pulse"
                  : "bg-[#262a33] text-[#bbcabf] border-[#3c4a42]/60 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
              {safeModeEnabled ? "SAFE MODE ACTIVE" : "EMERGENCY SAFE MODE"}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#262a33] text-[#bbcabf] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 bg-[#141820] border-b border-[#3c4a42]/40 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: "monitoring" },
            { id: "conversion", label: "PTS Gateway", icon: "currency_exchange" },
            { id: "kyc", label: "KYC Review", icon: "verified_user" },
            { id: "livegames", label: "Live Games", icon: "casino" },
            { id: "announcements", label: "Announcements", icon: "campaign" },
            { id: "notifications", label: "Alert Sender", icon: "send" },
            {
              id: "security",
              label: "Security Health",
              icon: "health_and_safety",
              badge: `${quickRiskScore}/100`,
              badgeColor:
                quickRiskScore >= 75
                  ? "bg-[#ffb4ab]/20 text-[#ffb4ab] border-[#ffb4ab]/40"
                  : quickRiskScore >= 50
                  ? "bg-[#ff897d]/20 text-[#ff897d] border-[#ff897d]/40"
                  : quickRiskScore >= 25
                  ? "bg-[#ffb95f]/20 text-[#ffb95f] border-[#ffb95f]/40"
                  : "bg-[#4edea3]/20 text-[#4edea3] border-[#4edea3]/40",
            },
            { id: "gamecenter", label: "Game Engine", icon: "sports_esports" },
            { id: "mining", label: "Mining & Halving", icon: "tune" },
            { id: "multisig", label: "Multi-Sig", icon: "vpn_key" },
            { id: "ads", label: "Ad Mediation", icon: "ad_units" },
            { id: "users", label: "User Registry", icon: "group" },
            { id: "logs", label: "Audit Monitor", icon: "terminal" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 font-mono text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#ffb4ab] text-[#ffb4ab] bg-[#ffb4ab]/5"
                  : "border-transparent text-[#bbcabf] hover:text-[#dfe2ee]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
              {"badge" in tab && tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ml-0.5 ${tab.badgeColor}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* 5 KPI Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50">
                  <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Circulating</span>
                  <div className="text-base font-mono font-bold text-[#dfe2ee] mt-1">142.85M</div>
                  <span className="text-[10px] text-[#4edea3] font-mono">MSDQ Mainnet</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50">
                  <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Validators</span>
                  <div className="text-base font-mono font-bold text-[#dfe2ee] mt-1">64 Online</div>
                  <span className="text-[10px] text-[#4cd7f6] font-mono">99.98% Quorum</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50">
                  <span className="text-[10px] font-mono text-[#bbcabf] uppercase">24h Escrow</span>
                  <div className="text-base font-mono font-bold text-[#dfe2ee] mt-1">84,210</div>
                  <span className="text-[10px] text-[#ffb95f] font-mono">MSDQ Vol</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50">
                  <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Hash Power</span>
                  <div className="text-base font-mono font-bold text-[#dfe2ee] mt-1">4.82 TH/s</div>
                  <span className="text-[10px] text-[#4edea3] font-mono">Stable</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#ffb4ab]/40 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-mono text-[#ffb4ab] uppercase">Sybil Alerts</span>
                  <div className="text-base font-mono font-bold text-[#ffb4ab] mt-1">14 Blocks</div>
                  <span className="text-[10px] text-[#bbcabf] font-mono">Throttled</span>
                </div>
              </div>

              {/* Security Health Quick Status Panel */}
              <div
                onClick={() => setActiveTab("security")}
                className="rounded-3xl bg-gradient-to-r from-[#181c24] via-[#1c2028] to-[#181c24] border border-[#ffb95f]/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-[#ffb95f] transition-all group shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#ffb95f]/15 border border-[#ffb95f]/40 text-[#ffb95f] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[26px]">health_and_safety</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                        Protocol Security Health & Enclave Posture
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          quickRiskScore >= 75
                            ? "bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/40"
                            : quickRiskScore >= 50
                            ? "bg-[#ff897d]/20 text-[#ff897d] border border-[#ff897d]/40"
                            : quickRiskScore >= 25
                            ? "bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/40"
                            : "bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40"
                        }`}
                      >
                        Risk Score: {quickRiskScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-[#bbcabf] mt-1">
                      {quickPendingLogs.length} pending audit incidents • {quickFlagged.length} flagged suspect accounts • {quickFrozen.length} frozen vaults
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-[#4cd7f6] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-mono">
                    Launch Security Health
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Quick Protocol Commands */}
              <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
                <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                  Admin Command Actions
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                  <button
                    onClick={() => {
                      onAddAuditLog({
                        id: `log-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString() + " UTC",
                        eventType: "HALVING_EMISSION",
                        severity: "info",
                        details: "Manual Halving Scarcity Simulation triggered across 64 node clusters.",
                        nodeSource: "Admin Manual Action",
                      });
                      alert("Halving simulation audit dispatched to all consensus nodes.");
                    }}
                    className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 text-left hover:border-[#ffb95f] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">
                      play_circle
                    </span>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee] mt-1">
                      Trigger Audit
                    </div>
                    <div className="text-[10px] text-[#bbcabf]">Halving emission test</div>
                  </button>

                  <button
                    onClick={() => {
                      onAddAuditLog({
                        id: `log-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString() + " UTC",
                        eventType: "CONSENSUS_VOTE",
                        severity: "warning",
                        details: "System-wide Broadcast: Epoch 4 Halving countdown checkpoint announcement published.",
                        nodeSource: "Broadcast Daemon",
                      });
                      alert("Broadcast sent to all connected peer nodes.");
                    }}
                    className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 text-left hover:border-[#4cd7f6] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#4cd7f6] text-[20px]">
                      campaign
                    </span>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee] mt-1">
                      Broadcast Alert
                    </div>
                    <div className="text-[10px] text-[#bbcabf]">Notify network nodes</div>
                  </button>

                  <button
                    onClick={() => {
                      onAddAuditLog({
                        id: `log-${Date.now()}`,
                        timestamp: new Date().toLocaleTimeString() + " UTC",
                        eventType: "CONSENSUS_VOTE",
                        severity: "success",
                        details: "Quorum cache flushed and peer states resynchronized with Genesis block.",
                        nodeSource: "Cache Daemon",
                      });
                      alert("Consensus state cache flushed and re-synced.");
                    }}
                    className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 text-left hover:border-[#4edea3] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
                      cached
                    </span>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee] mt-1">
                      Flush Cache
                    </div>
                    <div className="text-[10px] text-[#bbcabf]">Sync peer states</div>
                  </button>

                  <button
                    onClick={() => {
                      alert("Immutable protocol ledger exported to MSDQ_LEDGER_AUDIT.csv.");
                    }}
                    className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 text-left hover:border-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#dfe2ee] text-[20px]">
                      download
                    </span>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee] mt-1">
                      Export Ledger
                    </div>
                    <div className="text-[10px] text-[#bbcabf]">CSV audit download</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY HEALTH MODULE */}
          {activeTab === "security" && (
            <SecurityHealthModule
              auditLogs={auditLogs}
              enclaveUsers={enclaveUsers}
              transactions={transactions}
              onAddAuditLog={onAddAuditLog}
              onUpdateUserStatus={onUpdateUserStatus}
              onUpdateAuditLogStatus={onUpdateAuditLogStatus}
              safeModeEnabled={safeModeEnabled}
              onToggleSafeMode={() => {
                const next = !safeModeEnabled;
                setSafeModeEnabled(next);
                onAddAuditLog({
                  id: `log-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString() + " UTC",
                  eventType: "SECURITY_ENCLAVE",
                  severity: next ? "critical" : "success",
                  details: `EMERGENCY SAFE-MODE ${next ? "ACTIVATED - Withdrawals frozen" : "DEACTIVATED - Normal operations restored"}`,
                  nodeSource: "Killswitch Trigger",
                  status: "resolved",
                });
              }}
            />
          )}

          {/* TAB 2: MINING & HALVING PARAMETERS */}
          {activeTab === "mining" && (
            <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-5 space-y-4">
              <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                Consensus Emission & Halving Configuration
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-[#bbcabf]">
                    Base Hourly Mining Rate (MSDQ/hr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={localBaseRate}
                    onChange={(e) => setLocalBaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/60 font-mono text-sm text-[#dfe2ee] mt-1.5 focus:border-[#4edea3] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#86948a] font-mono">Current: 1.00 MSDQ/hr</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#bbcabf]">
                    Halving Target Block Height
                  </label>
                  <input
                    type="number"
                    value={targetBlock}
                    onChange={(e) => setTargetBlock(parseInt(e.target.value) || 1500000)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/60 font-mono text-sm text-[#dfe2ee] mt-1.5 focus:border-[#4edea3] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#86948a] font-mono">Default: #1,500,000</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#bbcabf]">
                    Halving Emission Reduction Cut (%)
                  </label>
                  <input
                    type="number"
                    value={halvingCutPercent}
                    onChange={(e) => setHalvingCutPercent(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/60 font-mono text-sm text-[#dfe2ee] mt-1.5 focus:border-[#4edea3] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#86948a] font-mono">Default: 50%</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#bbcabf]">
                    Anti-Bot Proof-of-Tap Challenge
                  </label>
                  <select
                    value={antiBotDifficulty}
                    onChange={(e) => setAntiBotDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/60 font-mono text-sm text-[#dfe2ee] mt-1.5 focus:border-[#4edea3] focus:outline-none"
                  >
                    <option value="Low">Low (Basic Proof-of-Presence)</option>
                    <option value="Medium">Medium (Hardware Entropy + Captcha)</option>
                    <option value="High">High (Zero-Knowledge Enclave Check)</option>
                  </select>
                  <span className="text-[10px] text-[#86948a] font-mono">Currently: Medium</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCommitMiningParams}
                  className="py-3 px-5 rounded-2xl bg-gradient-to-r from-[#4edea3] to-[#10b981] text-[#003824] font-mono text-xs font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(78,222,163,0.3)] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Commit Consensus Parameters
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MULTI-SIG & SECURITY */}
          {activeTab === "multisig" && (
            <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                  3-of-5 Multi-Sig Vault Threshold
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#4edea3]/10 text-[#4edea3]">
                  QUORUM ACTIVE
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { name: "Signer 1 (Master Custody Key)", address: "0x3Fa...49A", status: "Signed" },
                  { name: "Signer 2 (Cold Vault Oracle)", address: "0x89B...12C", status: "Signed" },
                  { name: "Signer 3 (Guardian Enclave)", address: "0x11E...88F", status: "Signed" },
                  { name: "Signer 4 (Compliance Key)", address: "0x77A...33D", status: "Idle" },
                  { name: "Signer 5 (Disaster Recovery)", address: "0x90C...66B", status: "Offline" },
                ].map((signer, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-[#dfe2ee]">
                        {signer.name}
                      </div>
                      <div className="text-[10px] font-mono text-[#bbcabf]">{signer.address}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        signer.status === "Signed"
                          ? "bg-[#4edea3]/15 text-[#4edea3]"
                          : signer.status === "Idle"
                          ? "bg-[#ffb95f]/15 text-[#ffb95f]"
                          : "bg-[#86948a]/15 text-[#86948a]"
                      }`}
                    >
                      {signer.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AD MEDIATION PROVIDERS */}
          {activeTab === "ads" && (
            <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-5 space-y-4">
              <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                Ad Mediation Gateway & Yield Stream Config
              </span>

              <div className="space-y-3">
                {/* AdMob */}
                <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee]">Google AdMob SDK</div>
                    <div className="text-[10px] font-mono text-[#bbcabf]">
                      Cap: 5/user/day • eCPM $14.20
                    </div>
                  </div>
                  <button
                    onClick={() => setAdmobActive(!admobActive)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${
                      admobActive ? "bg-[#4edea3]" : "bg-[#3c4a42]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#0f131c] transition-transform ${
                        admobActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></div>
                  </button>
                </div>

                {/* AppLovin MAX */}
                <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee]">AppLovin MAX</div>
                    <div className="text-[10px] font-mono text-[#bbcabf]">
                      Cap: 3/user/day • eCPM $11.80
                    </div>
                  </div>
                  <button
                    onClick={() => setApplovinActive(!applovinActive)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${
                      applovinActive ? "bg-[#4edea3]" : "bg-[#3c4a42]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#0f131c] transition-transform ${
                        applovinActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></div>
                  </button>
                </div>

                {/* Unity Ads */}
                <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-[#dfe2ee]">Unity Ads Network</div>
                    <div className="text-[10px] font-mono text-[#bbcabf]">
                      Standby Backup • eCPM $8.50
                    </div>
                  </div>
                  <button
                    onClick={() => setUnityActive(!unityActive)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${
                      unityActive ? "bg-[#4edea3]" : "bg-[#3c4a42]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-[#0f131c] transition-transform ${
                        unityActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-[#bbcabf]">
                  Stream Completion Payout (MSDQ per ad): {streamPayout} MSDQ
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={streamPayout}
                  onChange={(e) => setStreamPayout(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg bg-[#0a0e16] accent-[#4edea3] cursor-pointer mt-2"
                />
              </div>
            </div>
          )}

          {/* TAB 5: USER ENCLAVE REGISTRY */}
          {activeTab === "users" && (
            <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                  Sovereign Enclave User Registry
                </span>
                <input
                  type="text"
                  placeholder="Search wallet or tier..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/50 font-mono text-xs text-[#dfe2ee] focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#3c4a42]/40 text-[#bbcabf]">
                      <th className="py-2">Wallet</th>
                      <th className="py-2">Tier</th>
                      <th className="py-2">MSDQ Balance</th>
                      <th className="py-2">Mining Rate</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3c4a42]/30">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1c2028]">
                        <td className="py-2.5 text-[#dfe2ee] font-medium">{u.walletAddress}</td>
                        <td className="py-2.5 text-[#4edea3]">{u.tier}</td>
                        <td className="py-2.5 text-[#dfe2ee]">{u.balanceMSDQ.toLocaleString()}</td>
                        <td className="py-2.5 text-[#bbcabf]">{u.miningRate} MH/s</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === "Active"
                                ? "bg-[#4edea3]/10 text-[#4edea3]"
                                : u.status === "Frozen"
                                ? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
                                : "bg-[#ffb95f]/10 text-[#ffb95f]"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedUserForBalance(u)}
                            className="px-2 py-1 rounded-lg bg-[#262a33] text-[#4cd7f6] hover:bg-[#31353e] text-[10px]"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() =>
                              onUpdateUserStatus(
                                u.id,
                                u.status === "Active" ? "Frozen" : "Active"
                              )
                            }
                            className="px-2 py-1 rounded-lg bg-[#262a33] text-[#ffb4ab] hover:bg-[#31353e] text-[10px]"
                          >
                            {u.status === "Active" ? "Freeze" : "Unfreeze"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                  Real-Time Protocol Audit & Risk Engine
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={logSeverityFilter}
                    onChange={(e) => setLogSeverityFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-[#0f131c] border border-[#3c4a42]/50 font-mono text-xs text-[#dfe2ee] focus:outline-none"
                  >
                    <option value="all">All Severities</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                    <option value="success">Success</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-[#0f131c] border border-[#3c4a42]/50 font-mono text-xs text-[#dfe2ee] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-start justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.severity === "critical"
                              ? "bg-[#ffb4ab]/20 text-[#ffb4ab]"
                              : log.severity === "warning"
                              ? "bg-[#ffb95f]/20 text-[#ffb95f]"
                              : log.severity === "success"
                              ? "bg-[#4edea3]/20 text-[#4edea3]"
                              : "bg-[#4cd7f6]/20 text-[#4cd7f6]"
                          }`}
                        >
                          {log.eventType}
                        </span>
                        <span className="text-[#86948a] text-[10px]">{log.timestamp}</span>
                        <span className="text-[#86948a] text-[10px]">[{log.nodeSource}]</span>
                      </div>
                      <p className="text-[#dfe2ee]">{log.details}</p>
                    </div>

                    <button
                      onClick={() => alert(`Inspecting audit trace for event: ${log.id}`)}
                      className="px-2 py-1 rounded-lg bg-[#262a33] text-[#bbcabf] hover:text-white text-[10px] shrink-0"
                    >
                      Inspect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: GAME ENGINE TELEMETRY & CONTROLS */}
          {activeTab === "gamecenter" && <AdminGameCenterTab />}

          {/* TAB: PTS CONVERSION GATEWAY */}
          {activeTab === "conversion" && (
            <AdminPtsConversionTab
              conversionRate={conversionRate}
              onUpdateConversionRate={onUpdateConversionRate}
              msdqToPtsRate={msdqToPtsRate}
              onUpdateMsdqToPtsRate={onUpdateMsdqToPtsRate}
              minLimit={100}
              maxLimit={10000}
              isEnabled={true}
              onUpdateSettings={(s) => {
                onUpdateConversionRate(s.conversionRate);
                if (s.msdqToPtsRate && onUpdateMsdqToPtsRate) {
                  onUpdateMsdqToPtsRate(s.msdqToPtsRate);
                }
              }}
            />
          )}

          {/* TAB: KYC IDENTITY & COMPLIANCE REVIEW */}
          {activeTab === "kyc" && (
            <AdminKycManagementTab
              kycApplications={kycApplications}
              onReviewKyc={onReviewKyc}
            />
          )}

          {/* TAB: LIVE GAMES MONITOR */}
          {activeTab === "livegames" && (
            <AdminLiveGamesTab
              gameConfigs={gameConfigs}
              onToggleGame={onToggleGame}
              onUpdateGameLimits={onUpdateGameLimits}
            />
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <AdminAnnouncementsTab
              announcements={announcements}
              onAddAnnouncement={onAddAnnouncement}
              onToggleAnnouncement={onToggleAnnouncement}
            />
          )}

          {/* TAB: NOTIFICATION SENDER */}
          {activeTab === "notifications" && (
            <AdminNotificationsTab onSendNotification={onSendNotification} />
          )}
        </div>

        {/* Modal: Adjust Balance Overlay */}
        {selectedUserForBalance && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="p-5 rounded-3xl bg-[#1c2028] border border-[#4edea3]/50 w-full max-w-sm space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dfe2ee]">Adjust Enclave Balance</span>
                <button
                  onClick={() => setSelectedUserForBalance(null)}
                  className="text-[#bbcabf] hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="text-xs text-[#bbcabf]">
                Target: {selectedUserForBalance.walletAddress}
              </div>

              <div>
                <label className="text-[10px] text-[#bbcabf] uppercase">Amount (+ or - MSDQ)</label>
                <input
                  type="number"
                  value={balanceAdjustmentAmount}
                  onChange={(e) => setBalanceAdjustmentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f131c] border border-[#3c4a42]/60 text-sm text-[#dfe2ee] mt-1"
                />
              </div>

              <button
                onClick={handleApplyBalanceAdjustment}
                className="w-full py-2.5 rounded-xl bg-[#4edea3] text-[#003824] font-bold text-xs hover:brightness-110"
              >
                Confirm Ledger Settlement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
