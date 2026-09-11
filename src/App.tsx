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
import { AdminConsoleModal } from "./components/AdminConsoleModal";
import { ReceiveModal } from "./components/Modals";
import { SendModal } from "./components/wallet/SendModal";
import { PtsMsdqConvertModal } from "./components/wallet/PtsMsdqConvertModal";
import { AuthModal } from "./components/auth/AuthModal";
import { KycVerificationModal } from "./components/kyc/KycVerificationModal";
import { KycRecord } from "./components/admin/AdminExpandedTabs";
import { subscribeToAuth, UserProfile } from "./lib/firebase";
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

  // Protocol State
  const [protocolBalance, setProtocolBalance] = useState<number>(14852.4);
  const [gameVaultBalance, setGameVaultBalance] = useState<number>(1200); // PTS Balance
  const [claimableVault, setClaimableVault] = useState<number>(145.5);

  // Mining Engine State
  const [isMining, setIsMining] = useState<boolean>(true);
  const [baseRate, setBaseRate] = useState<number>(1.0);
  const [boostRate, setBoostRate] = useState<number>(0.5);
  const [sessionMined, setSessionMined] = useState<number>(3.75);
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
  >("VERIFIED");
  const [kycApplications, setKycApplications] = useState<KycRecord[]>([
    {
      id: "kyc-001",
      userId: "user-8842",
      userEmail: "miner.8842@msdq.network",
      legalName: "Alexander Vance",
      dob: "1994-06-12",
      nationality: "United Kingdom",
      idType: "Passport",
      idNumber: "UK89124018A",
      status: "VERIFIED",
      submittedAt: "Yesterday 18:20 UTC",
    },
  ]);

  // Data Collections
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [referrals, setReferrals] = useState<NodeReferral[]>(INITIAL_REFERRALS);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [enclaveUsers, setEnclaveUsers] = useState<EnclaveUser[]>(INITIAL_ENCLAVE_USERS);

  // Rewards Streak State
  const [streakDay, setStreakDay] = useState<number>(6);
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user, profile) => {
      setCurrentUser(user);
      setUserProfile(profile);
      if (profile?.kycStatus) {
        setKycStatus(profile.kycStatus);
      }
      if (profile?.msdqBalance !== undefined) {
        setProtocolBalance(profile.msdqBalance);
      } else if (profile?.balanceMSDQ !== undefined) {
        setProtocolBalance(profile.balanceMSDQ);
      }
    });
    return () => unsubscribe();
  }, []);

  // Background Mining Accrual
  useEffect(() => {
    if (!isMining) return;
    const interval = setInterval(() => {
      const delta = ((baseRate + boostRate) / 3600) * 1.0;
      setSessionMined((prev) => prev + delta);
      setProtocolBalance((prev) => prev + delta);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMining, baseRate, boostRate]);

  // Actions
  const handleToggleMining = () => {
    setIsMining(!isMining);
    addAuditLog(
      "SECURITY_ENCLAVE",
      "info",
      `Miner node #MSDQ-8842 transitioned state to ${!isMining ? "ENGAGED" : "PAUSED"}.`
    );
  };

  const handleClaimMining = () => {
    if (sessionMined <= 0) return;
    const claimed = sessionMined;
    setSessionMined(0);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: "mining",
      amount: claimed,
      usdValue: claimed * 0.5,
      timestamp: "Just now",
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 5)}`,
      note: "Enclave Mining Yield Claim",
    };
    setTransactions((prev) => [newTx, ...prev]);
    addAuditLog(
      "HALVING_EMISSION",
      "success",
      `Disbursed +${claimed.toFixed(2)} MSDQ Proof-of-Work emission to node vault.`
    );
  };

  const handleSendTransaction = async (
    to: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> => {
    const gasFee = 0.10;
    const totalDeducted = amount + gasFee;
    if (totalDeducted > protocolBalance) {
      return {
        success: false,
        error: `Insufficient MSDQ balance. Total needed with 0.10 gas fee: ${totalDeducted.toFixed(2)} MSDQ.`,
      };
    }

    setProtocolBalance((prev) => prev - totalDeducted);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: "send",
      amount: -amount,
      usdValue: amount * 0.5,
      timestamp: "Just now",
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2, 8)}...${Math.random().toString(16).slice(2, 5)}`,
      note: `Transfer to ${to.slice(0, 10)} (Gas Fee: 0.10 MSDQ)`,
    };
    setTransactions((prev) => [newTx, ...prev]);
    addAuditLog(
      "WITHDRAWAL_DISBURSE",
      "info",
      `P2P transfer of ${amount} MSDQ (Gas: 0.10 MSDQ) dispatched to ${to}.`
    );
    return { success: true };
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

  const handleSignOut = () => {
    setCurrentUser(null);
    setUserProfile(null);
    setKycStatus("NOT_SUBMITTED");
    setIsAuthOpen(false);
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

  const handleClaimTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.claimed) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, claimed: true } : t))
    );
    setProtocolBalance((prev) => prev + task.reward);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: "receive",
      amount: task.reward,
      usdValue: task.reward * 0.5,
      timestamp: "Just now",
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2, 8)}...`,
      note: `Task Reward: ${task.title}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
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

  const handleClaimStreak = (day: number) => {
    const rewards = [5, 10, 15, 20, 25, 50, 100];
    const reward = rewards[day - 1] || 10;
    setStreakClaimedToday(true);
    setProtocolBalance((prev) => prev + reward);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: "receive",
      amount: reward,
      usdValue: reward * 0.5,
      timestamp: "Just now",
      status: "confirmed",
      txHash: `0x${Math.random().toString(16).slice(2, 8)}...`,
      note: `Day ${day} Check-In Streak Bonus`,
    };
    setTransactions((prev) => [newTx, ...prev]);
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
    setProtocolBalance((prev) => prev + 120);
    alert("Sub-ledger partitions consolidated into Master Custodial Vault.");
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

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#dfe2ee] font-sans antialiased flex flex-col selection:bg-[#10b981] selection:text-[#0f172a]">
      {/* Desktop Smart Sidebar Navigation */}
      <SidebarNav
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (screen === "admin") {
            setIsAdminOpen(true);
          } else {
            setCurrentScreen(screen);
          }
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        unreadNotifCount={unreadNotifCount}
        isMining={isMining}
      />

      {/* Top Application Bar */}
      <Header
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          if (screen === "admin") {
            setIsAdminOpen(true);
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
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => setIsAdminOpen(!isAdminOpen)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenKyc={() => setIsKycOpen(true)}
        userAuth={{
          isLoggedIn: !!currentUser || true,
          email: currentUser?.email || "miner.8842@msdq.network",
          kycStatus: kycStatus === "NOT_SUBMITTED" ? "NONE" : (kycStatus as any),
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4">
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
          />
        )}

        {currentScreen === "tasks" && (
          <TasksScreen
            tasks={tasks}
            onClaimTask={handleClaimTask}
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
            setIsAdminOpen(true);
          } else {
            setCurrentScreen(screen);
          }
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        unreadNotifCount={unreadNotifCount}
        onOpenBoost={() => setIsBoostOpen(true)}
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
        joiningBonus={10.0}
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
        onAdCompleted={(reward) => {
          setProtocolBalance((prev) => prev + reward);
          const newTx: Transaction = {
            id: `tx-${Date.now()}`,
            type: "receive",
            amount: reward,
            usdValue: reward * 0.5,
            timestamp: "Just now",
            status: "confirmed",
            txHash: `0x${Math.random().toString(16).slice(2, 8)}...`,
            note: "AdMob Sponsored Stream Payout",
          };
          setTransactions((prev) => [newTx, ...prev]);
        }}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />

      {/* Admin Console Modal with Expanded Tabs */}
      <AdminConsoleModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
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
