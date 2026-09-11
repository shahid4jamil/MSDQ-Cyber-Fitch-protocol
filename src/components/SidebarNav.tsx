import React, { useState } from "react";
import { ScreenType } from "../types";

interface SidebarNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  unclaimedRewardsCount?: number;
  unreadNotifCount?: number;
  isMining?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentScreen,
  onNavigate,
  unclaimedRewardsCount = 0,
  unreadNotifCount = 0,
  isMining = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const isOpen = isPinned || isHovered;

  const navItems: {
    id: ScreenType;
    label: string;
    icon: string;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    { id: "dash", label: "Home", icon: "home" },
    {
      id: "mining",
      label: "Mining Engine",
      icon: "cyclone",
      badge: isMining ? "LIVE" : undefined,
      badgeColor: "bg-[#10b981] text-[#003824]",
    },
    { id: "games", label: "Game Center", icon: "sports_esports", badge: "HOT", badgeColor: "bg-[#f59e0b] text-[#0f172a]" },
    { id: "wallet", label: "Wallet & Vault", icon: "account_balance_wallet" },
    {
      id: "tasks",
      label: "Tasks & Bounties",
      icon: "task_alt",
      badge: unclaimedRewardsCount > 0 ? unclaimedRewardsCount : undefined,
      badgeColor: "bg-[#f59e0b] text-[#0f172a]",
    },
    { id: "rewards", label: "Rewards Hub", icon: "card_giftcard" },
    { id: "referrals", label: "Syndicate / Ref", icon: "groups" },
    {
      id: "notifications",
      label: "Alerts & Telemetry",
      icon: "notifications",
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      badgeColor: "bg-[#38bdf8] text-[#0f172a]",
    },
    { id: "profile", label: "Profile & KYC", icon: "account_circle" },
    { id: "admin", label: "Admin Console", icon: "admin_panel_settings", badge: "ROOT", badgeColor: "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40" },
  ];

  return (
    <>
      {/* Small Edge Handle on Left Edge of Screen (Visible when collapsed on desktop) */}
      <div
        className={`hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onMouseEnter={() => setIsHovered(true)}
      >
        <button
          onClick={() => setIsHovered(true)}
          className="bg-[#131823]/95 hover:bg-[#1e2738] text-[#38bdf8] border-r border-y border-[#2a3447] rounded-r-2xl py-4 px-1.5 shadow-2xl flex flex-col items-center gap-2 group cursor-pointer transition-all"
          title="Open Navigation Menu"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
            chevron_right
          </span>
          <span className="[writing-mode:vertical-rl] text-[9px] font-mono tracking-widest uppercase text-[#94a3b8] group-hover:text-white">
            MENU
          </span>
          {unreadNotifCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
          )}
        </button>
      </div>

      {/* Slide-out Desktop Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          if (!isPinned) setIsHovered(false);
        }}
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-64 bg-[#0f141f]/95 backdrop-blur-xl border-r border-[#2a3447]/80 shadow-2xl flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Branding & Pin Control */}
        <div className="p-4 border-b border-[#2a3447]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10b981] to-[#38bdf8] p-0.5">
                <div className="w-full h-full rounded-[10px] bg-[#0f141f] flex items-center justify-center font-mono text-xs font-black text-[#10b981]">
                  M
                </div>
              </div>
              <div>
                <span className="font-mono text-xs font-black tracking-wider text-white block">
                  MSDQ NETWORK
                </span>
                <span className="text-[10px] font-mono text-[#10b981]">v2.4 Sovereign</span>
              </div>
            </div>

            {/* Pin / Unpin Button */}
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isPinned
                  ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981]"
                  : "bg-[#1e2738] border-[#2a3447] text-[#94a3b8] hover:text-white"
              }`}
              title={isPinned ? "Unpin Sidebar (Auto-hide)" : "Pin Sidebar Docked"}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPinned ? "push_pin" : "keep"}
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 no-scrollbar">
          {navItems.map((item) => {
            const isActive =
              currentScreen === item.id || (item.id === "dash" && currentScreen === "home");
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (!isPinned) setIsHovered(false);
                }}
                className={`w-full py-2.5 px-3 rounded-2xl font-mono text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? "bg-[#10b981] text-[#003824] shadow-md shadow-[#10b981]/25 font-black"
                    : "text-[#94a3b8] hover:text-white hover:bg-[#1e2738]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`material-symbols-outlined text-[18px] transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#003824]" : "text-[#38bdf8]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                      item.badgeColor || "bg-[#1e2738] text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-[#2a3447]/60 text-center">
          <div className="text-[10px] font-mono text-[#64748b]">
            Decentralized Enclave Rig #8842
          </div>
          <div className="text-[9px] text-[#10b981] font-mono mt-0.5">
            Quorum Synced • Slashing Safe
          </div>
        </div>
      </aside>
    </>
  );
};
