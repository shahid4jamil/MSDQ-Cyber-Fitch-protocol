import React, { useState } from "react";
import { Announcement } from "../../types";

interface AnnouncementsBannerProps {
  announcements: Announcement[];
}

export const AnnouncementsBanner: React.FC<AnnouncementsBannerProps> = ({
  announcements,
}) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const activeAnnouncements = announcements.filter((a) => a.active);

  if (activeAnnouncements.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#f59e0b]">campaign</span>
          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider font-mono">
            Network Announcements
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#94a3b8] px-2 py-0.5 rounded-full bg-[#131823] border border-[#2a3447]">
          {activeAnnouncements.length} Active
        </span>
      </div>

      {/* Horizontal scrollable cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
        {activeAnnouncements.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedAnnouncement(item)}
            className="min-w-[280px] max-w-[320px] shrink-0 p-4 rounded-2xl bg-gradient-to-br from-[#131823] to-[#0f131c] border border-[#2a3447] hover:border-[#f59e0b]/50 cursor-pointer transition-all shadow-md snap-start group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                {item.category}
              </span>
              {item.badge && (
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">
                  {item.badge}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-white group-hover:text-[#f59e0b] transition-colors line-clamp-1">
              {item.title}
            </h4>

            <p className="text-xs text-[#94a3b8] line-clamp-2 mt-1 leading-relaxed">
              {item.description}
            </p>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2a3447]/60 text-[10px] text-[#64748b] font-mono">
              <span>{item.date}</span>
              <span className="text-[#38bdf8] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Read More <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0f131c] border border-[#334155] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#334155]/60">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
                  {selectedAnnouncement.category}
                </span>
                <span className="text-xs text-[#64748b] font-mono">{selectedAnnouncement.date}</span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1 rounded-lg text-[#94a3b8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <h3 className="text-base font-extrabold text-white leading-snug">
              {selectedAnnouncement.title}
            </h3>

            <div className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] text-xs text-[#cbd5e1] leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
              {selectedAnnouncement.description}
            </div>

            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="w-full py-2.5 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-white font-semibold text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
