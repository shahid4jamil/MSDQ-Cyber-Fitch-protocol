import React, { useState } from "react";
import { AuditLog, EnclaveUser, Transaction } from "../types";

interface SecurityHealthModuleProps {
  auditLogs: AuditLog[];
  enclaveUsers: EnclaveUser[];
  transactions?: Transaction[];
  onAddAuditLog: (log: AuditLog) => void;
  onUpdateUserStatus: (userId: string, status: "Active" | "Frozen" | "Flagged") => void;
  onUpdateAuditLogStatus?: (logId: string, status: "pending" | "investigating" | "resolved") => void;
  safeModeEnabled: boolean;
  onToggleSafeMode: () => void;
}

export const SecurityHealthModule: React.FC<SecurityHealthModuleProps> = ({
  auditLogs,
  enclaveUsers,
  transactions = [],
  onAddAuditLog,
  onUpdateUserStatus,
  onUpdateAuditLogStatus,
  safeModeEnabled,
  onToggleSafeMode,
}) => {
  // Local active sub-section in Security Health
  const [subSection, setSubSection] = useState<"queue" | "wallets" | "safeguards" | "formula">("queue");
  const [logFilter, setLogFilter] = useState<"pending" | "critical" | "warning" | "investigating" | "all">("pending");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("");
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>("Just now");
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [walletFilterTerm, setWalletFilterTerm] = useState("");

  // ==========================================
  // RISK SCORE CALCULATION ENGINE
  // ==========================================
  const pendingLogs = auditLogs.filter(
    (l) => l.status === "pending" || (!l.status && (l.severity === "critical" || l.severity === "warning"))
  );
  const criticalPending = pendingLogs.filter((l) => l.severity === "critical");
  const warningPending = pendingLogs.filter((l) => l.severity === "warning");
  const investigatingLogs = auditLogs.filter((l) => l.status === "investigating");

  const flaggedUsers = enclaveUsers.filter((u) => u.status === "Flagged");
  const frozenUsers = enclaveUsers.filter((u) => u.status === "Frozen");
  const kycZeroHighBalanceUsers = enclaveUsers.filter(
    (u) => u.kycLevel === 0 && u.balanceMSDQ > 1000
  );

  const processingTransactions = transactions.filter(
    (tx) => tx.status === "processing" || tx.status === "pending"
  );
  const largeOutflows = transactions.filter((tx) => tx.amount < -200);

  // Transparent weights
  const BASE_ENTROPY_POINTS = 5;
  const criticalAuditPoints = criticalPending.length * 20;
  const warningAuditPoints = warningPending.length * 10;
  const investigatingAuditPoints = investigatingLogs.length * 5;
  const auditThreatTotal = criticalAuditPoints + warningAuditPoints + investigatingAuditPoints;

  const flaggedWalletPoints = flaggedUsers.length * 22;
  const frozenWalletPoints = frozenUsers.length * 8;
  const kycZeroPoints = kycZeroHighBalanceUsers.length * 6;
  const walletThreatTotal = flaggedWalletPoints + frozenWalletPoints + kycZeroPoints;

  const txProcessingPoints = processingTransactions.length * 6;
  const largeOutflowPoints = largeOutflows.length > 0 ? 5 : 0;
  const txThreatTotal = txProcessingPoints + largeOutflowPoints;

  const rawRiskScore = BASE_ENTROPY_POINTS + auditThreatTotal + walletThreatTotal + txThreatTotal;
  const riskScore = Math.min(100, Math.max(0, rawRiskScore));

  // Determine threat band
  let threatLevel = "LOW RISK";
  let postureLabel = "OPTIMAL INTEGRITY";
  let threatColor = "#4edea3"; // mint green
  let threatBg = "bg-[#4edea3]/10";
  let threatBorder = "border-[#4edea3]/40";
  let defconCode = "DEFCON 5";

  if (riskScore >= 80) {
    threatLevel = "CRITICAL RISK";
    postureLabel = "LOCKDOWN ADVISORY";
    threatColor = "#ffb4ab"; // crimson
    threatBg = "bg-[#ffb4ab]/15";
    threatBorder = "border-[#ffb4ab]";
    defconCode = "DEFCON 1";
  } else if (riskScore >= 55) {
    threatLevel = "HIGH RISK";
    postureLabel = "ACTIVE THREAT VECTORS";
    threatColor = "#ff897d"; // coral/orange
    threatBg = "bg-[#ff897d]/15";
    threatBorder = "border-[#ff897d]/60";
    defconCode = "DEFCON 2";
  } else if (riskScore >= 25) {
    threatLevel = "MODERATE RISK";
    postureLabel = "ELEVATED VIGILANCE";
    threatColor = "#ffb95f"; // amber
    threatBg = "bg-[#ffb95f]/15";
    threatBorder = "border-[#ffb95f]/60";
    defconCode = "DEFCON 3";
  }

  // Handle Deep Security Scan Simulation
  const handleTriggerDeepScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanStage("Broadcasting telemetry ping to 64 consensus nodes...");

    const stages = [
      { at: 20, msg: "Auditing enclave memory isolation & zero-knowledge proofs..." },
      { at: 45, msg: "Scanning mempool for sybil bursts & high-velocity micro-claims..." },
      { at: 75, msg: "Cross-referencing hot wallet custody signatures with Multi-Sig quorum..." },
      { at: 95, msg: "Compiling cryptographic attestation report & hash checksums..." },
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 5;
      setScanProgress(current);

      for (const st of stages) {
        if (current >= st.at && current < st.at + 15) {
          setScanStage(st.msg);
        }
      }

      if (current >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setLastScanTimestamp(new Date().toLocaleTimeString() + " UTC");
        onAddAuditLog({
          id: `scan-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString() + " UTC",
          eventType: "SECURITY_ENCLAVE",
          severity: riskScore > 50 ? "warning" : "success",
          details: `Deep Enclave Heuristic Scan finalized. Risk Index: ${riskScore}/100 [${threatLevel}]. 64 validator signatures attested.`,
          nodeSource: "Heuristic Deep-Probe Daemon",
          status: "resolved",
        });
      }
    }, 70);
  };

  // Resolve an audit log item
  const handleResolveLog = (logId: string) => {
    onUpdateAuditLogStatus?.(logId, "resolved");
    onAddAuditLog({
      id: `res-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType: "SECURITY_ENCLAVE",
      severity: "info",
      details: `Operator mitigated & marked audit incident #${logId} as RESOLVED.`,
      nodeSource: "Admin Security Console",
      status: "resolved",
    });
  };

  // Set audit log item to investigating
  const handleInvestigateLog = (logId: string) => {
    onUpdateAuditLogStatus?.(logId, "investigating");
    onAddAuditLog({
      id: `inv-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType: "SECURITY_ENCLAVE",
      severity: "warning",
      details: `Audit event #${logId} escalated to HIGH-PRIORITY INVESTIGATION quarantine.`,
      nodeSource: "Admin Security Console",
      status: "investigating",
    });
  };

  // Batch resolve all pending logs
  const handleBatchResolveAll = () => {
    pendingLogs.forEach((l) => {
      onUpdateAuditLogStatus?.(l.id, "resolved");
    });
    onAddAuditLog({
      id: `batch-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType: "SECURITY_ENCLAVE",
      severity: "success",
      details: `Operator dispatched batch remediation. Cleared ${pendingLogs.length} pending audit incidents.`,
      nodeSource: "Admin Security Console",
      status: "resolved",
    });
  };

  // Batch quarantine all flagged users
  const handleQuarantineAllFlagged = () => {
    flaggedUsers.forEach((u) => {
      onUpdateUserStatus(u.id, "Frozen");
    });
    onAddAuditLog({
      id: `quar-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType: "BOT_MITIGATION",
      severity: "critical",
      details: `Security Officer triggered emergency quarantine: Froze assets across ${flaggedUsers.length} flagged sybil accounts.`,
      nodeSource: "Enclave Gatekeeper",
      status: "resolved",
    });
  };

  // Inject a simulated security anomaly for testing
  const handleInjectTestAnomaly = () => {
    const isSybil = Math.random() > 0.5;
    onAddAuditLog({
      id: `anomaly-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType: isSybil ? "BOT_MITIGATION" : "SECURITY_ENCLAVE",
      severity: isSybil ? "warning" : "critical",
      details: isSybil
        ? `Suspicious multi-tap burst detected from subnet ${Math.floor(Math.random() * 200 + 10)}.14.88.0/24.`
        : `Unauthorized Multi-Sig RPC nonce discrepancy flagged on node cluster #Alpha-09.`,
      nodeSource: "Telemetry Watchdog",
      status: "pending",
    });
  };

  // Filtered logs for the review queue
  const displayLogs = auditLogs.filter((log) => {
    const isPending = log.status === "pending" || (!log.status && (log.severity === "critical" || log.severity === "warning"));
    if (logFilter === "pending") return isPending;
    if (logFilter === "critical") return log.severity === "critical";
    if (logFilter === "warning") return log.severity === "warning";
    if (logFilter === "investigating") return log.status === "investigating";
    return true;
  });

  // Filtered suspect wallets
  const suspectWallets = enclaveUsers.filter((u) => {
    const isSuspect = u.status === "Flagged" || u.status === "Frozen" || (u.kycLevel === 0 && u.balanceMSDQ > 1000);
    const matchesSearch =
      walletFilterTerm === "" ||
      u.walletAddress.toLowerCase().includes(walletFilterTerm.toLowerCase()) ||
      u.status.toLowerCase().includes(walletFilterTerm.toLowerCase());
    return isSuspect && matchesSearch;
  });

  // Calculate circular SVG gauge
  const circumference = 2 * Math.PI * 46;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="space-y-4 font-mono">
      {/* 1. TOP HERO GAUGE & ATTRIBUTE BANNER */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4 sm:p-5 relative overflow-hidden shadow-xl">
        {/* Subtle background ambient threat glow */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: threatColor }}
        ></div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 relative z-10">
          {/* Circular SVG Gauge & Posture Title */}
          <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto">
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
                <circle
                  cx="55"
                  cy="55"
                  r="46"
                  stroke="#262a33"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="55"
                  cy="55"
                  r="46"
                  stroke={threatColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-[#dfe2ee] leading-none tracking-tight">
                  {riskScore}
                </span>
                <span className="text-[10px] text-[#bbcabf] uppercase mt-0.5 tracking-wider">
                  / 100
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${threatBg} ${threatBorder}`}
                  style={{ color: threatColor }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: threatColor }}
                  ></span>
                  {threatLevel}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#262a33] text-[#bbcabf] border border-[#3c4a42]/60">
                  {defconCode}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#dfe2ee]">
                {postureLabel}
              </h2>
              <p className="text-xs text-[#bbcabf] max-w-md">
                Calculated dynamically from {pendingLogs.length} pending audit incidents, {flaggedUsers.length} flagged wallets, and {processingTransactions.length} processing escrows.
              </p>
              <div className="text-[11px] text-[#86948a] flex items-center gap-2 pt-0.5">
                <span className="material-symbols-outlined text-[14px]">history</span>
                <span>Last Heuristic Scan: {lastScanTimestamp}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Station */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={handleTriggerDeepScan}
              disabled={isScanning}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                isScanning
                  ? "bg-[#262a33] border-[#3c4a42] text-[#bbcabf] cursor-not-allowed"
                  : "bg-[#1c2028] border-[#4cd7f6]/50 text-[#4cd7f6] hover:bg-[#4cd7f6]/10"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isScanning ? "animate-spin" : ""}`}>
                radar
              </span>
              {isScanning ? "Scanning Enclave..." : "Run Deep Enclave Scan"}
            </button>

            <button
              onClick={handleBatchResolveAll}
              disabled={pendingLogs.length === 0}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                pendingLogs.length === 0
                  ? "bg-[#1c2028]/50 border-[#3c4a42]/30 text-[#86948a] cursor-not-allowed"
                  : "bg-[#4edea3]/15 border-[#4edea3]/60 text-[#4edea3] hover:bg-[#4edea3]/25"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              Resolve All ({pendingLogs.length})
            </button>

            <button
              onClick={() => setShowAttestationModal(true)}
              className="p-2.5 rounded-xl bg-[#1c2028] border border-[#3c4a42]/50 text-[#bbcabf] hover:text-[#dfe2ee]"
              title="View Cryptographic Attestation"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
            </button>
          </div>
        </div>

        {/* Live scanning progress bar */}
        {isScanning && (
          <div className="mt-4 pt-3 border-t border-[#3c4a42]/40 space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4cd7f6] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-pulse"></span>
                {scanStage}
              </span>
              <span className="text-[#4cd7f6] font-bold">{scanProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0f131c] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] transition-all duration-150"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 2. FOUR CONTRIBUTING RISK FACTOR METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Pending Audit Threats */}
        <div
          onClick={() => {
            setSubSection("queue");
            setLogFilter("pending");
          }}
          className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/50 hover:border-[#ffb95f]/70 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#bbcabf] uppercase tracking-wider">
              Pending Audit Threats
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                auditThreatTotal > 0 ? "bg-[#ffb4ab]/20 text-[#ffb4ab]" : "bg-[#4edea3]/20 text-[#4edea3]"
              }`}
            >
              +{auditThreatTotal} pts
            </span>
          </div>
          <div className="text-xl font-bold text-[#dfe2ee] mt-1.5 flex items-baseline gap-2">
            <span>{pendingLogs.length} Pending</span>
            <span className="text-xs text-[#ffb4ab]">({criticalPending.length} Critical)</span>
          </div>
          <div className="text-[11px] text-[#86948a] mt-1 flex items-center justify-between">
            <span>{warningPending.length} Warnings • {investigatingLogs.length} Escalated</span>
            <span className="text-[#4cd7f6] text-[10px]">Review →</span>
          </div>
        </div>

        {/* Card 2: Wallet Anomalies & Sybils */}
        <div
          onClick={() => {
            setSubSection("wallets");
          }}
          className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/50 hover:border-[#ff897d]/70 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#bbcabf] uppercase tracking-wider">
              Flagged & Frozen Wallets
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                walletThreatTotal > 0 ? "bg-[#ff897d]/20 text-[#ff897d]" : "bg-[#4edea3]/20 text-[#4edea3]"
              }`}
            >
              +{walletThreatTotal} pts
            </span>
          </div>
          <div className="text-xl font-bold text-[#dfe2ee] mt-1.5 flex items-baseline gap-2">
            <span>{flaggedUsers.length} Flagged</span>
            <span className="text-xs text-[#bbcabf]">({frozenUsers.length} Frozen)</span>
          </div>
          <div className="text-[11px] text-[#86948a] mt-1 flex items-center justify-between">
            <span>{kycZeroHighBalanceUsers.length} Unverified High-Cap Wallets</span>
            <span className="text-[#4cd7f6] text-[10px]">Inspect →</span>
          </div>
        </div>

        {/* Card 3: Escrow & Processing Velocity */}
        <div
          onClick={() => {
            setSubSection("safeguards");
          }}
          className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/50 hover:border-[#4cd7f6]/70 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#bbcabf] uppercase tracking-wider">
              Escrow & Outflow Holds
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                txThreatTotal > 0 ? "bg-[#ffb95f]/20 text-[#ffb95f]" : "bg-[#4edea3]/20 text-[#4edea3]"
              }`}
            >
              +{txThreatTotal} pts
            </span>
          </div>
          <div className="text-xl font-bold text-[#dfe2ee] mt-1.5 flex items-baseline gap-2">
            <span>{processingTransactions.length} In-Transit</span>
            <span className="text-xs text-[#4cd7f6]">Gate #3 Active</span>
          </div>
          <div className="text-[11px] text-[#86948a] mt-1 flex items-center justify-between">
            <span>{largeOutflows.length} High-Volume Withdrawals</span>
            <span className="text-[#4cd7f6] text-[10px]">Manage →</span>
          </div>
        </div>

        {/* Card 4: Protocol Defensive Shields */}
        <div
          onClick={() => {
            setSubSection("safeguards");
          }}
          className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/50 hover:border-[#4edea3]/70 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#bbcabf] uppercase tracking-wider">
              Enclave Defense Guard
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                safeModeEnabled ? "bg-[#ffb4ab] text-[#690005]" : "bg-[#4edea3]/20 text-[#4edea3]"
              }`}
            >
              {safeModeEnabled ? "SAFE-MODE ON" : "NOMINAL"}
            </span>
          </div>
          <div className="text-xl font-bold text-[#dfe2ee] mt-1.5 flex items-baseline gap-2">
            <span>5/5 Safeguards</span>
            <span className="text-xs text-[#4edea3]">Online</span>
          </div>
          <div className="text-[11px] text-[#86948a] mt-1 flex items-center justify-between">
            <span>Multi-Sig 5/7 • WAF L4 Shield</span>
            <span className="text-[#4cd7f6] text-[10px]">Config →</span>
          </div>
        </div>
      </div>

      {/* 3. SUB-SECTION NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3c4a42]/40 pb-2">
        <div className="flex items-center gap-1.5 bg-[#0f131c] p-1 rounded-2xl border border-[#3c4a42]/40">
          <button
            onClick={() => setSubSection("queue")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subSection === "queue"
                ? "bg-[#262a33] text-[#dfe2ee] shadow-sm"
                : "text-[#bbcabf] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            Pending Audits ({pendingLogs.length})
          </button>

          <button
            onClick={() => setSubSection("wallets")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subSection === "wallets"
                ? "bg-[#262a33] text-[#dfe2ee] shadow-sm"
                : "text-[#bbcabf] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person_alert</span>
            Suspect Wallets ({suspectWallets.length})
          </button>

          <button
            onClick={() => setSubSection("safeguards")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subSection === "safeguards"
                ? "bg-[#262a33] text-[#dfe2ee] shadow-sm"
                : "text-[#bbcabf] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">security</span>
            Safeguards & Policy
          </button>

          <button
            onClick={() => setSubSection("formula")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subSection === "formula"
                ? "bg-[#262a33] text-[#dfe2ee] shadow-sm"
                : "text-[#bbcabf] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            Formula Logic
          </button>
        </div>

        {/* Test Anomaly Injector to demonstrate dynamic score recalculation */}
        <button
          onClick={handleInjectTestAnomaly}
          className="px-2.5 py-1 rounded-xl bg-[#262a33] border border-[#ffb95f]/40 text-[#ffb95f] hover:bg-[#ffb95f]/10 text-[11px] font-bold flex items-center gap-1"
          title="Simulate a new security incident to test live score reaction"
        >
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          Simulate Incident Alert
        </button>
      </div>

      {/* 4. SUB-SECTION 1: PENDING AUDIT LOGS REVIEW QUEUE */}
      {subSection === "queue" && (
        <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffb95f] text-[18px]">gavel</span>
                Audit Incident Mitigation Queue
              </h3>
              <p className="text-[11px] text-[#bbcabf] mt-0.5">
                Pending logs directly inflate the protocol risk score until operators review and mitigate them.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#0f131c] p-1 rounded-xl border border-[#3c4a42]/40 text-[11px]">
              {(["pending", "critical", "warning", "investigating", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    logFilter === filter
                      ? "bg-[#262a33] text-[#dfe2ee] font-bold"
                      : "text-[#86948a] hover:text-[#bbcabf]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {displayLogs.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0f131c] border border-[#3c4a42]/30 space-y-2">
              <span className="material-symbols-outlined text-[#4edea3] text-[36px]">
                verified
              </span>
              <p className="text-xs text-[#dfe2ee] font-bold">No Outstanding Audit Incidents Found</p>
              <p className="text-[11px] text-[#bbcabf] max-w-sm mx-auto">
                All security events for this filter have been attested and resolved. Risk contribution is 0 pts.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayLogs.map((log) => {
                const isPending = log.status === "pending" || (!log.status && (log.severity === "critical" || log.severity === "warning"));
                const isInvestigating = log.status === "investigating";
                const isResolved = log.status === "resolved";

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl bg-[#0f131c] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                      isPending && log.severity === "critical"
                        ? "border-[#ffb4ab]/60 bg-[#ffb4ab]/5"
                        : isPending && log.severity === "warning"
                        ? "border-[#ffb95f]/50 bg-[#ffb95f]/5"
                        : isInvestigating
                        ? "border-[#4cd7f6]/50"
                        : "border-[#3c4a42]/40 opacity-75"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.severity === "critical"
                              ? "bg-[#ffb4ab]/20 text-[#ffb4ab] border border-[#ffb4ab]/40"
                              : log.severity === "warning"
                              ? "bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/40"
                              : log.severity === "success"
                              ? "bg-[#4edea3]/20 text-[#4edea3]"
                              : "bg-[#4cd7f6]/20 text-[#4cd7f6]"
                          }`}
                        >
                          {log.eventType}
                        </span>

                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            isPending
                              ? "bg-[#ffb4ab]/20 text-[#ffb4ab]"
                              : isInvestigating
                              ? "bg-[#4cd7f6]/20 text-[#4cd7f6]"
                              : "bg-[#4edea3]/20 text-[#4edea3]"
                          }`}
                        >
                          {log.status || (isPending ? "pending review" : "resolved")}
                        </span>

                        <span className="text-[#86948a] text-[10px]">{log.timestamp}</span>
                        <span className="text-[#86948a] text-[10px]">[{log.nodeSource}]</span>
                      </div>

                      <p className="text-[#dfe2ee] font-medium leading-relaxed">{log.details}</p>

                      <div className="text-[10px] text-[#86948a]">
                        Impact: {log.severity === "critical" ? "+20 risk score pts" : log.severity === "warning" ? "+10 risk score pts" : "0 pts"}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#3c4a42]/30">
                      {!isResolved ? (
                        <>
                          <button
                            onClick={() => handleResolveLog(log.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#4edea3]/20 text-[#4edea3] hover:bg-[#4edea3]/30 text-xs font-bold border border-[#4edea3]/40 flex items-center gap-1"
                            title="Mitigate and mark as resolved"
                          >
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Resolve (-{log.severity === "critical" ? 20 : 10} pts)
                          </button>

                          {!isInvestigating && (
                            <button
                              onClick={() => handleInvestigateLog(log.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#262a33] text-[#4cd7f6] hover:bg-[#31353e] text-xs font-bold border border-[#4cd7f6]/30"
                              title="Escalate incident for quarantine"
                            >
                              Investigate
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-[#4edea3]/10 text-[#4edea3] text-[11px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          Mitigated
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-SECTION 2: SUSPECT & FLAGGED WALLETS INSPECTOR */}
      {subSection === "wallets" && (
        <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ff897d] text-[18px]">fingerprint</span>
                Suspect & Flagged Node Wallets
              </h3>
              <p className="text-[11px] text-[#bbcabf] mt-0.5">
                Wallets flagged for bot activity or unverified KYC holdings directly feed the wallet threat index.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search suspect wallets..."
                value={walletFilterTerm}
                onChange={(e) => setWalletFilterTerm(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-[#0f131c] border border-[#3c4a42]/50 text-xs text-[#dfe2ee] focus:outline-none"
              />

              {flaggedUsers.length > 0 && (
                <button
                  onClick={handleQuarantineAllFlagged}
                  className="px-3 py-1 rounded-xl bg-[#ff897d]/20 text-[#ff897d] hover:bg-[#ff897d]/30 border border-[#ff897d]/50 text-xs font-bold"
                >
                  Quarantine All ({flaggedUsers.length})
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#3c4a42]/40 text-[#bbcabf]">
                  <th className="py-2.5">Wallet Address</th>
                  <th className="py-2.5">Tier</th>
                  <th className="py-2.5">Balance</th>
                  <th className="py-2.5">KYC</th>
                  <th className="py-2.5">Risk Factor</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c4a42]/30">
                {suspectWallets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#bbcabf]">
                      No suspect or flagged node wallets detected. All accounts compliant.
                    </td>
                  </tr>
                ) : (
                  suspectWallets.map((u) => {
                    const isFlagged = u.status === "Flagged";
                    const isFrozen = u.status === "Frozen";
                    return (
                      <tr key={u.id} className="hover:bg-[#1c2028]">
                        <td className="py-2.5 text-[#dfe2ee] font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#ff897d]">
                            account_balance_wallet
                          </span>
                          {u.walletAddress}
                        </td>
                        <td className="py-2.5 text-[#4edea3]">{u.tier}</td>
                        <td className="py-2.5 text-[#dfe2ee]">{u.balanceMSDQ.toLocaleString()} MSDQ</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              u.kycLevel === 0 ? "bg-[#ffb4ab]/20 text-[#ffb4ab]" : "bg-[#4edea3]/20 text-[#4edea3]"
                            }`}
                          >
                            Tier {u.kycLevel}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#bbcabf] text-[11px]">
                          {isFlagged
                            ? "Sybil Burst Pattern (+22 pts)"
                            : isFrozen
                            ? "Quarantined Vault (+8 pts)"
                            : "KYC 0 High Exposure (+6 pts)"}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFlagged
                                ? "bg-[#ffb95f]/20 text-[#ffb95f]"
                                : isFrozen
                                ? "bg-[#ffb4ab]/20 text-[#ffb4ab]"
                                : "bg-[#4edea3]/20 text-[#4edea3]"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right space-x-1.5">
                          <button
                            onClick={() =>
                              onUpdateUserStatus(u.id, isFlagged ? "Active" : "Flagged")
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                              isFlagged
                                ? "bg-[#4edea3]/20 text-[#4edea3] hover:bg-[#4edea3]/30"
                                : "bg-[#ffb95f]/20 text-[#ffb95f] hover:bg-[#ffb95f]/30"
                            }`}
                          >
                            {isFlagged ? "Clear Flag" : "Flag Sybil"}
                          </button>

                          <button
                            onClick={() =>
                              onUpdateUserStatus(u.id, isFrozen ? "Active" : "Frozen")
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                              isFrozen
                                ? "bg-[#4cd7f6]/20 text-[#4cd7f6] hover:bg-[#4cd7f6]/30"
                                : "bg-[#ffb4ab]/20 text-[#ffb4ab] hover:bg-[#ffb4ab]/30"
                            }`}
                          >
                            {isFrozen ? "Unfreeze" : "Freeze"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SUB-SECTION 3: PROTOCOL SAFEGUARDS & DEFENSE POLICIES */}
      {subSection === "safeguards" && (
        <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">verified</span>
              Automated Protocol Safeguards & Enforcement
            </h3>
            <p className="text-[11px] text-[#bbcabf] mt-0.5">
              Defensive circuit breakers engage automatically when Risk Score breaches critical thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Safe Mode Circuit Breaker */}
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#ffb4ab]/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#ffb4ab] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                  Protocol Emergency Safe Mode
                </span>
                <button
                  onClick={onToggleSafeMode}
                  className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all ${
                    safeModeEnabled
                      ? "bg-[#ffb4ab] text-[#690005]"
                      : "bg-[#262a33] text-[#bbcabf] hover:text-white"
                  }`}
                >
                  {safeModeEnabled ? "ACTIVATED" : "ENGAGE"}
                </button>
              </div>
              <p className="text-[11px] text-[#bbcabf]">
                Freezes external hot-wallet withdrawals and pauses token minting until multi-sig consensus clears all pending audit triggers.
              </p>
              <div className="text-[10px] text-[#86948a]">
                Trigger threshold: Risk Score &ge; 75 (Automatic alert)
              </div>
            </div>

            {/* Escrow Time-Lock Policy */}
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dfe2ee] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#ffb95f]">lock_clock</span>
                  Audit Gate #3 Escrow Time-Lock
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#4edea3]/20 text-[#4edea3] font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-[#bbcabf]">
                Holds withdrawals &gt; 250 MSDQ for 48 hours to audit sybil cluster correlations before blockchain finalization.
              </p>
              <div className="text-[10px] text-[#86948a]">
                Current pipeline: {processingTransactions.length} holds pending verification
              </div>
            </div>

            {/* WAF Sybil Throttling */}
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dfe2ee] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#4cd7f6]">shield</span>
                  WAF Layer 4 Anti-Bot Throttling
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#4edea3]/20 text-[#4edea3] font-bold">
                  ENFORCED
                </span>
              </div>
              <p className="text-[11px] text-[#bbcabf]">
                Limits proof-of-uptime mining packets to 1/sec per enclave IP. Flags rapid multi-address claiming bursts.
              </p>
              <div className="text-[10px] text-[#86948a]">
                Blocked bursts (24h): 14 blocks throttled
              </div>
            </div>

            {/* Multi-Sig Quorum */}
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dfe2ee] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#4edea3]">vpn_key</span>
                  5-of-7 Guardian Vault Multi-Sig
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#4edea3]/20 text-[#4edea3] font-bold">
                  SYNCHRONIZED
                </span>
              </div>
              <p className="text-[11px] text-[#bbcabf]">
                Requires 5 hardware signer approvals for base velocity changes, cold reserve adjustments, and contract upgrades.
              </p>
              <div className="text-[10px] text-[#86948a]">
                Signers online: 7/7 verified
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SUB-SECTION 4: TRANSPARENT MATHEMATICAL RISK FORMULA */}
      {subSection === "formula" && (
        <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ffb95f] text-[18px]">functions</span>
              Risk Scoring Mathematical Decomposition
            </h3>
            <p className="text-[11px] text-[#bbcabf] mt-0.5">
              Risk score is calculated in real time using the following transparent weighting function:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 space-y-3 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-[#1c2028] border border-[#4edea3]/30 text-[#4edea3] text-[11px]">
              <code>Risk Score = Clamp(0, 100, BaseEntropy (5) + AuditThreats + WalletThreats + VelocityEscrowThreats)</code>
            </div>

            <div className="space-y-2 divide-y divide-[#3c4a42]/30">
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[#bbcabf]">1. Base Network Entropy Baseline:</span>
                <span className="font-bold text-[#dfe2ee]">+{BASE_ENTROPY_POINTS} pts</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[#bbcabf]">2. Pending Critical Audit Logs ({criticalPending.length} &times; 20 pts):</span>
                  <div className="text-[10px] text-[#86948a]">Key rotation discrepancies, security alarms</div>
                </div>
                <span className="font-bold text-[#ffb4ab]">+{criticalAuditPoints} pts</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[#bbcabf]">3. Pending Warning Audit Logs ({warningPending.length} &times; 10 pts):</span>
                  <div className="text-[10px] text-[#86948a]">Bot mitigations, broadcast anomalies</div>
                </div>
                <span className="font-bold text-[#ffb95f]">+{warningAuditPoints} pts</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[#bbcabf]">4. Flagged Suspect Wallets ({flaggedUsers.length} &times; 22 pts):</span>
                  <div className="text-[10px] text-[#86948a]">Accounts caught in sybil harvesting</div>
                </div>
                <span className="font-bold text-[#ff897d]">+{flaggedWalletPoints} pts</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[#bbcabf]">5. Frozen Quarantined Wallets ({frozenUsers.length} &times; 8 pts):</span>
                  <div className="text-[10px] text-[#86948a]">Quarantined assets awaiting compliance review</div>
                </div>
                <span className="font-bold text-[#ffb4ab]">+{frozenWalletPoints} pts</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[#bbcabf]">6. KYC 0 Wallets with &gt;1k Balance ({kycZeroHighBalanceUsers.length} &times; 6 pts):</span>
                  <div className="text-[10px] text-[#86948a]">Unverified custodial exposure</div>
                </div>
                <span className="font-bold text-[#dfe2ee]">+{kycZeroPoints} pts</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[#bbcabf]">7. Processing Escrow Holds ({processingTransactions.length} &times; 6 pts):</span>
                  <div className="text-[10px] text-[#86948a]">In-transit withdrawal liquidity exposure</div>
                </div>
                <span className="font-bold text-[#4cd7f6]">+{txProcessingPoints} pts</span>
              </div>

              <div className="pt-2.5 flex items-center justify-between text-sm font-bold border-t border-[#3c4a42]/60">
                <span className="text-[#dfe2ee]">Current Total Computed Index:</span>
                <span style={{ color: threatColor }}>{riskScore} / 100 [{threatLevel}]</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: CRYPTOGRAPHIC ATTESTATION REPORT */}
      {showAttestationModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="p-5 rounded-3xl bg-[#1c2028] border border-[#4cd7f6]/50 w-full max-w-lg space-y-4 font-mono shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
              <span className="text-xs font-bold text-[#dfe2ee] flex items-center gap-1.5 uppercase">
                <span className="material-symbols-outlined text-[18px] text-[#4cd7f6]">verified</span>
                Cryptographic Enclave Security Attestation
              </span>
              <button
                onClick={() => setShowAttestationModal(false)}
                className="text-[#bbcabf] hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-xs space-y-2 text-[#bbcabf] max-h-72 overflow-y-auto no-scrollbar">
              <div className="text-[#4edea3]">PROTOCOL ATTESTATION RECEIPT #ATT-8842-SEC</div>
              <div>Generated: {new Date().toISOString()}</div>
              <div>Risk Index: {riskScore} / 100 ({threatLevel})</div>
              <div>Consensus Quorum: 99.8% (64/64 Nodes Active)</div>
              <div>Active Flagged Nodes: {flaggedUsers.map((u) => u.walletAddress).join(", ") || "None"}</div>
              <div>Pending Audit Events: {pendingLogs.length} unresolved</div>
              <div>Multi-Sig State: 5-of-7 Quorum Armed</div>
              <div className="pt-2 border-t border-[#3c4a42]/40 text-[10px] text-[#86948a] break-all">
                SHA-256 Digest: 0x8a92fbc1379e44d01b98ac56f8902ee14a098d712398401beff409a8716b9942
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `MSDQ SECURITY ATTESTATION\nRisk Index: ${riskScore}/100 (${threatLevel})\nTimestamp: ${new Date().toISOString()}\nDigest: 0x8a92fbc1379e44d01b98ac56f8902ee14a098d712398401beff409a8716b9942`
                  );
                  alert("Attestation copied to clipboard!");
                }}
                className="px-3 py-2 rounded-xl bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] text-xs font-bold"
              >
                Copy Digest
              </button>
              <button
                onClick={() => setShowAttestationModal(false)}
                className="px-4 py-2 rounded-xl bg-[#4cd7f6] text-[#00344d] hover:brightness-110 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
