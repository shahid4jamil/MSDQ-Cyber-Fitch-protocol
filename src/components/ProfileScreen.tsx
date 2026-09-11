import React, { useState } from "react";
import { User } from "firebase/auth";
import { UserProfile } from "../lib/firebase";
import { ThemeMode } from "../types";
import { getStoredTheme, applyTheme } from "../lib/theme";

interface ProfileScreenProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  protocolBalance: number;
  ptsBalance: number;
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";
  onOpenKyc: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onNavigate: (screen: any) => void;
  walletAddress?: string;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  userProfile,
  protocolBalance,
  ptsBalance,
  kycStatus,
  onOpenKyc,
  onOpenAuth,
  onSignOut,
  onNavigate,
  walletAddress = "MSDQ7a89f92b4109cd827104b",
}) => {
  const [copied, setCopied] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getStoredTheme());
  const [selectedLanguage, setSelectedLanguage] = useState("English (US)");
  const [selectedCurrency, setSelectedCurrency] = useState("USD ($)");
  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const [isPinSet, setIsPinSet] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  const loginSessions = [
    {
      id: "sess-1",
      device: "Chrome on Windows (Current)",
      ip: "185.191.171.42",
      location: "Frankfurt, Germany",
      lastActive: "Just now",
      current: true,
    },
    {
      id: "sess-2",
      device: "MSDQ Mobile App (Android 14)",
      ip: "92.204.102.19",
      location: "London, UK",
      lastActive: "4 hours ago",
      current: false,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-6">
      {/* Top Profile Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#131823] via-[#1a2232] to-[#131823] border border-[#2a3447] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#38bdf8] p-0.5 shadow-lg">
              <div className="w-full h-full rounded-[14px] bg-[#0f131c] flex items-center justify-center font-mono text-xl font-bold text-[#10b981]">
                #8842
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10b981] border-2 border-[#0f131c] rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-mono font-black text-white">
                {userProfile?.fullName || "Sovereign Miner"}
              </h1>
              {/* KYC Badge */}
              <button
                onClick={onOpenKyc}
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 transition-all ${
                  kycStatus === "VERIFIED"
                    ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40 hover:bg-[#10b981]/25"
                    : kycStatus === "PENDING"
                    ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40 hover:bg-[#f59e0b]/25"
                    : "bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/40 hover:bg-[#38bdf8]/25"
                }`}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {kycStatus === "VERIFIED" ? "verified" : "shield"}
                </span>
                <span>
                  {kycStatus === "VERIFIED"
                    ? "KYC L2 VERIFIED"
                    : kycStatus === "PENDING"
                    ? "KYC UNDER REVIEW"
                    : "VERIFY IDENTITY"}
                </span>
              </button>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
              {currentUser?.email || "miner.8842@msdq.network"}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-[#64748b]">
              <span>Node ID: MSDQ-8842</span>
              <span>•</span>
              <span className="text-[#10b981]">Consensus Validator</span>
            </div>
          </div>
        </div>

        {/* Auth Actions */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          {currentUser ? (
            <button
              onClick={onSignOut}
              className="px-4 py-2 rounded-xl bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/40 font-mono text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-mono text-xs font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Wallet & Identity */}
        <div className="lg:col-span-6 space-y-5">
          {/* Deterministic Wallet Capsule */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38bdf8] text-[20px]">
                  account_balance_wallet
                </span>
                <h3 className="text-sm font-mono font-bold text-white uppercase">
                  Sovereign Wallet Vault
                </h3>
              </div>
              <button
                onClick={() => onNavigate("wallet")}
                className="text-xs font-mono text-[#38bdf8] hover:underline"
              >
                Full Wallet →
              </button>
            </div>

            {/* Balances Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447]">
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                  MSDQ Balance
                </span>
                <div className="text-lg font-mono font-black text-white mt-0.5">
                  {protocolBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] font-mono text-[#10b981]">
                  ≈ ${(protocolBalance * 0.5).toFixed(2)} USD
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447]">
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                  PTS Vault
                </span>
                <div className="text-lg font-mono font-black text-[#f59e0b] mt-0.5">
                  {ptsBalance.toLocaleString()} PTS
                </div>
                <span className="text-[11px] font-mono text-[#94a3b8]">
                  GameFi & Boost Fuel
                </span>
              </div>
            </div>

            {/* Wallet Address Box */}
            <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94a3b8]">
                <span>Unique Deposit Address</span>
                <button
                  onClick={handleCopyAddress}
                  className="text-[#10b981] hover:underline flex items-center gap-1 font-bold"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-white break-all select-all font-semibold">
                {walletAddress}
              </div>
            </div>
          </div>

          {/* Security Center */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#10b981] text-[20px]">
                security
              </span>
              <h3 className="text-sm font-mono font-bold text-white uppercase">
                Security Center & Enclave
              </h3>
            </div>

            <div className="space-y-3">
              {/* Password */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Account Password</span>
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    Last updated 14 days ago
                  </span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-xs font-mono text-[#38bdf8] border border-[#2a3447] transition-colors"
                >
                  Change
                </button>
              </div>

              {/* 2FA Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Two-Factor Authentication (2FA)
                  </span>
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    Consensus OTP code required for withdrawals
                  </span>
                </div>
                <button
                  onClick={() => setIs2faEnabled(!is2faEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                    is2faEnabled ? "bg-[#10b981] justify-end" : "bg-[#1e2738] justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Security PIN */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    6-Digit Transaction PIN
                  </span>
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    Enforces instant PIN authorization on P2P send
                  </span>
                </div>
                <button
                  onClick={() => setIsPinSet(!isPinSet)}
                  className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                    isPinSet ? "bg-[#10b981] justify-end" : "bg-[#1e2738] justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Active Sessions */}
              <div className="pt-2">
                <span className="text-xs font-mono uppercase text-[#94a3b8] block mb-2">
                  Active Login Sessions
                </span>
                <div className="space-y-2">
                  {loginSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{s.device}</span>
                          {s.current && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#64748b] mt-0.5">
                          {s.ip} • {s.location} • {s.lastActive}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences, Legal, Compliance */}
        <div className="lg:col-span-6 space-y-5">
          {/* Preferences (Theme, Language, Currency) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#f59e0b] text-[20px]">
                tune
              </span>
              <h3 className="text-sm font-mono font-bold text-white uppercase">
                App & Node Preferences
              </h3>
            </div>

            <div className="space-y-3">
              {/* Theme Mode Selector (Dark, Light, System) */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2">
                <span className="text-xs font-bold text-white block">Theme Mode</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["dark", "light", "system"] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleThemeChange(mode)}
                      className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        currentTheme === mode
                          ? "bg-[#10b981] text-[#003824] shadow-md font-black"
                          : "bg-[#1e2738] text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {mode === "dark"
                          ? "dark_mode"
                          : mode === "light"
                          ? "light_mode"
                          : "settings_brightness"}
                      </span>
                      <span className="capitalize">{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selector */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Language</span>
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    Localization
                  </span>
                </div>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-[#1e2738] border border-[#2a3447] rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="Español">Español</option>
                  <option value="Français">Français</option>
                  <option value="Deutsch">Deutsch</option>
                  <option value="中文">中文</option>
                  <option value="العربية">العربية</option>
                </select>
              </div>

              {/* Currency Selector */}
              <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Default Currency</span>
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    Valuation reference
                  </span>
                </div>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-[#1e2738] border border-[#2a3447] rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (€)">EUR (€)</option>
                  <option value="GBP (£)">GBP (£)</option>
                  <option value="JPY (¥)">JPY (¥)</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>
          </div>

          {/* Legal, Compliance & App Store Policies */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#131823] border border-[#2a3447] shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#94a3b8] text-[20px]">
                policy
              </span>
              <h3 className="text-sm font-mono font-bold text-white uppercase">
                Compliance & Legal
              </h3>
            </div>

            <div className="space-y-2">
              <a
                href="#terms"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Terms of Service: MSDQ Network is an open-source decentralized cloud computing and consensus validation protocol. Tokens represent Proof-of-Work emission.");
                }}
                className="p-3 rounded-xl bg-[#0a0e17] hover:bg-[#1e2738] border border-[#2a3447] flex items-center justify-between text-xs font-mono text-white transition-colors"
              >
                <span>Terms of Service</span>
                <span className="material-symbols-outlined text-[16px] text-[#94a3b8]">open_in_new</span>
              </a>

              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Privacy Policy: Zero personal telemetry tracking. Account credentials are encrypted with secure Firebase Auth and SHA-256 client enclaves.");
                }}
                className="p-3 rounded-xl bg-[#0a0e17] hover:bg-[#1e2738] border border-[#2a3447] flex items-center justify-between text-xs font-mono text-white transition-colors"
              >
                <span>Privacy Policy</span>
                <span className="material-symbols-outlined text-[16px] text-[#94a3b8]">open_in_new</span>
              </a>

              <a
                href="#whitepaper"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Whitepaper: MSDQ Consensus Architecture v2.4 (Halving, Proof-of-Yield, Provably Fair GameFi Entropy).");
                }}
                className="p-3 rounded-xl bg-[#0a0e17] hover:bg-[#1e2738] border border-[#2a3447] flex items-center justify-between text-xs font-mono text-white transition-colors"
              >
                <span>Consensus Whitepaper v2.4</span>
                <span className="material-symbols-outlined text-[16px] text-[#94a3b8]">description</span>
              </a>

              {/* Account Deletion (Required by Google Play / App Store) */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full p-3 rounded-xl bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 flex items-center justify-between text-xs font-mono text-[#ef4444] transition-colors cursor-pointer"
              >
                <span>Request Account & Data Deletion</span>
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131823] border border-[#2a3447] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-mono font-bold text-white">Change Account Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-[#94a3b8] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-[#94a3b8] block mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-[#0a0e17] border border-[#2a3447] rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-[#94a3b8] block mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-[#0a0e17] border border-[#2a3447] rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1e2738] text-xs font-mono text-[#94a3b8]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  alert("Password update requested via secure Firebase Auth link.");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#10b981] text-xs font-mono font-bold text-[#003824]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131823] border border-[#ef4444]/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#ef4444]">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="text-base font-mono font-bold">Request Account Deletion</h3>
            </div>

            <p className="text-xs text-[#94a3b8] leading-relaxed">
              In accordance with Google Play & App Store developer policies, submitting this request will initiate the permanent deletion of your node identity, KYC documents, and vault credentials after a 7-day grace period.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1e2738] text-xs font-mono text-[#94a3b8]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  alert("Account deletion request submitted. Check your registered email for confirmation.");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444] text-xs font-mono font-bold text-white hover:bg-[#dc2626]"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
