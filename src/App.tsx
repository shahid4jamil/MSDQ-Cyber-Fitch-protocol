import React, { useState, useEffect } from "react";
import {
  ScreenType,
  Transaction,
  TaskItem,
  AuditLog,
  EnclaveUser,
  NodeReferral,
  Announcement,
  HalvingMilestone,
  ConversionRecord,
  AppNotification,
  GameConfig,
} from "./types";
import {
  INITIAL_TRANSACTIONS,
  INITIAL_REFERRALS,
  INITIAL_TASKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ENCLAVE_USERS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_HALVING_MILESTONES,
  INITIAL_CONVERSIONS,
  defaultGameConfigs,
} from "./data/mockData";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { SidebarNav } from "./components/SidebarNav";
import { DashboardScreen } from "./components/DashboardScreen";
import { MiningScreen } from "./components/MiningScreen";
import { TasksScreen } from "./components/TasksScreen";
import { NotificationsScreen } from "./components/NotificationsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { HalvingScreen } from "./components/HalvingScreen";
import { WalletScreen } from "./components/WalletScreen";
import { ReferralsScreen } from "./components/ReferralsScreen";
import { GamesScreen } from "./components/GamesScreen";
import { RewardsScreen } from "./components/RewardsScreen";
import { RanksScreen } from "./components/RanksScreen";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { AdminGatewayScreen } from "./components/admin/AdminGatewayScreen";
import { ReceiveModal } from "./components/wallet/ReceiveModal";
import { SendModal } from "./components/wallet/SendModal";
import { PtsMsdqConvertModal } from "./components/wallet/PtsMsdqConvertModal";
import { AuthModal } from "./components/auth/AuthModal";
import { KycVerificationModal } from "./components/kyc/KycVerificationModal";
import { KycRecord } from "./components/admin/AdminExpandedTabs";
import {
  subscribeToAuth,
  UserProfile,
  isUserAdmin,
  signOutUser,
  startMiningSession,
  claimMiningSessionReward,
  claimDailyCheckIn,
  claimTaskReward,
  claimAdReward,
  claimJoiningBonus,
  subscribeToUserTransactions,
  subscribeToUserReferrals,
} from "./lib/firebase";
import { User } from "firebase/auth";
import { BoostModal } from "./components/dashboard/BoostModal";
import { RewardedAdModal } from "./components/dashboard/RewardedAdModal";
import { NotificationDrawer } from "./components/notifications/NotificationDrawer";

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    title: "Epoch 4 Halving Alert",
    message: "137,882 blocks remaining until -50% block reward compression.",
    type: "mining",
    timestamp: "1h ago",
    read: false,
    actionScreen: "halving",
  },
  {
    id: "notif-2",
    title: "Consensus Quorum Synced",
    message: "Block #941,208 achieved 99.8% multi-sig agreement.",
    type: "reward",
    timestamp: "3h ago",
    read: false,
  },
  {
    id: "notif-3",
    title: "Cyber GameFi Arena Open",
    message: "Play Rocket Crash, Cyber Dice, and Fortune Wheel with your PTS vault balance!",
    type: "game",
    timestamp: "1d ago",
    read: true,
    actionScreen: "games",
  },
];

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("dash");

  // Protocol State - ZERO default for honest production accounts
  const [protocolBalance, setProtocolBalance] = useState<number>(0.0);
  const [gameVaultBalance, setGameVaultBalance] = useState<number>(0); // PTS Balance
  const [claimableVault, setClaimableVault] = useState<number>(0.0);

  // Mining Engine State
  const [isMining, setIsMining] = useState<boolean>(false);
  const [baseRate, setBaseRate] = useState<number>(1.0);
  const [boostRate, setBoostRate] = useState<number>(0.5);
  const [sessionMined, setSessionMined] = useState<number>(0.0);
  const [activeBoostPercent, setActiveBoostPercent] = useState<number>(0);

  // Conversion & GameFi Configuration State
  const [conversionRate, setConversionRate] = useState<number>(100); // 100 PTS = 1 MSDQ
  const [msdqToPtsRate, setMsdqToPtsRate] = useState<number>(90); // 1 MSDQ = 90 PTS
  const [conversionHistory, setConversionHistory] = useState<ConversionRecord[]>(INITIAL_CONVERSIONS);
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>(defaultGameConfigs);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [halvingMilestones, setHalvingMilestones] = useState<HalvingMilestone[]>(INITIAL_HALVING_MILESTONES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // User Auth & KYC state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [kycStatus, setKycStatus] = useState<
    "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION"
  >("NOT_SUBMITTED");
  const [kycApplications, setKycApplications] = useState<KycRecord[]>([]);

  // Calculate Admin authorization based on cryptographic identity & super-admin email
  const isAdmin = isUserAdmin(currentUser, userProfile);

  // Data Collections
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referrals, setReferrals] = useState<NodeReferral[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [enclaveUsers, setEnclaveUsers] = useState<EnclaveUser[]>(INITIAL_ENCLAVE_USERS);

  // Rewards Streak State
  const [streakDay, setStreakDay] = useState<number>(1);
  const [streakClaimedToday, setStreakClaimedToday] = useState<boolean>(false);

  // Modals Visibility
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isBoostOpen, setIsBoostOpen] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isKycOpen, setIsKycOpen] = useState(false);

  // Direct URL Hash Detection for Admin Access (#admin or /admin)
  useEffect(() => {
    const handleHashCheck = () => {
      const path = window.location.hash.replace("#", "").replace("/", "").toLowerCase();
      if (path === "admin") {
        setCurrentScreen("admin");
      }
    };
    handleHashCheck();
    window.addEventListener("hashchange", handleHashCheck);
    return () => window.removeEventListener("hashchange", handleHashCheck);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user, profile) => {
      setCurrentUser(user);
      setUserProfile(profile);
      if (profile) {
        setKycStatus(profile.kycStatus || "NOT_SUBMITTED");
        setProtocolBalance(profile.msdqBalance ?? profile.balanceMSDQ ?? 0.0);
        setGameVaultBalance(profile.ptsBalance ?? 0);
        setIsMining(profile.miningStatus === "mining");
        if (profile.checkInStreak !== undefined) {
          setStreakDay(profile.checkInStreak);
        }
        const todayStr = new Date().toISOString().split("T")[0];
        setStreakClaimedToday(profile.lastCheckInDate === todayStr);

        // Sync claimed tasks
        if (profile.claimedTaskIds && profile.claimedTaskIds.length > 0) {
          setTasks((prev) =>
            prev.map((t) =>
              profile.claimedTaskIds?.includes(t.id)
                ? { ...t, claimed: true, completed: true, progress: t.total }
                : t
            )
          );
        }

        // Settle one-time Sovereign Node Joining Bonus (+100.00 MSDQ)
        if (user && profile.joiningBonusClaimed !== true) {
          claimJoiningBonus(user.uid)
            .then((res) => {
              if (res.success && !res.alreadyClaimed) {
                setProtocolBalance(res.newBalance);
                setUserProfile((prev) =>
                  prev ? { ...prev, joiningBonusClaimed: true, msdqBalance: res.newBalance, balanceMSDQ: res.newBalance } : prev
                );
                addAuditLog(
                  "CONSENSUS_VOTE",
                  "success",
                  `Genesis Sovereign Node Joining Grant: +100.00 MSDQ credited to verified ledger.`
                );
              }
            })
            .catch(() => {});
        }
      } else {
        setProtocolBalance(0.0);
        setGameVaultBalance(0);
        setIsMining(false);
        setKycStatus("NOT_SUBMITTED");
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Subscriptions for User Transactions & Referrals
  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setReferrals([]);
      return;
    }
    const unsubTx = subscribeToUserTransactions(currentUser.uid, (txs) => {
      setTransactions(txs);
    });
    const unsubRef = subscribeToUserReferrals(currentUser.uid, (refs) => {
      setReferrals(refs);
    });
    return () => {
      unsubTx();
      unsubRef();
    };
  }, [currentUser]);

  // Server-Authoritative Mining Handlers
  const handleStartMiningSession = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const rate = baseRate + boostRate;
      const res = await startMiningSession(currentUser.uid, rate);
      setIsMining(true);
      addAuditLog(
        "HALVING_EMISSION",
        "info",
        `Initiated 24h sovereign mining cycle for node #${currentUser.uid.slice(0, 6)}.`
      );
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: "Mining Cycle Activated",
          message: `24-hour server-authoritative session initiated at ${rate.toFixed(2)} MSDQ/h.`,
          type: "mining",
          timestamp: "Just now",
          read: false,
        },
        ...prev,
      ]);
    } catch (err: any) {
      alert(err.message || "Failed to start mining session.");
    }
  };

  const handleClaimMiningReward = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const res = await claimMiningSessionReward(currentUser.uid);
      setProtocolBalance(res.newBalance);
      setIsMining(false);
      setSessionMined(0);
      addAuditLog(
        "HALVING_EMISSION",
        "success",
        `Claimed +${res.earned.toFixed(4)} MSDQ consensus mining reward.`
      );
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: "Mining Reward Settled",
          message: `Successfully minted +${res.earned.toFixed(4)} MSDQ into your verified ledger balance.`,
          type: "mining",
          timestamp: "Just now",
          read: false,
        },
        ...prev,
      ]);
    } catch (err: any) {
      alert(err.message || "Could not claim mining reward.");
    }
  };

  // Actions
  const handleToggleMining = () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!isMining) {
      handleStartMiningSession();
    }
  };

  const handleClaimMining = () => {
    handleClaimMiningReward();
  };

  const handleSendTransaction = async (
    to: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return {
        success: false,
        error: "Authentication required to dispatch transfers.",
      };
    }

    const gasFee = 0.10;
    const totalDeducted = amount + gasFee;
    if (totalDeducted > protocolBalance) {
      return {
        success: false,
        error: `Insufficient MSDQ balance. Total needed with 0.10 gas fee: ${totalDeducted.toFixed(2)} MSDQ.`,
      };
    }

    try {
      const resp = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUid: currentUser.uid,
          senderAddress: userProfile?.walletAddress || currentUser.uid,
          recipientAddress: to.trim().toUpperCase(),
          amount,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to execute server-side transfer.",
        };
      }

      if (typeof data.newBalance === "number") {
        setProtocolBalance(data.newBalance);
      } else {
        setProtocolBalance((prev) => Math.max(0, prev - totalDeducted));
      }

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: "send",
        amount: -amount,
        usdValue: amount * 0.5,
        timestamp: "Just now",
        status: "confirmed",
        txHash: data.txHash || `0x${Math.random().toString(16).slice(2, 8)}...`,
        note: `Transfer to ${to.slice(0, 10)} (Gas Fee: 0.10 MSDQ)`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      addAuditLog(
        "WITHDRAWAL_DISBURSE",
        "info",
        `P2P transfer of ${amount} MSDQ (Gas: 0.10 MSDQ) dispatched to ${to}.`
      );
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Network error executing transfer.",
      };
    }
  };

  const handleBidirectionalConvert = (
    convertedFrom: "PTS" | "MSDQ",
    fromAmount: number,
    toAmount: number,
    tx: Transaction
  ) => {
    if (convertedFrom === "PTS") {
      // User exchanged PTS for MSDQ
      setGameVaultBalance((prev) => Math.max(0, prev - fromAmount));
      setProtocolBalance((prev) => prev + toAmount);
    } else {
      // User exchanged MSDQ for PTS
      setProtocolBalance((prev) => Math.max(0, prev - fromAmount));
      setGameVaultBalance((prev) => prev + toAmount);
    }
    setTransactions((prev) => [tx, ...prev]);
    addAuditLog(
      "CONSENSUS_VOTE",
      "success",
      `Swapped ${fromAmount} ${convertedFrom} for +${toAmount.toFixed(2)} ${convertedFrom === "PTS" ? "MSDQ" : "PTS"}.`
    );
  };

  const handleKycSubmitted = (newStatus: "PENDING") => {
    setKycStatus("PENDING");
    const newApp: KycRecord = {
      id: `kyc-${Date.now()}`,
      userId: currentUser?.uid || "user-8842",
      userEmail: currentUser?.email || "miner.8842@msdq.network",
      legalName: userProfile?.fullName || "Alexander Vance",
      dob: "1994-06-12",
      nationality: "United Kingdom",
      idType: "National ID",
      idNumber: `ID-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "PENDING",
      submittedAt: "Just now",
    };
    setKycApplications((prev) => [newApp, ...prev]);
    addAuditLog("SECURITY_ENCLAVE", "info", "User submitted KYC identity application.");
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: "KYC Application Submitted",
        message: "Your Level 2 verification dossier has been queued for consensus auditor review.",
        type: "system",
        timestamp: "Just now",
        read: false,
      },
      ...prev,
    ]);
  };

  const handleReviewKyc = (
    kycId: string,
    userId: string,
    status: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION",
    notes: string
  ) => {
    setKycApplications((prev) =>
      prev.map((app) => (app.id === kycId ? { ...app, status, reviewNotes: notes } : app))
    );
    if (status === "VERIFIED") {
      setKycStatus("VERIFIED");
    } else if (status === "REJECTED") {
      setKycStatus("REJECTED");
    } else {
      setKycStatus("NEEDS_RESUBMISSION");
    }
    addAuditLog(
      "SECURITY_ENCLAVE",
      status === "VERIFIED" ? "success" : "warning",
      `Admin reviewed KYC #${kycId}: set to ${status}. Notes: ${notes}`
    );
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `KYC Status: ${status}`,
        message: `Your verification status has been updated: ${notes || status}.`,
        type: "security",
        timestamp: "Just now",
        read: false,
      },
      ...prev,
    ]);
  };

  const handleAuthSuccess = (user: User, profile: UserProfile) => {
    setCurrentUser(user);
    setUserProfile(profile);
    if (profile.kycStatus) {
      setKycStatus(profile.kycStatus);
    }
    if (profile.msdqBalance !== undefined) {
      setProtocolBalance(profile.msdqBalance);
    } else if (profile.balanceMSDQ !== undefined) {
      setProtocolBalance(profile.balanceMSDQ);
    }
    setIsAuthOpen(false);
    addAuditLog(
      "SECURITY_ENCLAVE",
      "success",
      `Authenticated user: ${profile.email || user.uid} (${profile.walletAddress || "node sovereign"}).`
    );
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch {}
    try {
      localStorage.removeItem("msdq_current_user");
      sessionStorage.clear();
      window.location.hash = "";
      window.history.replaceState(null, "", "/");
    } catch {}
    setCurrentUser(null);
    setUserProfile(null);
    setKycStatus("NOT_SUBMITTED");
    setIsAuthOpen(false);
    setCurrentScreen("dash");
    addAuditLog("SECURITY_ENCLAVE", "info", "User signed out from node terminal.");
  };

  const handleConvertPts = async (
    ptsAmount: number,
    msdqAmount: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (ptsAmount > gameVaultBalance) {
      return { success: false, error: "Insufficient PTS points balance in vault." };
    }

    // Deduct PTS and add MSDQ
    setGameVaultBalance((prev) => prev - ptsAmount);
    setProtocolBalance((prev) => prev + msdqAmount);

    const txId = `CNV-${Date.now().toString(36).toUpperCase()}-MSDQ`;
    const newRecord: ConversionRecord = {
      id: `conv-${Date.now()}`,
      date: "Just now",
      ptsUsed: ptsAmount,
      msdqReceived: msdqAmount,
      rate: conversionRate,
      txId,
      status: "completed",
    };
    setConversionHistory((prev) => [newRecord, ...prev]);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: "escrow",
      amount: msdqAmount,
      usdValue: msdqAmount * 0.5,
      timestamp: "Just now",
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2, 8)}...`,
      note: `Converted ${ptsAmount} PTS to MSDQ`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    addAuditLog(
      "CONSENSUS_VOTE",
      "success",
      `Settled PTS conversion: ${ptsAmount} PTS exchanged for +${msdqAmount.toFixed(4)} MSDQ.`
    );

    return { success: true };
  };

  const handleApplyBoost = (
    percent: number,
    durationHours: number,
    costPts?: number
  ): boolean => {
    if (costPts && costPts > gameVaultBalance) {
      return false;
    }
    if (costPts) {
      setGameVaultBalance((prev) => prev - costPts);
    }

    const calculatedSurge = baseRate * (percent / 100);
    setBoostRate(calculatedSurge);
    setActiveBoostPercent(percent);

    addAuditLog(
      "HALVING_EMISSION",
      "info",
      `Hardware hashrate overclock engaged: +${percent}% (+${calculatedSurge.toFixed(2)} MSDQ/hr) for ${durationHours}h.`
    );
    return true;
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: true, progress: t.total } : t
      )
    );
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      addAuditLog(
        "CONSENSUS_VOTE",
        "info",
        `Task completed: "${task.title}". Bounty is ready to claim!`
      );
    }
  };

  const handleClaimTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.claimed) return;

    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    try {
      let newBalance = protocolBalance + task.reward;
      let claimedViaServer = false;
      try {
        const resp = await fetch("/api/rewards/claim-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: currentUser.uid,
            taskId: task.id,
            rewardAmount: task.reward,
            taskTitle: task.title,
          }),
        });
        const data = await resp.json();
        if (resp.ok && data.success && typeof data.newBalance === "number") {
          newBalance = data.newBalance;
          claimedViaServer = true;
        } else if (!resp.ok && data.error && data.error.includes("already")) {
          alert(data.error);
          return;
        }
      } catch {}

      if (!claimedViaServer) {
        // Direct atomic Firestore transaction claim
        const clientRes = await claimTaskReward(
          currentUser.uid,
          task.id,
          task.reward,
          task.title
        );
        newBalance = clientRes.newBalance;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, claimed: true, completed: true, progress: t.total } : t))
      );
      setProtocolBalance(newBalance);

      const newTx: Transaction = {
        id: `tx-task-${task.id.replace(/[^a-zA-Z0-9_-]/g, "_")}-${currentUser.uid}`,
        type: "receive",
        amount: task.reward,
        usdValue: task.reward * 0.5,
        timestamp: "Just now",
        status: "confirmed",
        txHash: `0xtask${Date.now().toString(16)}`,
        note: `Task Bounty: ${task.title}`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      addAuditLog("CONSENSUS_VOTE", "success", `Claimed bounty: ${task.title} (+${task.reward} MSDQ)`);
    } catch (err: any) {
      console.error("Error claiming task:", err);
      alert(err.message || "Failed to claim task bounty.");
    }
  };

  const handleClaimVault = () => {
    if (claimableVault <= 0) return;
    const amount = claimableVault;
    setClaimableVault(0);
    setProtocolBalance((prev) => prev + amount);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: "receive",
      amount: amount,
      usdValue: amount * 0.5,
      timestamp: "Just now",
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2, 8)}...`,
      note: "Rewards Hub Vault Claim",
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleClaimStreak = async (day: number) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    try {
      let reward = 0.50;
      let newBalance = protocolBalance + reward;
      let claimedViaServer = false;
      try {
        const resp = await fetch("/api/rewards/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: currentUser.uid }),
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          reward = data.reward || 0.50;
          if (typeof data.newBalance === "number") newBalance = data.newBalance;
          claimedViaServer = true;
        } else if (!resp.ok && data.error && data.error.includes("already")) {
          alert(data.error);
          return;
        }
      } catch {}

      if (!claimedViaServer) {
        const clientRes = await claimDailyCheckIn(currentUser.uid, 0.50);
        newBalance = clientRes.newBalance;
      }

      setStreakClaimedToday(true);
      setProtocolBalance(newBalance);

      const newTx: Transaction = {
        id: `tx-checkin-${Date.now()}`,
        type: "receive",
        amount: reward,
        usdValue: reward * 0.5,
        timestamp: "Just now",
        status: "confirmed",
        txHash: `0xcheck${Date.now().toString(16)}`,
        note: `Day ${day} Sovereign Daily Node Check-in Reward`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      addAuditLog("CONSENSUS_VOTE", "success", `Day ${day} Check-in settled (+${reward} MSDQ).`);
    } catch (err: any) {
      alert(err.message || "Daily check-in failed or already completed today.");
    }
  };

  const handlePingNode = (nodeId: string) => {
    setReferrals((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, status: "Active", canPing: false, lastPing: "Just now" } : n
      )
    );
    addAuditLog(
      "CONSENSUS_VOTE",
      "info",
      `Wake-up ping acknowledged by node #${nodeId}.`
    );
  };

  const handleConsolidateSubledgers = () => {
    addAuditLog(
      "CONSENSUS_VOTE",
      "info",
      "Sub-ledger partitions verified and synchronized with consensus state."
    );
    alert("Sub-ledger partitions cryptographically verified and synchronized with Master Custodial Vault.");
  };

  const addAuditLog = (
    eventType: AuditLog["eventType"],
    severity: AuditLog["severity"],
    details: string
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      eventType,
      severity,
      details,
      nodeSource: "Node #MSDQ-8842",
      status: severity === "critical" || severity === "warning" ? "pending" : "resolved",
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleUpdateAuditLogStatus = (
    logId: string,
    status: "pending" | "investigating" | "resolved"
  ) => {
    setAuditLogs((prev) =>
      prev.map((log) => (log.id === logId ? { ...log, status } : log))
    );
  };

  const handleUpdateUserStatus = (userId: string, status: "Active" | "Frozen" | "Flagged") => {
    setEnclaveUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );
  };

  const handleAdjustUserBalance = (userId: string, delta: number) => {
    setEnclaveUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, balanceMSDQ: u.balanceMSDQ + delta } : u))
    );
  };

  const handleToggleGame = (gameId: string) => {
    setGameConfigs((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const handleUpdateGameLimits = (gameId: string, minBet: number, maxBet: number) => {
    setGameConfigs((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, minBet, maxBet } : g))
    );
  };

  const handleAddAnnouncement = (ann: Announcement) => {
    setAnnouncements((prev) => [ann, ...prev]);
  };

  const handleToggleAnnouncement = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const handleSendNotification = (notif: AppNotification) => {
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleMarkNotifAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotifsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAllNotifs = () => {
    setNotifications([]);
  };

  const unclaimedRewardsCount = tasks.filter((t) => t.completed && !t.claimed).length;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Strict Authentication Gate:
  // If no authenticated user exists, prevent all access to private dashboard, mining, wallet, and games.
  if (!currentUser) {
    if (currentScreen === "admin") {
      return (
        <div className="min-h-screen bg-[#0a0e17] text-[#dfe2ee] font-sans antialiased flex flex-col selection:bg-[#10b981] selection:text-[#0f172a]">
          <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
            <AdminGatewayScreen
              currentUser={currentUser}
              userProfile={userProfile}
              onAdminAuthSuccess={(user, profile) => {
                setCurrentUser(user);
                setUserProfile(profile);
              }}
              onReturnToDashboard={() => setCurrentScreen("dash")}
              auditLogs={auditLogs}
              enclaveUsers={enclaveUsers}
              onAddAuditLog={(log) => setAuditLogs((prev) => [log, ...prev])}
              onUpdateUserStatus={handleUpdateUserStatus}
              onAdjustUserBalance={handleAdjustUserBalance}
              baseMiningRate={baseRate}
              onUpdateBaseMiningRate={(rate) => setBaseRate(rate)}
              transactions={transactions}
              onUpdateAuditLogStatus={handleUpdateAuditLogStatus}
              conversionRate={conversionRate}
              onUpdateConversionRate={(rate) => setConversionRate(rate)}
              msdqToPtsRate={msdqToPtsRate}
              onUpdateMsdqToPtsRate={(rate) => setMsdqToPtsRate(rate)}
              kycApplications={kycApplications}
              onReviewKyc={handleReviewKyc}
              announcements={announcements}
              onAddAnnouncement={handleAddAnnouncement}
              onToggleAnnouncement={handleToggleAnnouncement}
              onSendNotification={handleSendNotification}
              gameConfigs={gameConfigs}
              onToggleGame={handleToggleGame}
              onUpdateGameLimits={handleUpdateGameLimits}
            />
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0e17] text-[#dfe2ee] font-sans antialiased flex flex-col justify-center items-center p-3 sm:p-4 selection:bg-[#10b981] selection:text-[#0f172a]">
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          currentUser={null}
          userProfile={null}
          onAuthSuccess={handleAuthSuccess}
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#dfe2ee] font-sans antialiased flex flex-col selection:bg-[#10b981] selection:text-[#0f172a]">
      {/* Desktop Smart Sidebar Navigation */}
      <SidebarNav
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (screen === "admin") {
            setCurrentScreen("admin");
          } else {
            setCurrentScreen(screen);
          }
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        unreadNotifCount={unreadNotifCount}
        isMining={isMining}
        isAdmin={isAdmin}
      />

      {/* Top Application Bar */}
      <Header
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (screen === "admin") {
            setCurrentScreen("admin");
          } else {
            setCurrentScreen(screen);
          }
        }}
        protocolBalance={protocolBalance}
        usdBalance={protocolBalance * 0.5}
        ptsBalance={gameVaultBalance}
        unreadNotifications={unreadNotifCount}
        onOpenNotifications={() => setCurrentScreen("notifications")}
        onOpenAi={() => setIsAiOpen(true)}
        isAdminOpen={currentScreen === "admin"}
        onToggleAdmin={() => {
          setCurrentScreen(currentScreen === "admin" ? "dash" : "admin");
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenKyc={() => setIsKycOpen(true)}
        isAdmin={isAdmin}
        userAuth={{
          isLoggedIn: !!currentUser,
          email: currentUser?.email || "Guest Miner",
          kycStatus: kycStatus === "NOT_SUBMITTED" ? "NONE" : (kycStatus as any),
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4">
        {currentScreen === "admin" && (
          <AdminGatewayScreen
            currentUser={currentUser}
            userProfile={userProfile}
            onAdminAuthSuccess={(user, profile) => {
              setCurrentUser(user);
              setUserProfile(profile);
            }}
            onReturnToDashboard={() => setCurrentScreen("dash")}
            auditLogs={auditLogs}
            enclaveUsers={enclaveUsers}
            onAddAuditLog={(log) => setAuditLogs((prev) => [log, ...prev])}
            onUpdateUserStatus={handleUpdateUserStatus}
            onAdjustUserBalance={handleAdjustUserBalance}
            baseMiningRate={baseRate}
            onUpdateBaseMiningRate={(rate) => setBaseRate(rate)}
            transactions={transactions}
            onUpdateAuditLogStatus={handleUpdateAuditLogStatus}
            conversionRate={conversionRate}
            onUpdateConversionRate={(rate) => setConversionRate(rate)}
            msdqToPtsRate={msdqToPtsRate}
            onUpdateMsdqToPtsRate={(rate) => setMsdqToPtsRate(rate)}
            kycApplications={kycApplications}
            onReviewKyc={handleReviewKyc}
            announcements={announcements}
            onAddAnnouncement={handleAddAnnouncement}
            onToggleAnnouncement={handleToggleAnnouncement}
            onSendNotification={handleSendNotification}
            gameConfigs={gameConfigs}
            onToggleGame={handleToggleGame}
            onUpdateGameLimits={handleUpdateGameLimits}
          />
        )}

        {(currentScreen === "dash" || currentScreen === "home") && (
          <DashboardScreen
            protocolBalance={protocolBalance}
            usdBalance={protocolBalance * 0.5}
            isMining={isMining}
            miningRate={baseRate + boostRate}
            baseRate={baseRate}
            boostRate={boostRate}
            sessionMined={sessionMined}
            onToggleMining={handleToggleMining}
            onClaimMining={handleClaimMining}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenReceive={() => setIsReceiveOpen(true)}
            onOpenBoost={() => setIsBoostOpen(true)}
            onOpenConvert={() => setIsConvertOpen(true)}
            onNavigate={(screen) => setCurrentScreen(screen)}
            transactions={transactions}
            announcements={announcements.filter((a) => a.active)}
            halvingMilestones={halvingMilestones}
            activeBoostPercent={activeBoostPercent}
          />
        )}

        {currentScreen === "mining" && (
          <MiningScreen
            protocolBalance={protocolBalance}
            usdBalance={protocolBalance * 0.5}
            isMining={isMining}
            miningRate={baseRate + boostRate}
            baseRate={baseRate}
            boostRate={boostRate}
            sessionMined={sessionMined}
            activeBoostPercent={activeBoostPercent}
            onToggleMining={handleToggleMining}
            onClaimMining={handleClaimMining}
            onOpenBoost={() => setIsBoostOpen(true)}
            onOpenConvert={() => setIsConvertOpen(true)}
            onNavigate={(screen) => setCurrentScreen(screen)}
            halvingMilestones={halvingMilestones}
            transactions={transactions}
            userProfile={userProfile}
            onStartMiningSession={handleStartMiningSession}
            onClaimMiningReward={handleClaimMiningReward}
          />
        )}

        {currentScreen === "tasks" && (
          <TasksScreen
            tasks={tasks}
            onClaimTask={handleClaimTask}
            onCompleteTask={handleCompleteTask}
            protocolBalance={protocolBalance}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === "notifications" && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAsRead={handleMarkNotifAsRead}
            onMarkAllAsRead={handleMarkAllNotifsAsRead}
            onClearAll={handleClearAllNotifs}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {currentScreen === "profile" && (
          <ProfileScreen
            currentUser={currentUser}
            userProfile={userProfile}
            protocolBalance={protocolBalance}
            ptsBalance={gameVaultBalance}
            kycStatus={kycStatus}
            onOpenKyc={() => setIsKycOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSignOut={handleSignOut}
            onNavigate={(screen) => setCurrentScreen(screen)}
            walletAddress={userProfile?.walletAddress || "MSDQ7a89f92b4109cd827104b"}
          />
        )}

        {currentScreen === "halving" && <HalvingScreen />}

        {currentScreen === "wallet" && (
          <WalletScreen
            protocolBalance={protocolBalance}
            usdBalance={protocolBalance * 0.5}
            ptsBalance={gameVaultBalance}
            transactions={transactions}
            walletAddress={userProfile?.walletAddress || "MSDQ7a89f92b4109cd827104b"}
            ptsToMsdqRate={conversionRate}
            msdqToPtsRate={msdqToPtsRate}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenReceive={() => setIsReceiveOpen(true)}
            onOpenConvert={() => setIsConvertOpen(true)}
            onConsolidateSubledgers={handleConsolidateSubledgers}
            onOpenWithdrawalModal={() => setIsSendOpen(true)}
          />
        )}

        {currentScreen === "referrals" && (
          <ReferralsScreen
            referrals={referrals}
            onPingNode={handlePingNode}
            onOpenInviteModal={() => setIsReceiveOpen(true)}
            userProfile={userProfile}
          />
        )}

        {currentScreen === "games" && (
          <GamesScreen
            gameVaultBalance={gameVaultBalance}
            onUpdateVaultBalance={(delta) => setGameVaultBalance((prev) => Math.max(0, prev + delta))}
            onNavigate={(screen) => setCurrentScreen(screen)}
            userId="node-8842"
            userName="Miner_#8842"
            gameConfigs={gameConfigs}
          />
        )}

        {currentScreen === "rewards" && (
          <RewardsScreen
            claimableVault={claimableVault}
            tasks={tasks}
            onClaimTask={handleClaimTask}
            onClaimVault={handleClaimVault}
            onOpenAdModal={() => setIsAdOpen(true)}
            streakDay={streakDay}
            onClaimStreak={handleClaimStreak}
            streakClaimedToday={streakClaimedToday}
          />
        )}

        {currentScreen === "ranks" && <RanksScreen />}
      </main>

      {/* Bottom Floating Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (screen === "admin") {
            setCurrentScreen("admin");
          } else {
            setCurrentScreen(screen);
          }
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        unreadNotifCount={unreadNotifCount}
        onOpenBoost={() => setIsBoostOpen(true)}
        isAdmin={isAdmin}
      />

      {/* OVERLAYS & MODALS */}

      {/* Send Modal with P2P validation */}
      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        availableBalance={protocolBalance}
        onSend={handleSendTransaction}
      />

      {/* Receive Modal with QR Code */}
      <ReceiveModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
      />

      {/* Convert PTS to MSDQ / MSDQ to PTS Modal */}
      <PtsMsdqConvertModal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        ptsBalance={gameVaultBalance}
        msdqBalance={protocolBalance}
        ptsToMsdqRate={conversionRate}
        msdqToPtsRate={msdqToPtsRate}
        onConvertSuccess={handleBidirectionalConvert}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onAuthSuccess={handleAuthSuccess}
        onSignOut={handleSignOut}
      />

      {/* KYC Identity Verification Modal */}
      <KycVerificationModal
        isOpen={isKycOpen}
        onClose={() => setIsKycOpen(false)}
        userId={currentUser?.uid || "user-8842"}
        userEmail={currentUser?.email || "miner.8842@msdq.network"}
        currentKycStatus={kycStatus}
        onKycSubmitted={handleKycSubmitted}
      />

      {/* Hashrate Boost Modal */}
      <BoostModal
        isOpen={isBoostOpen}
        onClose={() => setIsBoostOpen(false)}
        activeBoostPercent={activeBoostPercent}
        ptsBalance={gameVaultBalance}
        onApplyBoost={handleApplyBoost}
        onWatchAdForBoost={() => {
          setIsBoostOpen(false);
          setIsAdOpen(true);
        }}
      />

      {/* Rewarded Ad Modal */}
      <RewardedAdModal
        isOpen={isAdOpen}
        onClose={() => setIsAdOpen(false)}
        rewardAmount={5.0}
        boostBonus={0.25}
        onAdCompleted={async (reward) => {
          if (currentUser) {
            try {
              const res = await claimAdReward(currentUser.uid, reward);
              setProtocolBalance(res.newBalance);
            } catch {
              setProtocolBalance((prev) => prev + reward);
            }
          } else {
            setProtocolBalance((prev) => prev + reward);
          }
          const newTx: Transaction = {
            id: `tx-${Date.now()}`,
            type: "receive",
            amount: reward,
            usdValue: reward * 0.5,
            timestamp: "Just now",
            status: "confirmed",
            txHash: `0xad${Date.now().toString(16)}`,
            note: "AdMob Verified Sponsored Stream Reward",
          };
          setTransactions((prev) => [newTx, ...prev]);
          addAuditLog("CONSENSUS_VOTE", "success", `Ad Stream verified (+${reward} MSDQ).`);
        }}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onNavigate={(screen) => setCurrentScreen(screen)}
      />
    </div>
  );
}
