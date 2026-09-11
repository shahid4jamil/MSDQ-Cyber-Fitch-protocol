import React, { useState } from "react";
import { Announcement, AppNotification, GameConfig, HalvingMilestone } from "../../types";

// ==========================================
// 1. PTS ↔ MSDQ SETTINGS TAB (BIDIRECTIONAL)
// ==========================================
interface PtsConversionTabProps {
  conversionRate: number;
  onUpdateConversionRate: (rate: number) => void;
  msdqToPtsRate?: number;
  onUpdateMsdqToPtsRate?: (rate: number) => void;
  minLimit: number;
  maxLimit: number;
  isEnabled: boolean;
  onUpdateSettings: (settings: {
    conversionRate: number;
    msdqToPtsRate?: number;
    minLimit: number;
    maxLimit: number;
    isEnabled: boolean;
  }) => void;
}

export const AdminPtsConversionTab: React.FC<PtsConversionTabProps> = ({
  conversionRate,
  onUpdateConversionRate,
  msdqToPtsRate = 90,
  onUpdateMsdqToPtsRate,
  minLimit,
  maxLimit,
  isEnabled,
  onUpdateSettings,
}) => {
  const [rate, setRate] = useState(conversionRate);
  const [reverseRate, setReverseRate] = useState(msdqToPtsRate);
  const [min, setMin] = useState(minLimit);
  const [max, setMax] = useState(maxLimit);
  const [enabled, setEnabled] = useState(isEnabled);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateSettings({
      conversionRate: rate,
      msdqToPtsRate: reverseRate,
      minLimit: min,
      maxLimit: max,
      isEnabled: enabled,
    });
    if (onUpdateConversionRate) onUpdateConversionRate(rate);
    if (onUpdateMsdqToPtsRate) onUpdateMsdqToPtsRate(reverseRate);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4 font-mono text-xs text-[#dfe2ee]">
      <div className="p-4 rounded-2xl bg-[#171b24] border border-[#2a3447]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">PTS ↔ MSDQ Dual Conversion Gateway</h3>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Configure independent bidirectional exchange rates and liquidity limits for both swap corridors.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              enabled
                ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40"
                : "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40"
            }`}
          >
            {enabled ? "GATEWAY ACTIVE" : "GATEWAY SUSPENDED"}
          </span>
        </div>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-xs font-bold">
          Conversion Gateway parameters committed to consensus ledger!
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Toggle Switch */}
        <div className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-2">
          <label className="text-[11px] text-[#94a3b8] uppercase font-bold">Gateway Operational Status</label>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-white">Allow Ecosystem Dual Swaps</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                enabled
                  ? "bg-[#10b981] text-[#0f172a] shadow-md shadow-[#10b981]/20"
                  : "bg-[#262a33] text-[#94a3b8]"
              }`}
            >
              {enabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>
        </div>

        {/* Corridor 1: PTS -> MSDQ Rate */}
        <div className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-2">
          <label className="text-[11px] text-[#94a3b8] uppercase font-bold">
            PTS → MSDQ Rate (PTS per 1.00 MSDQ)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={rate}
              onChange={(e) => setRate(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white font-mono text-sm"
            />
            <span className="text-xs text-[#94a3b8] whitespace-nowrap">PTS = 1 MSDQ</span>
          </div>
          <span className="text-[10px] text-[#64748b] block">Example: 100 PTS = 1.00 MSDQ</span>
        </div>

        {/* Corridor 2: MSDQ -> PTS Rate */}
        <div className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-2">
          <label className="text-[11px] text-[#94a3b8] uppercase font-bold">
            MSDQ → PTS Rate (PTS yielded per 1.00 MSDQ)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={reverseRate}
              onChange={(e) => setReverseRate(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white font-mono text-sm"
            />
            <span className="text-xs text-[#94a3b8] whitespace-nowrap">PTS / MSDQ</span>
          </div>
          <span className="text-[10px] text-[#64748b] block">Example: 1.00 MSDQ = 90 PTS</span>
        </div>

        {/* Min Conversion Limit */}
        <div className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-2">
          <label className="text-[11px] text-[#94a3b8] uppercase font-bold">
            Minimum Conversion Stake (PTS)
          </label>
          <input
            type="number"
            min="10"
            step="10"
            value={min}
            onChange={(e) => setMin(Math.max(10, parseInt(e.target.value) || 10))}
            className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white font-mono text-sm"
          />
          <span className="text-[10px] text-[#64748b] block">Users cannot convert less than this amount.</span>
        </div>

        {/* Max Conversion Limit */}
        <div className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-2">
          <label className="text-[11px] text-[#94a3b8] uppercase font-bold">
            Maximum Conversion Cap (PTS / TX)
          </label>
          <input
            type="number"
            min="100"
            step="500"
            value={max}
            onChange={(e) => setMax(Math.max(100, parseInt(e.target.value) || 100))}
            className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white font-mono text-sm"
          />
          <span className="text-[10px] text-[#64748b] block">Anti-drain safety ceiling per swap request.</span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-[#10b981]/20 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          <span>Save Conversion Parameters</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 2. LIVE GAMES & ROOMS MONITOR TAB
// ==========================================
interface LiveGamesTabProps {
  gameConfigs: GameConfig[];
  onToggleGame: (gameId: string) => void;
  onUpdateGameLimits: (gameId: string, minBet: number, maxBet: number) => void;
}

export const AdminLiveGamesTab: React.FC<LiveGamesTabProps> = ({
  gameConfigs,
  onToggleGame,
  onUpdateGameLimits,
}) => {
  const [selectedGame, setSelectedGame] = useState<string>("crash");
  const [editMin, setEditMin] = useState<number>(10);
  const [editMax, setEditMax] = useState<number>(5000);

  const activeGame = gameConfigs.find((g) => g.id === selectedGame) || gameConfigs[0];

  const liveRooms = [
    { id: "room-crash-01", game: "Rocket Crash", activeUsers: 48, status: "FLYING (3.42x)", pot: "14,800 PTS" },
    { id: "room-ludo-102", game: "Cyber Ludo Duel", activeUsers: 4, status: "IN_MATCH (Turn 18)", pot: "2,000 PTS" },
    { id: "room-dice-88", game: "Cyber Dice", activeUsers: 19, status: "ACCEPTING_BETS", pot: "8,400 PTS" },
    { id: "room-wheel-44", game: "Fortune Wheel", activeUsers: 31, status: "SPINNING", pot: "12,250 PTS" },
    { id: "room-pred-09", game: "Number Prediction", activeUsers: 14, status: "ROUND_SETTLING", pot: "5,600 PTS" },
  ];

  return (
    <div className="space-y-4 font-mono text-xs text-[#dfe2ee]">
      <div className="p-4 rounded-2xl bg-[#171b24] border border-[#2a3447] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Live Multiplayer Game Rooms &amp; Parameters</h3>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">
            Real-time consensus telemetry, active participant pools, and risk limit controls.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 animate-pulse">
          LIVE NODES SYNCED
        </span>
      </div>

      {/* Active Game Rooms Telemetry Table */}
      <div className="rounded-2xl bg-[#131823] border border-[#2a3447] p-4 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Multiplayer Game Rooms</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a3447]/60 text-[#94a3b8]">
                <th className="py-2 px-3">Room ID</th>
                <th className="py-2 px-3">Game</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Participants</th>
                <th className="py-2 px-3 text-right">Pot Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3447]/40">
              {liveRooms.map((room) => (
                <tr key={room.id} className="hover:bg-[#1e2738]/40">
                  <td className="py-2.5 px-3 font-bold text-white">{room.id}</td>
                  <td className="py-2.5 px-3 text-[#38bdf8] font-semibold">{room.game}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10b981]/15 text-[#10b981]">
                      {room.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#dfe2ee]">{room.activeUsers} Players</td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#f59e0b]">{room.pot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Game Parameter Controls */}
      <div className="rounded-2xl bg-[#131823] border border-[#2a3447] p-4 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Game Engine Toggles &amp; Bounds</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {gameConfigs.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setSelectedGame(g.id);
                setEditMin(g.minBet);
                setEditMax(g.maxBet);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedGame === g.id
                  ? "bg-[#38bdf8]/20 border-[#38bdf8] text-white"
                  : "bg-[#171b24] border-[#2a3447] text-[#94a3b8] hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{g.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${g.enabled ? "bg-[#10b981]" : "bg-[#ef4444]"}`}
                />
              </div>
              <div className="text-[10px] text-[#64748b] mt-1">
                {g.minBet} - {g.maxBet} PTS
              </div>
            </button>
          ))}
        </div>

        {activeGame && (
          <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#2a3447] space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Configuring {activeGame.name}</span>
              <button
                onClick={() => onToggleGame(activeGame.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  activeGame.enabled ? "bg-[#ef4444]/20 text-[#ef4444]" : "bg-[#10b981]/20 text-[#10b981]"
                }`}
              >
                {activeGame.enabled ? "Disable Game" : "Enable Game"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#94a3b8] uppercase block">Min Bet (PTS)</label>
                <input
                  type="number"
                  value={editMin}
                  onChange={(e) => setEditMin(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#131823] border border-[#2a3447] text-white mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#94a3b8] uppercase block">Max Bet (PTS)</label>
                <input
                  type="number"
                  value={editMax}
                  onChange={(e) => setEditMax(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#131823] border border-[#2a3447] text-white mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => onUpdateGameLimits(activeGame.id, editMin, editMax)}
                className="px-4 py-1.5 rounded-xl bg-[#38bdf8] text-[#0f172a] font-bold text-xs hover:brightness-110"
              >
                Save Limits
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. ANNOUNCEMENT SYSTEM TAB
// ==========================================
interface AnnouncementsTabProps {
  announcements: Announcement[];
  onAddAnnouncement: (announcement: Announcement) => void;
  onToggleAnnouncement: (id: string) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export const AdminAnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcements,
  onAddAnnouncement,
  onToggleAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [badge, setBadge] = useState<Announcement["badge"]>("NEW");
  const [actionLink, setActionLink] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      description: content.trim(),
      content: content.trim(),
      date: "Just now",
      badge,
      active: true,
      createdAt: "Just now",
      actionLink: actionLink.trim() || undefined,
    };

    onAddAnnouncement(newAnn);
    setTitle("");
    setContent("");
    setActionLink("");
  };

  return (
    <div className="space-y-4 font-mono text-xs text-[#dfe2ee]">
      <div className="p-4 rounded-2xl bg-[#171b24] border border-[#2a3447]">
        <h3 className="text-sm font-bold text-white">Network Announcement Broadcaster</h3>
        <p className="text-[11px] text-[#94a3b8] mt-0.5">
          Broadcast protocol updates, halving alerts, and maintenance windows across client dashboards.
        </p>
      </div>

      {/* Creation Form */}
      <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Publish New Announcement</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] text-[#94a3b8] uppercase block">Announcement Title</label>
            <input
              type="text"
              placeholder="e.g. Epoch 4 Halving Threshold Approaching"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#94a3b8] uppercase block">Badge</label>
            <select
              value={badge}
              onChange={(e) => setBadge(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white mt-1"
            >
              <option value="NEW">NEW</option>
              <option value="HOT">HOT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="ALERT">ALERT</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-[#94a3b8] uppercase block">Announcement Body</label>
          <textarea
            rows={2}
            placeholder="Write the network message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white mt-1"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!title.trim() || !content.trim()}
            className="px-4 py-2 rounded-xl bg-[#38bdf8] text-[#0f172a] font-bold text-xs hover:brightness-110 disabled:opacity-40"
          >
            Publish Announcement
          </button>
        </div>
      </form>

      {/* Existing Announcements List */}
      <div className="rounded-2xl bg-[#131823] border border-[#2a3447] p-4 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Announcements</h4>
        <div className="divide-y divide-[#2a3447]/40">
          {announcements.map((ann) => (
            <div key={ann.id} className="py-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#f59e0b]/20 text-[#f59e0b]">
                    {ann.badge}
                  </span>
                  <span className="font-bold text-white text-xs">{ann.title}</span>
                  <span className="text-[10px] text-[#64748b]">{ann.createdAt}</span>
                </div>
                <p className="text-xs text-[#94a3b8]">{ann.content}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onToggleAnnouncement(ann.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                    ann.active ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#ef4444]/20 text-[#ef4444]"
                  }`}
                >
                  {ann.active ? "ACTIVE" : "INACTIVE"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. PUSH / IN-APP NOTIFICATION SENDER TAB
// ==========================================
interface NotificationsTabProps {
  onSendNotification: (notification: AppNotification) => void;
}

export const AdminNotificationsTab: React.FC<NotificationsTabProps> = ({
  onSendNotification,
}) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState<"all" | "miners" | "players">("all");
  const [type, setType] = useState<AppNotification["type"]>("mining");
  const [sentCount, setSentCount] = useState<number>(0);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      type,
      timestamp: "Just now",
      read: false,
    };

    onSendNotification(notif);
    setSentCount((prev) => prev + 1);
    setTitle("");
    setMessage("");
  };

  return (
    <div className="space-y-4 font-mono text-xs text-[#dfe2ee]">
      <div className="p-4 rounded-2xl bg-[#171b24] border border-[#2a3447]">
        <h3 className="text-sm font-bold text-white">Direct Push &amp; In-App Telemetry Sender</h3>
        <p className="text-[11px] text-[#94a3b8] mt-0.5">
          Dispatch instant network alerts and cryptographic status updates directly to peer devices.
        </p>
      </div>

      {sentCount > 0 && (
        <div className="p-3 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-xs font-bold">
          Dispatched {sentCount} notification relay(s) across target subnets!
        </div>
      )}

      <form onSubmit={handleBroadcast} className="p-4 rounded-2xl bg-[#131823] border border-[#2a3447] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] text-[#94a3b8] uppercase block">Notification Title</label>
            <input
              type="text"
              placeholder="e.g. Hash Surge Multiplier Active!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#94a3b8] uppercase block">Target Audience</label>
            <select
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white mt-1"
            >
              <option value="all">All Enclave Users (1,420 Nodes)</option>
              <option value="miners">Active Miners (980 Nodes)</option>
              <option value="players">GameFi Participants (440 Nodes)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-[#94a3b8] uppercase block">Notification Body</label>
          <textarea
            rows={2}
            placeholder="Type notification message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white mt-1"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!title.trim() || !message.trim()}
            className="px-4 py-2 rounded-xl bg-[#f59e0b] text-[#0f172a] font-bold text-xs hover:brightness-110 disabled:opacity-40 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>Broadcast Notification</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// 5. KYC VERIFICATION AUDIT & MANAGEMENT TAB
// ==========================================
export interface KycRecord {
  id: string;
  userId: string;
  userEmail: string;
  legalName: string;
  dob: string;
  nationality: string;
  idType: string;
  idNumber: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";
  submittedAt: string;
  reviewNotes?: string;
}

interface AdminKycManagementTabProps {
  kycApplications?: KycRecord[];
  onReviewKyc: (
    kycId: string,
    userId: string,
    status: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION",
    notes: string
  ) => void;
}

export const AdminKycManagementTab: React.FC<AdminKycManagementTabProps> = ({
  kycApplications = [],
  onReviewKyc,
}) => {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("ALL");
  const [selectedKyc, setSelectedKyc] = useState<KycRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");

  // Default demo records if list is empty
  const defaultRecords: KycRecord[] = [
    {
      id: "kyc-001",
      userId: "user-abc-1",
      userEmail: "alex.vance@msdq.network",
      legalName: "Alexander Vance",
      dob: "1994-06-12",
      nationality: "United Kingdom",
      idType: "Passport",
      idNumber: "UK89124018A",
      status: "PENDING",
      submittedAt: "Today 10:45 UTC",
    },
    {
      id: "kyc-002",
      userId: "user-abc-2",
      userEmail: "miner.sarah@msdq.network",
      legalName: "Sarah Connor",
      dob: "1991-11-03",
      nationality: "Canada",
      idType: "National ID",
      idNumber: "CAN4491029",
      status: "VERIFIED",
      submittedAt: "Yesterday 18:20 UTC",
    },
  ];

  const allRecords = kycApplications.length > 0 ? kycApplications : defaultRecords;

  const filtered = allRecords.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const handleAction = (status: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION") => {
    if (!selectedKyc) return;
    onReviewKyc(
      selectedKyc.id,
      selectedKyc.userId,
      status,
      reviewNotes.trim() || (status === "VERIFIED" ? "Approved by Consensus Protocol Admin" : "Identity document mismatch or illegible image.")
    );
    setSelectedKyc(null);
    setReviewNotes("");
  };

  return (
    <div className="space-y-4 font-mono text-xs text-[#dfe2ee]">
      <div className="p-4 rounded-2xl bg-[#171b24] border border-[#2a3447] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">Sovereign KYC &amp; Identity Review Enclave</h3>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">
            Audit national identity records, verify anti-Sybil uniqueness, and manage KYC approval status.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {(["ALL", "PENDING", "VERIFIED", "REJECTED"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                filter === t
                  ? "bg-[#38bdf8] text-[#0f172a]"
                  : "bg-[#0a0e17] text-[#94a3b8] hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Review Modal if selected */}
      {selectedKyc && (
        <div className="p-4 rounded-2xl bg-[#131823] border border-[#38bdf8]/50 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#2a3447] pb-2">
            <span className="font-bold text-white text-sm">Reviewing Application: {selectedKyc.legalName}</span>
            <button
              onClick={() => setSelectedKyc(null)}
              className="text-[#94a3b8] hover:text-white"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-[#0a0e17]">
              <span className="text-[#64748b] block text-[9px] uppercase">Email</span>
              <span className="text-white truncate block">{selectedKyc.userEmail}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0a0e17]">
              <span className="text-[#64748b] block text-[9px] uppercase">Nationality</span>
              <span className="text-white">{selectedKyc.nationality}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0a0e17]">
              <span className="text-[#64748b] block text-[9px] uppercase">Document</span>
              <span className="text-white">{selectedKyc.idType}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#0a0e17]">
              <span className="text-[#64748b] block text-[9px] uppercase">Serial Number</span>
              <span className="text-[#38bdf8] font-bold">{selectedKyc.idNumber}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#94a3b8] uppercase block mb-1">
              Admin Determination Notes / Rejection Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Document verified successfully / Blurred photo / Name mismatch"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => handleAction("VERIFIED")}
              className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#0f141f] font-black text-xs flex items-center gap-1 shadow-lg shadow-[#10b981]/20"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Approve (Level 2 Verified)</span>
            </button>
            <button
              onClick={() => handleAction("REJECTED")}
              className="px-4 py-2 rounded-xl bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border border-[#ef4444]/40 font-bold text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Reject Submission</span>
            </button>
            <button
              onClick={() => handleAction("NEEDS_RESUBMISSION")}
              className="px-4 py-2 rounded-xl bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] border border-[#f59e0b]/40 font-bold text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Request Clearer Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="rounded-2xl bg-[#131823] border border-[#2a3447] overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#2a3447] text-[#64748b] uppercase text-[9px] bg-[#0a0e17]">
              <th className="py-2.5 px-3">Applicant Name</th>
              <th className="py-2.5 px-3">Account Email</th>
              <th className="py-2.5 px-3">Document Info</th>
              <th className="py-2.5 px-3">Submitted</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a3447]/50">
            {filtered.map((app) => (
              <tr key={app.id} className="hover:bg-[#1a2130] transition-colors">
                <td className="py-3 px-3 font-bold text-white">{app.legalName}</td>
                <td className="py-3 px-3 text-[#94a3b8]">{app.userEmail}</td>
                <td className="py-3 px-3">
                  <span className="text-white">{app.idType}</span>{" "}
                  <span className="text-[#38bdf8] font-bold">({app.idNumber})</span>
                </td>
                <td className="py-3 px-3 text-[#64748b]">{app.submittedAt}</td>
                <td className="py-3 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      app.status === "VERIFIED"
                        ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30"
                        : app.status === "PENDING"
                        ? "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30"
                        : "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30"
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => {
                      setSelectedKyc(app);
                      setReviewNotes(app.reviewNotes || "");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[#38bdf8] font-bold text-[10px]"
                  >
                    Inspect &amp; Decide
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
