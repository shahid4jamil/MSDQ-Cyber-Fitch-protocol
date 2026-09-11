import React from "react";
import { AppNotification, ScreenType } from "../../types";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (screen: ScreenType) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "mining":
        return { icon: "cyclone", color: "text-[#10b981]", bg: "bg-[#10b981]/15" };
      case "reward":
        return { icon: "redeem", color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/15" };
      case "wallet":
        return { icon: "account_balance_wallet", color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/15" };
      case "game":
        return { icon: "sports_esports", color: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/15" };
      case "announcement":
        return { icon: "campaign", color: "text-[#ec4899]", bg: "bg-[#ec4899]/15" };
      case "boost":
        return { icon: "bolt", color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/15" };
      default:
        return { icon: "info", color: "text-[#94a3b8]", bg: "bg-[#1e2738]" };
    }
  };

  const handleNotificationClick = (item: AppNotification) => {
    onMarkAsRead(item.id);
    if (item.actionScreen) {
      onNavigate(item.actionScreen);
      onClose();
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md h-full bg-[#0f131c] border-l border-[#2a3447] flex flex-col shadow-2xl animate-slideInRight">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2a3447]/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#38bdf8] text-[22px]">notifications</span>
            <div>
              <h3 className="text-base font-bold text-white">Notifications</h3>
              <p className="text-[11px] text-[#94a3b8] font-mono">
                {unreadCount} Unread Telemetry Signals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[11px] font-mono font-bold text-[#38bdf8] hover:underline"
              >
                Mark Read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#1e2738] text-[#94a3b8] hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-[#64748b]">
              <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">notifications_off</span>
              <p>No telemetry alerts or notifications yet.</p>
            </div>
          ) : (
            notifications.map((item) => {
              const meta = getTypeIcon(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.read
                      ? "bg-[#131823]/60 border-[#2a3447]/50 opacity-70 hover:opacity-100"
                      : "bg-[#131823] border-[#38bdf8]/40 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined text-[20px] ${meta.color}`}>
                        {meta.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-[#64748b] font-mono block mt-1">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
