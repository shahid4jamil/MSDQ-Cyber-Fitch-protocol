import React from "react";
import { ScreenType } from "../types";

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  protocolBalance: number;
  usdBalance: number;
  ptsBalance?: number;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenAi: () => void;
  isAdminOpen: boolean;
  onToggleAdmin: () => void;
  onOpenAuth?: () => void;
  onOpenKyc?: () => void;
  userAuth?: {
    email?: string | null;
    isLoggedIn?: boolean;
    kycStatus?: "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | "NOT_SUBMITTED" | "NEEDS_RESUBMISSION";
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  protocolBalance,
  usdBalance,
  ptsBalance = 840,
  unreadNotifications,
  onOpenNotifications,
  onOpenAi,
  isAdminOpen,
  onToggleAdmin,
  onOpenAuth,
  onOpenKyc,
  userAuth = { isLoggedIn: true, kycStatus: "VERIFIED", email: "miner.8842@msdq.network" },
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#0f131c]/95 backdrop-blur-md border-b border-[#2a3447] px-3.5 py-2.5 flex items-center justify-between transition-all shadow-md">
      {/* Left: User Node Info & Profile Quick Button */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onNavigate("profile")}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#131823] to-[#1e2738] border border-[#10b981]/40 p-0.5 shadow-sm hover:border-[#10b981] transition-colors cursor-pointer"
          title="Open Profile & KYC Settings"
        >
          <div className="w-full h-full rounded-[10px] bg-[#0f131c] flex items-center justify-center font-mono text-xs font-bold text-[#10b981]">
            #8842
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#10b981] border-2 border-[#0f131c] rounded-full animate-pulse" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              onClick={() => onNavigate("profile")}
              className="text-xs font-bold tracking-wider text-white uppercase cursor-pointer hover:text-[#38bdf8] transition-colors"
            >
              {userAuth.isLoggedIn ? "Node Sovereign" : "Guest Mode"}
            </span>

            {/* KYC Status Badge */}
            <button
              onClick={onOpenKyc || (() => onNavigate("profile"))}
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border transition-all flex items-center gap-0.5 cursor-pointer ${
                userAuth.kycStatus === "VERIFIED"
                  ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40 hover:bg-[#10b981]/25"
                  : userAuth.kycStatus === "PENDING"
                  ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40 hover:bg-[#f59e0b]/25"
                  : "bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/40 hover:bg-[#38bdf8]/25"
              }`}
              title="Identity KYC Verification"
            >
              <span className="material-symbols-outlined text-[11px]">
                {userAuth.kycStatus === "VERIFIED"
                  ? "verified"
                  : userAuth.kycStatus === "PENDING"
                  ? "pending"
                  : "shield"}
              </span>
              <span>
                {userAuth.kycStatus === "VERIFIED"
                  ? "KYC L2"
                  : userAuth.kycStatus === "PENDING"
                  ? "KYC Review"
                  : "Verify KYC"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>Block #941,208</span>
            <span className="text-[#334155]">•</span>
            <span className="text-[#38bdf8]">Rank #42</span>
          </div>
        </div>
      </div>

      {/* Right: Balances & Action Controls */}
      <div className="flex items-center gap-2">
        {/* Balances Chip: MSDQ & PTS */}
        <button
          onClick={() => onNavigate("wallet")}
          className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-xl bg-[#131823] border border-[#2a3447] hover:border-[#10b981]/50 transition-colors text-right cursor-pointer"
          title="Open Sovereign Wallet"
        >
          <div>
            <span className="text-[9px] font-mono text-[#94a3b8] uppercase tracking-wider block">
              MSDQ
            </span>
            <span className="text-xs font-mono font-bold text-[#10b981]">
              {protocolBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-[#2a3447]" />

          <div>
            <span className="text-[9px] font-mono text-[#94a3b8] uppercase tracking-wider block">
              PTS
            </span>
            <span className="text-xs font-mono font-bold text-[#f59e0b]">
              {ptsBalance.toLocaleString()}
            </span>
          </div>
        </button>

        {/* AI Advisor Button */}
        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#131823] border border-[#38bdf8]/40 text-[#38bdf8] hover:bg-[#1e2738] transition-colors cursor-pointer"
          title="MSDQ Neural Advisor"
        >
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          <span className="text-xs font-semibold hidden md:inline font-mono">Neural AI</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => onNavigate("notifications")}
          className="relative p-2 rounded-xl bg-[#131823] border border-[#2a3447] text-white hover:text-[#38bdf8] hover:border-[#38bdf8]/50 transition-colors cursor-pointer"
          title="Telemetry Alerts"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#f59e0b] ring-2 ring-[#0f131c] animate-pulse" />
          )}
        </button>

        {/* Admin Console Button */}
        <button
          onClick={onToggleAdmin}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
            isAdminOpen || currentScreen === "admin"
              ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              : "bg-[#131823] border-[#2a3447] text-[#94a3b8] hover:text-white hover:border-[#ef4444]/50"
          }`}
          title="Super-Admin Console"
        >
          <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
          <span className="hidden lg:inline">ADMIN</span>
        </button>
      </div>
    </header>
  );
};
