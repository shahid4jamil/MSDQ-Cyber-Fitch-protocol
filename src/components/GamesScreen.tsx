import React, { useState, useEffect } from "react";
import { CrashGameModule } from "./games/CrashGameModule";
import { LudoGameModule } from "./games/LudoGameModule";
import {
  CyberDiceGame,
  QuantumCoinFlipGame,
  LuckyFortuneWheelGame,
  NumberPredictionGame,
  ColorPredictionGame,
} from "./games/MiniGames";
import { gameAudio } from "../lib/gameAudio";
import { GameConfig } from "../types";
import { defaultGameConfigs } from "../data/mockData";

interface GamesScreenProps {
  gameVaultBalance: number;
  onUpdateVaultBalance: (delta: number) => void;
  onNavigate: (screen: any) => void;
  userId?: string;
  userName?: string;
  gameConfigs?: GameConfig[];
}

export type ActiveGameTab =
  | "crash"
  | "ludo"
  | "dice"
  | "coinflip"
  | "wheel"
  | "numbers"
  | "colors"
  | "ledger";

type GameCategory =
  | "all"
  | "popular"
  | "new"
  | "crash"
  | "board"
  | "arcade"
  | "luck"
  | "multiplayer";

interface GameInfo {
  id: ActiveGameTab;
  title: string;
  category: "crash" | "board" | "arcade" | "luck";
  isPopular?: boolean;
  isNew?: boolean;
  isMultiplayer?: boolean;
  description: string;
  rules: string;
  onlinePlayers: number;
  multiplierText: string;
  icon: string;
  iconBg: string;
  minBet: number;
  maxBet: number;
}

const ALL_GAMES_METADATA: GameInfo[] = [
  {
    id: "crash",
    title: "Rocket Crash",
    category: "crash",
    isPopular: true,
    isMultiplayer: true,
    description: "Watch the rocket multiplier climb. Cash out before the sudden hyper-drive explosion!",
    rules: "Place stake in PTS before the round starts. Cash out anytime as the multiplier climbs up to 250x. If the rocket explodes before you cash out, the stake is burned.",
    onlinePlayers: 482,
    multiplierText: "Up to 250x",
    icon: "rocket_launch",
    iconBg: "from-[#ef4444] to-[#f97316]",
    minBet: 10,
    maxBet: 5000,
  },
  {
    id: "ludo",
    title: "Cyber Ludo Arena",
    category: "board",
    isPopular: true,
    isMultiplayer: true,
    description: "Classic 4-player cyber-board strategy with real stakes and live PvP consensus matching.",
    rules: "Roll the quantum die to navigate your pawns from spawn to home sanctuary. Capture opponent tokens to claim the table escrow pot.",
    onlinePlayers: 310,
    multiplierText: "2-4 Players PvP",
    icon: "casino",
    iconBg: "from-[#10b981] to-[#059669]",
    minBet: 20,
    maxBet: 2500,
  },
  {
    id: "dice",
    title: "Cyber Dice Matrix",
    category: "arcade",
    isPopular: false,
    description: "Roll under or over your custom target number with dynamic win chance & multipliers.",
    rules: "Select roll target (1-99) and direction. Payout scales mathematically based on probability (up to 98x).",
    onlinePlayers: 194,
    multiplierText: "Up to 98x",
    icon: "sports_esports",
    iconBg: "from-[#38bdf8] to-[#2563eb]",
    minBet: 10,
    maxBet: 2000,
  },
  {
    id: "wheel",
    title: "Lucky Fortune Wheel",
    category: "luck",
    isPopular: true,
    isNew: false,
    description: "Spin the quantum cyber-wheel across 8 segments for instant multipliers and jackpot tiles.",
    rules: "Select your stake and spin. The wheel comes to rest on 0.5x, 1x, 2x, 5x, or the 10x Mega Jackpot.",
    onlinePlayers: 220,
    multiplierText: "10x Mega",
    icon: "donut_large",
    iconBg: "from-[#f59e0b] to-[#b45309]",
    minBet: 20,
    maxBet: 1000,
  },
  {
    id: "coinflip",
    title: "Quantum Coin Flip",
    category: "luck",
    isPopular: false,
    isNew: true,
    description: "Instant 50/50 binary entropy toss with provably fair SHA-256 pre-commit verification.",
    rules: "Choose Heads or Tails. Instant resolution with 1.96x fair payout after 2% network burn.",
    onlinePlayers: 145,
    multiplierText: "1.96x",
    icon: "autorenew",
    iconBg: "from-[#a855f7] to-[#7c3aed]",
    minBet: 10,
    maxBet: 1500,
  },
  {
    id: "colors",
    title: "Color Spectrum Arena",
    category: "luck",
    isNew: true,
    description: "Predict the next consensus laser beam color: Neon Green, Cyber Violet, or Crimson Red.",
    rules: "Red/Green payout 2.0x, Violet jackpot tile pays 4.5x.",
    onlinePlayers: 124,
    multiplierText: "2x - 4.5x",
    icon: "palette",
    iconBg: "from-[#ec4899] to-[#be185d]",
    minBet: 10,
    maxBet: 1000,
  },
  {
    id: "numbers",
    title: "Number Prediction",
    category: "arcade",
    description: "Pick single digits or ranges from 0 to 9 with high-precision statistical payouts.",
    rules: "Exact digit match yields 9.0x payout. Odd/Even or High/Low gives 1.96x.",
    onlinePlayers: 85,
    multiplierText: "9.0x",
    icon: "pin_invoke",
    iconBg: "from-[#06b6d4] to-[#0891b2]",
    minBet: 10,
    maxBet: 500,
  },
];

