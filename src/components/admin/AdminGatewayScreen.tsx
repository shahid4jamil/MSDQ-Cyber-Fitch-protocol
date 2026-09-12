import React, { useState } from "react";
import { User } from "firebase/auth";
import {
  UserProfile,
  isUserAdmin,
  loginWithEmail,
  signOutUser,
  saveAdminAuditLog,
} from "../../lib/firebase";
import { AdminConsoleModal } from "../AdminConsoleModal";
import {
  AuditLog,
  EnclaveUser,
  Transaction,
  Announcement,
  AppNotification,
  GameConfig,
} from "../../types";
import { KycRecord } from "./AdminExpandedTabs";

interface AdminGatewayScreenProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  onAdminAuthSuccess: (user: User, profile: UserProfile) => void;
  onReturnToDashboard: () => void;
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

export const AdminGatewayScreen: React.FC<AdminGatewayScreenProps> = ({
  currentUser,
  userProfile,
  onAdminAuthSuccess,
  onReturnToDashboard,
  auditLogs,
  enclaveUsers,
  onAddAuditLog,
  onUpdateUserStatus,
  onAdjustUserBalance,
  baseMiningRate,
  onUpdateBaseMiningRate,
  transactions,
  onUpdateAuditLogStatus,
  conversionRate,
  onUpdateConversionRate,
  msdqToPtsRate,
  onUpdateMsdqToPtsRate,
  announcements,
  onAddAnnouncement,
  onToggleAnnouncement,
  onSendNotification,
  gameConfigs,
  onToggleGame,
  onUpdateGameLimits,
  kycApplications,
  onReviewKyc,
}) => {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = isUserAdmin(currentUser, userProfile);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      setErrorMessage("Enter both administrator email and master password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { user, profile } = await loginWithEmail(adminEmail, adminPassword);

      if (!isUserAdmin(user, profile)) {
        await signOutUser();
        setErrorMessage("Unauthorized access: Your account does not possess administrator credentials.");
        await saveAdminAuditLog({
          adminEmail: adminEmail.trim(),
          action: "UNAUTHORIZED_ADMIN_ATTEMPT",
          details: `Rejected non-admin credentials from email ${adminEmail}`,
        });
        return;
      }

      onAdminAuthSuccess(user, profile);
      await saveAdminAuditLog({
        adminEmail: user.email || adminEmail,
        action: "ADMIN_LOGIN_SUCCESS",
        details: `Administrator logged in successfully from sovereign portal`,
      });
    } catch (err: any) {
      console.error("Admin authentication error:", err);
      setErrorMessage(err.message || "Failed to authenticate administrator credentials.");
    } finally {
      setLoading(false);
    }
  };

  // If authorized admin, render the full admin console!
  if (isAdmin) {
    return (
      <AdminConsoleModal
        isOpen={true}
        onClose={onReturnToDashboard}
        auditLogs={auditLogs}
        enclaveUsers={enclaveUsers}
        onAddAuditLog={onAddAuditLog}
        onUpdateUserStatus={onUpdateUserStatus}
        onAdjustUserBalance={onAdjustUserBalance}
        baseMiningRate={baseMiningRate}
        onUpdateBaseMiningRate={onUpdateBaseMiningRate}
        transactions={transactions}
        onUpdateAuditLogStatus={onUpdateAuditLogStatus}
        conversionRate={conversionRate}
        onUpdateConversionRate={onUpdateConversionRate}
        msdqToPtsRate={msdqToPtsRate}
        onUpdateMsdqToPtsRate={onUpdateMsdqToPtsRate}
        announcements={announcements}
        onAddAnnouncement={onAddAnnouncement}
        onToggleAnnouncement={onToggleAnnouncement}
        onSendNotification={onSendNotification}
        gameConfigs={gameConfigs}
        onToggleGame={onToggleGame}
        onUpdateGameLimits={onUpdateGameLimits}
        kycApplications={kycApplications}
        onReviewKyc={onReviewKyc}
      />
    );
  }

  // If NOT authorized admin, show the strictly protected gate!
  return (
    <div
      id="msdq-admin-security-gate"
      className="min-h-screen w-full bg-[#0a0d14] flex items-center justify-center p-4 font-mono text-white"
    >
      <div className="w-full max-w-md bg-[#0f141f] border border-[#ef4444]/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-[#ef4444]/10 space-y-6 relative overflow-hidden">
        {/* Red Security Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#ef4444]" />

        {/* Security Shield Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-[#ef4444]/15 border border-[#ef4444]/40 mx-auto flex items-center justify-center shadow-lg shadow-[#ef4444]/20">
            <span className="material-symbols-outlined text-[36px] text-[#ef4444]">
              admin_panel_settings
            </span>
          </div>

          <div>
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 tracking-widest mb-1 uppercase">
              Restricted Security Zone
            </div>
            <h1 className="text-xl font-black tracking-wide text-white">
              Administrator Access Gate
            </h1>
            <p className="text-xs text-[#94a3b8] mt-1">
              MSDQ Network Protocol Root Governance
            </p>
          </div>
        </div>

        {/* Unauthorized Warning Notice */}
        <div className="p-3.5 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#fca5a5] space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-[#ef4444]">
            <span className="material-symbols-outlined text-[16px]">gpp_maybe</span>
            <span>Security Warning</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            This endpoint is strictly isolated and reserved for designated root administrators. All unauthorized verification attempts are logged to the decentralized audit ledger.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#ef4444]/20 border border-[#ef4444] text-[#ef4444] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">cancel</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
              Administrator Email
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@msdq.network"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#ef4444]"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
              Root Master Password
            </label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#ef4444]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ef4444] to-[#b91c1c] hover:brightness-110 text-white font-black text-xs transition-all shadow-lg shadow-[#ef4444]/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">lock_open</span>
            <span>{loading ? "Verifying Root Enclave..." : "Authenticate Root Admin"}</span>
          </button>
        </form>

        {/* Back to User Dashboard */}
        <div className="pt-2 border-t border-[#2a3447]/60 text-center">
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Return to User Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
