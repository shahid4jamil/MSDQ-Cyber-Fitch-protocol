import React, { useState } from "react";
import { AppNotification, ScreenType } from "../types";

interface NotificationsScreenProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll?: () => void;
  onNavigate: (screen: ScreenType) => void;
}

type NotifFilter = "all" | "mining" | "reward" | "wallet" | "security" | "system";

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<NotifFilter>("all");

  const filterTabs: { id: NotifFilter; label: string; icon: string }[] = [
    { id: "all", label: "All Alerts", icon: "notifications" },
    { id: "mining", label: "Mining", icon: "cyclone" },
    { id: "reward", label: "Rewards", icon: "card_giftcard" },
    { id: "wallet", label: "Wallet", icon: "account_balance_wallet" },
    { id: "security", label: "Security & KYC", icon: "verified_user" },
    { id: "system", label: "System", icon: "settings_suggest" },
  ];

  const filtered = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "security") return n.type === "security" || n.type === "system";
    return n.type === activeFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIconForType = (type: string) => {
    switch (type) {
      case "mining":
        return { icon: "cyclone", color: "text-[#10b981]", bg: "bg-[#10b981]/15" };
      case "reward":
        return { icon: "card_giftcard", color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/15" };
      case "wallet":
        return { icon: "swap_horiz", color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/15" };
      case "game":
        return { icon: "sports_esports", color: "text-[#a855f7]", bg: "bg-[#a855f7]/15" };
      case "security":
        return { icon: "shield", color: "text-[#10b981]", bg: "bg-[#10b981]/15" };
      default:
        return { icon: "info", color: "text-[#94a3b8]", bg: "bg-[#94a3b8]/15" };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-6">
      {/* Top Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#131823] via-[#1a2232] to-[#131823] border border-[#2a3447] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#38bdf8]/20 to-[#10b981]/20 border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
            <span className="material-symbols-outlined text-[28px]">notifications_active</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#10b981] uppercase">
                Consensus Telemetry Broadcast
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
              Notification Center
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Live updates regarding block confirmations, mining rewards, security notices, and game wins.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-xs font-mono font-bold text-[#10b981] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Mark All Read</span>
            </button>
          )}

          <div className="px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-xs font-mono">
            <span className="text-[#94a3b8]">Unread: </span>
            <span className="font-bold text-[#f59e0b]">{unreadCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`py-2 px-3.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === tab.id
                ? "bg-[#38bdf8] text-[#0f172a] shadow-md shadow-[#38bdf8]/20 font-black"
                : "bg-[#131823] text-[#94a3b8] hover:text-white hover:bg-[#1e2738] border border-[#2a3447]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#131823] border border-[#2a3447] text-[#94a3b8] font-mono text-xs space-y-2">
            <span className="material-symbols-outlined text-[36px] text-[#64748b] block mx-auto">
              notifications_off
            </span>
            <span>No notifications in this category.</span>
          </div>
        ) : (
          filtered.map((notif) => {
            const { icon, color, bg } = getIconForType(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) onMarkAsRead(notif.id);
                  if (notif.actionScreen) onNavigate(notif.actionScreen);
                }}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  notif.read
                    ? "bg-[#0d121c] border-[#2a3447]/50 hover:bg-[#131823]"
                    : "bg-[#131823] border-[#38bdf8]/40 shadow-[0_0_15px_rgba(56,189,248,0.1)] hover:border-[#38bdf8]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-bold ${
                          notif.read ? "text-[#dfe2ee]" : "text-white"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-1">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[#64748b]">
                      <span>{notif.timestamp}</span>
                      <span>•</span>
                      <span className="uppercase text-[#38bdf8]">{notif.type}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {notif.actionScreen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.read) onMarkAsRead(notif.id);
                        onNavigate(notif.actionScreen!);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[10px] font-mono text-[#38bdf8] border border-[#2a3447] flex items-center gap-1"
                    >
                      <span>View</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  )}

                  {!notif.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notif.id);
                      }}
                      className="p-1 text-[#94a3b8] hover:text-white"
                      title="Mark as read"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