export const GamesScreen: React.FC<GamesScreenProps> = ({
  gameVaultBalance,
  onUpdateVaultBalance,
  onNavigate,
  userId = "node-8842",
  userName = "Miner_#8842",
  gameConfigs = defaultGameConfigs,
}) => {
  // Navigation: activeGameTab is null when in Game Center Lobby, or string when playing
  const [activeTab, setActiveTab] = useState<ActiveGameTab | null>(null);
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameInfo | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<GameCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteGameIds, setFavoriteGameIds] = useState<string[]>(["crash", "wheel"]);
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(["crash", "ludo"]);

  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(gameAudio.getMuted());

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    gameAudio.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteGameIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  // Launch a game
  const handleLaunchGame = (gameId: ActiveGameTab) => {
    setActiveTab(gameId);
    setSelectedGameForModal(null);
    if (!recentlyPlayedIds.includes(gameId)) {
      setRecentlyPlayedIds((prev) => [gameId, ...prev.slice(0, 3)]);
    }
  };

  // Find active game configuration
  const currentConfig = gameConfigs.find((g) => g.id === activeTab);

  useEffect(() => {
    if (activeTab === "ledger") {
      setIsLoadingLedger(true);
      fetch(`/api/games/ledger?userId=${encodeURIComponent(userId)}`)
        .then((res) => (res.ok ? res.json() : { entries: [] }))
        .then((data) => setLedgerEntries(data.entries || []))
        .catch(() => setLedgerEntries([]))
        .finally(() => setIsLoadingLedger(false));
    }
  }, [activeTab, userId]);

  // Handler for bets placed in mini games
  const handleMiniGameBet = (stake: number, win: boolean, payout: number, gameName: string) => {
    const delta = win ? payout - stake : -stake;
    onUpdateVaultBalance(delta);

    // Record to ledger state
    const newEntry = {
      id: `rcpt-${Date.now().toString(36)}`,
      game: gameName,
      type: win ? "WIN_PAYOUT" : "BET_LOSS",
      amount: delta,
      note: win ? `Won in ${gameName} (+${payout} PTS)` : `Stake lost in ${gameName}`,
      auditHash: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLedgerEntries((prev) => [newEntry, ...prev]);
  };

  const categories: { id: GameCategory; label: string; icon: string }[] = [
    { id: "all", label: "All Games", icon: "sports_esports" },
    { id: "popular", label: "Popular", icon: "local_fire_department" },
    { id: "new", label: "New", icon: "sparkles" },
    { id: "crash", label: "Crash", icon: "rocket_launch" },
    { id: "board", label: "Board", icon: "casino" },
    { id: "arcade", label: "Arcade", icon: "videogame_asset" },
    { id: "luck", label: "Luck", icon: "stars" },
    { id: "multiplayer", label: "Multiplayer", icon: "groups" },
  ];

  // Filter games based on criteria
  const filteredGames = ALL_GAMES_METADATA.filter((game) => {
    // Category check
    let matchesCategory = true;
    if (activeCategory === "popular") matchesCategory = !!game.isPopular;
    else if (activeCategory === "new") matchesCategory = !!game.isNew;
    else if (activeCategory === "multiplayer") matchesCategory = !!game.isMultiplayer;
    else if (activeCategory !== "all") matchesCategory = game.category === activeCategory;

    // Search check
    const matchesSearch =
      searchQuery.trim() === "" ||
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Favorites check
    const matchesFav = !favoritesOnly || favoriteGameIds.includes(game.id);

    return matchesCategory && matchesSearch && matchesFav;
  });

  const totalOnlinePlayers = ALL_GAMES_METADATA.reduce((acc, g) => acc + g.onlinePlayers, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-6">
      {/* Top Banner with Game Vault & Telemetry */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#131823] via-[#1a2232] to-[#131823] rounded-3xl border border-[#2a3447] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#10b981] uppercase">
              Consensus GameFi Arena • Provably Fair
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight mt-0.5">
            MSDQ Cyber Game Center
          </h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Multiplayer betting games powered by SHA-256 pre-committed entropy and server consensus.
          </p>
        </div>

        {/* Game Vault Balance & Controls */}
        <div className="bg-[#0a0e17] border border-[#2a3447] rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#94a3b8] block">
              Game Vault Balance
            </span>
            <div className="text-base font-mono font-bold text-[#10b981]">
              {gameVaultBalance.toLocaleString()}{" "}
              <span className="text-xs font-normal text-[#94a3b8]">PTS</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border text-xs font-mono transition-colors flex items-center justify-center ${
                isMuted
                  ? "bg-[#1e2738] border-[#ef4444]/40 text-[#ef4444]"
                  : "bg-[#1e2738] border-[#10b981]/40 text-[#10b981]"
              }`}
              title={isMuted ? "Sound Effects Muted" : "Sound Effects Enabled"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isMuted ? "volume_off" : "volume_up"}
              </span>
            </button>

            <button
              onClick={() => onNavigate("wallet")}
              className="px-3 py-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[11px] font-mono text-[#38bdf8] border border-[#2a3447] transition-colors"
            >
              Deposit
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: GAME CENTER LOBBY (When no active game is selected) */}
      {activeTab === null ? (
        <div className="space-y-6">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#10b981] text-[24px]">group</span>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Live Players</span>
                <span className="text-sm font-mono font-bold text-white">
                  {totalOnlinePlayers.toLocaleString()} Online
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#f59e0b] text-[24px]">verified</span>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Fairness</span>
                <span className="text-sm font-mono font-bold text-white">SHA-256 Verified</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex items-center gap-3">
              <span className="material-symbols-outlined text-[#38bdf8] text-[24px]">local_fire_department</span>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Top Multiplier</span>
                <span className="text-sm font-mono font-bold text-white">250x Rocket</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("ledger")}
              className="p-3.5 rounded-2xl bg-[#131823] hover:bg-[#1e2738] border border-[#2a3447] flex items-center gap-3 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[#a855f7] text-[24px]">receipt_long</span>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">Audit Ledger</span>
                <span className="text-xs font-mono font-bold text-[#a855f7] flex items-center gap-0.5">
                  View Receipts →
                </span>
              </div>
            </div>
          </div>

          {/* Categories Horizontal Scroller & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Horizontal Category Scroller */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`py-2 px-3.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#38bdf8] text-[#0f172a] shadow-md shadow-[#38bdf8]/20 font-black"
                      : "bg-[#131823] text-[#94a3b8] hover:text-white hover:bg-[#1e2738] border border-[#2a3447]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Controls: Search & Favorites Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1 shrink-0 ${
                  favoritesOnly
                    ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]"
                    : "bg-[#131823] border-[#2a3447] text-[#94a3b8] hover:text-white"
                }`}
                title="Filter Favorite Games"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {favoritesOnly ? "favorite" : "favorite_border"}
                </span>
                <span>Favorites</span>
              </button>

              <div className="relative w-full md:w-56">
                <span className="material-symbols-outlined absolute left-3 top-2 text-[#94a3b8] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#131823] border border-[#2a3447] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>
          </div>

          {/* Recently Played Row */}
          {recentlyPlayedIds.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                Recently Played
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                {recentlyPlayedIds.map((id) => {
                  const game = ALL_GAMES_METADATA.find((g) => g.id === id);
                  if (!game) return null;
                  return (
                    <div
                      key={game.id}
                      onClick={() => handleLaunchGame(game.id)}
                      className="px-3.5 py-2 rounded-2xl bg-[#131823] hover:bg-[#1e2738] border border-[#2a3447] hover:border-[#38bdf8]/50 flex items-center gap-2.5 cursor-pointer shrink-0 transition-all"
                    >
                      <span className="material-symbols-outlined text-[#38bdf8] text-[18px]">
                        {game.icon}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">{game.title}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-[#0a0e17] text-[#10b981]">
                        {game.multiplierText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Games Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGames.length === 0 ? (
              <div className="col-span-full p-12 text-center rounded-3xl bg-[#131823] border border-[#2a3447] text-[#94a3b8] font-mono text-xs space-y-2">
                <span className="material-symbols-outlined text-[36px] text-[#64748b] block mx-auto">
                  sports_esports
                </span>
                <span>No games found matching your current filters.</span>
              </div>
            ) : (
              filteredGames.map((game) => {
                const isFav = favoriteGameIds.includes(game.id);
                return (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGameForModal(game)}
                    className="p-5 rounded-3xl bg-[#131823] border border-[#2a3447] hover:border-[#38bdf8]/50 shadow-xl hover:shadow-[0_0_25px_rgba(56,189,248,0.15)] transition-all flex flex-col justify-between gap-4 cursor-pointer group relative overflow-hidden"
                  >
                    {/* Top Row: Icon, Title, Multiplier badge & Favorite */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${game.iconBg} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-105 transition-transform`}
                          >
                            <span className="material-symbols-outlined text-[26px]">
                              {game.icon}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#0a0e17] text-[#94a3b8] border border-[#2a3447]">
                                {game.category}
                              </span>
                              {game.isPopular && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40">
                                  POPULAR
                                </span>
                              )}
                              {game.isNew && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                                  NEW
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-mono font-bold text-white mt-1 group-hover:text-[#38bdf8] transition-colors">
                              {game.title}
                            </h3>
                          </div>
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => toggleFavorite(game.id, e)}
                          className={`p-1.5 rounded-xl border transition-colors ${
                            isFav
                              ? "bg-[#ef4444]/20 border-[#ef4444]/60 text-[#ef4444]"
                              : "bg-[#0a0e17] border-[#2a3447] text-[#64748b] hover:text-white"
                          }`}
                          title={isFav ? "Remove Favorite" : "Add to Favorites"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isFav ? "favorite" : "favorite_border"}
                          </span>
                        </button>
                      </div>

                      <p className="text-xs text-[#94a3b8] mt-3 line-clamp-2 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    {/* Bottom Metadata & Play Button */}
                    <div className="pt-3 border-t border-[#2a3447]/60 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#10b981]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                          <span>{game.onlinePlayers} playing</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-white block">
                          {game.multiplierText}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchGame(game.id);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0284c7] hover:brightness-110 text-[#0f172a] font-mono text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        <span>Play</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: ACTIVE GAME ARENA (User is inside a game) */
        <div className="space-y-4">
          {/* Active Game Header Bar with Back Button */}
          <div className="p-3.5 rounded-2xl bg-[#131823] border border-[#2a3447] flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab(null)}
                className="py-1.5 px-3 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] border border-[#2a3447] text-xs font-mono font-bold text-[#38bdf8] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Game Center</span>
              </button>

              <div className="hidden sm:block h-6 w-[1px] bg-[#2a3447]" />

              <div>
                <span className="text-xs font-mono font-bold text-white capitalize block">
                  {activeTab === "ledger"
                    ? "Audit Ledger"
                    : ALL_GAMES_METADATA.find((g) => g.id === activeTab)?.title || activeTab}
                </span>
                <span className="text-[10px] font-mono text-[#94a3b8]">
                  Provably Fair Node Session
                </span>
              </div>
            </div>

            {/* Quick switcher to other games */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[50%]">
              {ALL_GAMES_METADATA.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleLaunchGame(g.id)}
                  className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
                    activeTab === g.id
                      ? "bg-[#38bdf8] text-[#0f172a] border-[#38bdf8]"
                      : "bg-[#0a0e17] border-[#2a3447] text-[#94a3b8] hover:text-white"
                  }`}
                  title={g.title}
                >
                  <span className="material-symbols-outlined text-[16px]">{g.icon}</span>
                </button>
              ))}

              <button
                onClick={() => setActiveTab("ledger")}
                className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
                  activeTab === "ledger"
                    ? "bg-[#a855f7] text-white border-[#a855f7]"
                    : "bg-[#0a0e17] border-[#2a3447] text-[#94a3b8] hover:text-white"
                }`}
                title="Audit Ledger"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              </button>
            </div>
          </div>

          {/* GAME STATUS / MAINTENANCE CHECK */}
          {currentConfig && !currentConfig.enabled && activeTab !== "ledger" && (
            <div className="p-6 bg-[#ef4444]/10 border border-[#ef4444]/40 rounded-3xl text-center space-y-3 shadow-xl">
              <span className="material-symbols-outlined text-[42px] text-[#ef4444]">
                build_circle
              </span>
              <h3 className="text-lg font-mono font-black text-white">
                Arena Maintenance in Progress
              </h3>
              <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                {currentConfig.maintenanceMessage ||
                  "This game arena is undergoing sovereign consensus sync. Try our other provably fair games!"}
              </p>
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-2 rounded-xl bg-[#1e2738] text-xs font-mono font-bold text-white border border-[#2a3447]"
              >
                Return to Game Center
              </button>
            </div>
          )}

          {/* ACTIVE GAME MODULES */}
          {(!currentConfig || currentConfig.enabled) && (
            <>
              {activeTab === "crash" && (
                <CrashGameModule
                  userId={userId}
                  userName={userName}
                  userBalance={gameVaultBalance}
                  onBalanceChange={(newBalance) =>
                    onUpdateVaultBalance(newBalance - gameVaultBalance)
                  }
                  onOpenLedger={() => setActiveTab("ledger")}
                />
              )}

              {activeTab === "ludo" && (
                <LudoGameModule
                  userId={userId}
                  userName={userName}
                  userBalance={gameVaultBalance}
                  onBalanceChange={(newBalance) =>
                    onUpdateVaultBalance(newBalance - gameVaultBalance)
                  }
                  onOpenLedger={() => setActiveTab("ledger")}
                />
              )}

              {activeTab === "dice" && (
                <CyberDiceGame
                  gameId="dice"
                  availableBalance={gameVaultBalance}
                  onBetPlaced={handleMiniGameBet}
                  minBet={currentConfig?.minBet || 10}
                  maxBet={currentConfig?.maxBet || 2000}
                />
              )}

              {activeTab === "coinflip" && (
                <QuantumCoinFlipGame
                  gameId="coinflip"
                  availableBalance={gameVaultBalance}
                  onBetPlaced={handleMiniGameBet}
                  minBet={currentConfig?.minBet || 10}
                  maxBet={currentConfig?.maxBet || 1500}
                />
              )}

              {activeTab === "wheel" && (
                <LuckyFortuneWheelGame
                  gameId="wheel"
                  availableBalance={gameVaultBalance}
                  onBetPlaced={handleMiniGameBet}
                  minBet={currentConfig?.minBet || 20}
                  maxBet={currentConfig?.maxBet || 1000}
                />
              )}

              {activeTab === "numbers" && (
                <NumberPredictionGame
                  gameId="numbers"
                  availableBalance={gameVaultBalance}
                  onBetPlaced={handleMiniGameBet}
                  minBet={currentConfig?.minBet || 10}
                  maxBet={currentConfig?.maxBet || 500}
                />
              )}

              {activeTab === "colors" && (
                <ColorPredictionGame
                  gameId="colors"
                  availableBalance={gameVaultBalance}
                  onBetPlaced={handleMiniGameBet}
                  minBet={currentConfig?.minBet || 10}
                  maxBet={currentConfig?.maxBet || 1000}
                />
              )}
            </>
          )}

          {/* PROVABLY FAIR AUDIT LEDGER */}
          {activeTab === "ledger" && (
            <div className="bg-[#131823] p-5 rounded-3xl border border-[#2a3447] space-y-4 shadow-xl font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#2a3447]/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Cryptographic GameFi Audit Ledger
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    Every stake, multiplier win, and match outcome is permanently signed with
                    SHA-256 entropy.
                  </p>
                </div>
                <span className="text-[10px] text-[#10b981] bg-[#10b981]/15 px-2 py-0.5 rounded-md border border-[#10b981]/30">
                  Zero-Trust Audit
                </span>
              </div>

              {isLoadingLedger ? (
                <div className="text-center py-10 text-[#94a3b8]">
                  Querying cryptographic game ledger...
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-10 text-[#94a3b8]">
                  No game transactions logged yet. Play any game to generate consensus receipts!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#2a3447]/60 text-[#94a3b8]">
                        <th className="py-2.5 px-3">Receipt ID</th>
                        <th className="py-2.5 px-3">Game</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Details</th>
                        <th className="py-2.5 px-3 font-mono text-right">Audit Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3447]/40">
                      {ledgerEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-[#1e2738]/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">{e.id}</td>
                          <td className="py-2.5 px-3 uppercase text-[#38bdf8] font-semibold">
                            {e.game}
                          </td>
                          <td className="py-2.5 px-3 text-[#94a3b8]">{e.type}</td>
                          <td className="py-2.5 px-3 font-bold">
                            <span className={e.amount >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}>
                              {e.amount >= 0 ? `+${e.amount}` : e.amount} PTS
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#94a3b8] truncate max-w-xs">{e.note}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[9px] text-[#64748b] truncate max-w-[120px]">
                            {e.auditHash}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Responsible Gaming & Sandbox Banner */}
              <div className="p-4 bg-[#0a0e17] rounded-2xl border border-[#2a3447]/60 text-[11px] text-[#94a3b8] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#f59e0b]">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  <span>Fair Play &amp; Sovereign Sandbox Protocol</span>
                </div>
                <p className="leading-relaxed">
                  Game points (PTS) operate within the MSDQ Protocol Sandbox for mining simulation,
                  consensus testing, and decentralized game theory. Outcomes are mathematically
                  governed by secure PRNG and cannot be manipulated by client-side modifications.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME DETAILS MODAL (Before entering play) */}
      {selectedGameForModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedGameForModal(null)}
        >
          <div
            className="bg-[#131823] border border-[#2a3447] rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedGameForModal.iconBg} flex items-center justify-center text-white shadow-lg`}
                >
                  <span className="material-symbols-outlined text-[28px]">
                    {selectedGameForModal.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-mono font-bold text-white">
                    {selectedGameForModal.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#10b981]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                    <span>{selectedGameForModal.onlinePlayers} players online</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGameForModal(null)}
                className="p-1 text-[#94a3b8] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Game Specs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0a0e17] border border-[#2a3447]">
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                  Multiplier Potential
                </span>
                <span className="text-sm font-mono font-bold text-[#f59e0b]">
                  {selectedGameForModal.multiplierText}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#0a0e17] border border-[#2a3447]">
                <span className="text-[10px] font-mono uppercase text-[#94a3b8] block">
                  Bet Range
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {selectedGameForModal.minBet} - {selectedGameForModal.maxBet} PTS
                </span>
              </div>
            </div>

            {/* Rules Summary */}
            <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-[#94a3b8] block font-bold">
                Arena Rules &amp; Consensus
              </span>
              <p className="text-xs text-[#dfe2ee] leading-relaxed">
                {selectedGameForModal.rules}
              </p>
            </div>

            {/* Provably Fair Tag */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#10b981]">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Pre-committed SHA-256 seed guarantee</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setSelectedGameForModal(null)}
                className="flex-1 py-3 rounded-xl bg-[#1e2738] text-xs font-mono font-bold text-[#94a3b8] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLaunchGame(selectedGameForModal.id)}
                className="flex-2 py-3 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0284c7] hover:brightness-110 text-[#0f172a] font-mono text-xs font-black shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                <span>Enter Arena Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
