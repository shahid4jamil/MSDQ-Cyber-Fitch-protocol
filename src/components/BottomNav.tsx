import React, { useState } from "react";
import { ScreenType } from "../types";

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  unclaimedRewardsCount: number;
  unreadNotifCount?: number;
  onOpenBoost?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  unclaimedRewardsCount,
  unreadNotifCount = 0,
  onOpenBoost,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainTabs = [
    {
      id: "dash" as ScreenType,
      label: "Home",
      icon: "home",
      activeColor: "text-[#10b981]",
      activeBg: "bg-[#10b981]/15 border-[#10b981]/40",
      glowColor: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    },
    {
      id: "mining" as ScreenType,
      label: "Mining",
      icon: "cyclone",
      activeColor: "text-[#38bdf8]",
      activeBg: "bg-[#38bdf8]/15 border-[#38bdf8]/40",
      glowColor: "shadow-[0_0_15px_rgba(56,189,248,0.3)]",
    },
    {
      id: "games" as ScreenType,
      label: "Games",
      icon: "sports_esports",
      activeColor: "text-[#f59e0b]",
      activeBg: "bg-[#f59e0b]/15 border-[#f59e0b]/40",
      glowColor: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
      badgeText: "HOT",
    },
    {
      id: "wallet" as ScreenType,
      label: "Wallet",
      icon: "account_balance_wallet",
      activeColor: "text-[#2dd4bf]",
      activeBg: "bg-[#2dd4bf]/15 border-[#2dd4bf]/40",
      glowColor: "shadow-[0_0_15px_rgba(45,212,191,0.3)]",
    },
    {
      id: "tasks" as ScreenType,
      label: "Tasks",
      icon: "task_alt",
      activeColor: "text-[#a855f7]",
      activeBg: "bg-[#a855f7]/15 border-[#a855f7]/40",
      glowColor: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
      badge: unclaimedRewardsCount > 0 ? unclaimedRewardsCount : undefined,
    },
    {
      id: "rewards" as ScreenType,
      label: "Rewards",
      icon: "redeem",
      activeColor: "text-[#f43f5e]",
      activeBg: "bg-[#f43f5e]/15 border-[#f43f5e]/40",
      glowColor: "shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    },
    {
      id: "profile" as ScreenType,
      label: "Profile",
      icon: "account_circle",
      activeColor: "text-[#38bdf8]",
      activeBg: "bg-[#38bdf8]/15 border-[#38bdf8]/40",
      glowColor: "shadow-[0_0_15px_rgba(56,189,248,0.3)]",
    },
  ];

  const moreItems: { id: ScreenType; label: string; icon: string; badge?: number }[] = [
    { id: "referrals", label: "Syndicate / Referrals", icon: "groups" },
    { id: "notifications", label: "Alerts & Telemetry", icon: "notifications", badge: unreadNotifCount },
    { id: "halving", label: "Halving Protocol", icon: "hourglass_bottom" },
    { id: "admin", label: "Super Admin Console", icon: "admin_panel_settings" },
  ];

  return (
    <>
      {/* "More" Drawer for Mobile */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden flex flex-col justify-end"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="bg-[#131823] border-t border-[#2a3447] rounded-t-3xl p-5 space-y-3 shadow-2xl mb-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#2a3447]/60">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Additional Protocol Sections
              </span>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 text-[#94a3b8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMoreOpen(false);
                  }}
                  className="p-3 rounded-2xl bg-[#0a0e17] hover:bg-[#1e2738] border border-[#2a3447] flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#38bdf8] text-[20px]">
                      {item.icon}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {item.label}
                    </span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#f43f5e] text-white text-[9px] font-mono font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0e17]/95 backdrop-blur-xl border-t border-[#2a3447] pb-safe transition-all lg:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-2 py-1.5 overflow-x-auto no-scrollbar">
          {mainTabs.map((tab) => {
            const isActive =
              currentScreen === tab.id || (tab.id === "dash" && currentScreen === "home");

            return (
              <button
                key={tab.label}
                onClick={() => onNavigate(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all min-w-[50px] min-h-[46px] border ${
                  isActive
                    ? `${tab.activeColor} ${tab.activeBg} ${tab.glowColor} scale-[1.03]`
                    : "border-transparent text-[#94a3b8] hover:text-white hover:bg-[#1e2738]/60"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                  >
                    {tab.icon}
                  </span>

                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2.5 px-1 min-w-[15px] h-[15px] rounded-full bg-[#f43f5e] text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}

                  {tab.badgeText && !isActive && (
                    <span className="absolute -top-1.5 -right-2 px-1 rounded bg-[#f59e0b] text-[#0f172a] text-[8px] font-mono font-black">
                      {tab.badgeText}
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono font-bold mt-0.5 tracking-tight">
                  {tab.label}
                </span>

                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-current mt-0.5 animate-ping" />
                )}
              </button>
            );
          })}

          {/* More Menu Trigger */}
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all min-w-[46px] min-h-[46px] border ${
              isMoreOpen
                ? "text-[#38bdf8] bg-[#38bdf8]/15 border-[#38bdf8]/40"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            <span className="text-[10px] font-mono font-bold mt-0.5">More</span>
            {unreadNotifCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-ping mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
