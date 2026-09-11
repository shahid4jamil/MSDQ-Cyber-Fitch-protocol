import React, { useState, useEffect, useRef } from "react";
import { LudoBoardCanvas } from "./LudoBoardCanvas";
import { LudoDice } from "./LudoDice";
import { gameAudio } from "../../lib/gameAudio";
import { LudoRoom, LudoPlayer } from "../../../server/games/types";
import { gameSyncManager, ConnectionStatus } from "../../lib/gameSyncManager";

interface LudoGameModuleProps {
  userId: string;
  userName: string;
  userBalance: number;
  onBalanceChange: (newBalance: number) => void;
  onOpenLedger?: () => void;
}

export const LudoGameModule: React.FC<LudoGameModuleProps> = ({
  userId,
  userName,
  userBalance,
  onBalanceChange,
}) => {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<any | null>(null);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [leaderboards, setLeaderboards] = useState<any>(null);
  const [completedHistory, setCompletedHistory] = useState<any[]>([]);

  // Lobby form state
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [createMode, setCreateMode] = useState<"2p" | "4p">("2p");
  const [createStake, setCreateStake] = useState<number>(50);
  const [createName, setCreateName] = useState<string>(`${userName}'s Arena`);
  const [isMatchmaking, setIsMatchmaking] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sub-tabs in Lobby: "play" | "rooms" | "leaderboard" | "history"
  const [lobbyTab, setLobbyTab] = useState<"play" | "rooms" | "leaderboard" | "history">("play");
  const [leaderboardTimeframe, setLeaderboardTimeframe] = useState<"daily" | "weekly" | "allTime">("allTime");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  const lastDiceRef = useRef<number | null>(null);
  const lastTurnPlayerRef = useRef<string | null>(null);

  // Authoritative real-time room state subscription via gameSyncManager
  // Zero duplicated document listeners, handles reconnects gracefully, cleans up on unmount
  useEffect(() => {
    if (!activeRoomId) return;

    const unsubscribe = gameSyncManager.subscribeToLudoRoom(
      activeRoomId,
      userId,
      (data) => {
        if (!data) {
          setActiveRoomId(null);
          setRoomState(null);
          return;
        }

        setRoomState(data);

        // Sound triggers
        if (data.currentDice !== lastDiceRef.current && data.currentDice !== null) {
          gameAudio.playDiceRoll();
          lastDiceRef.current = data.currentDice;
        }
        if (data.currentTurnPlayer?.id !== lastTurnPlayerRef.current) {
          lastTurnPlayerRef.current = data.currentTurnPlayer?.id || null;
        }

        // Winner trigger
        if (data.status === "COMPLETED" && data.winnerId === userId) {
          gameAudio.playVictorySound();
        }
      },
      (status) => {
        setConnectionStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeRoomId, userId]);

  // Subscribe to Ludo lobby streams (public rooms, leaderboards, match history)
  useEffect(() => {
    const unsubscribe = gameSyncManager.subscribeToLudoLobby(
      ({ rooms, leaderboards: lb, history }) => {
        setPublicRooms(rooms || []);
        if (lb) setLeaderboards(lb);
        setCompletedHistory(history || []);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleQuickMatch = async (mode: "2p" | "4p" = "2p") => {
    if (userBalance < createStake) {
      setFeedback({ type: "error", text: `Insufficient PTS balance for ${createStake} PTS entry.` });
      return;
    }

    setIsMatchmaking(true);
    setFeedback(null);
    gameAudio.playButtonTap();

    try {
      const res = await fetch("/api/games/ludo/quick-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, mode, entryFee: createStake }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", text: data.error || "Failed to find match." });
      } else {
        onBalanceChange(userBalance - createStake);
        setActiveRoomId(data.room.id);
      }
    } catch {
      setFeedback({ type: "error", text: "Matchmaking connection timeout." });
    } finally {
      setIsMatchmaking(false);
    }
  };

  const handleCreateRoom = async () => {
    if (userBalance < createStake) {
      setFeedback({ type: "error", text: `Insufficient PTS balance for ${createStake} PTS stake.` });
      return;
    }

    gameAudio.playButtonTap();
    setFeedback(null);

    try {
      const res = await fetch("/api/games/ludo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          name: createName || `${userName}'s Arena`,
          mode: createMode,
          entryFee: createStake,
          variant: "quick",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", text: data.error || "Room creation failed." });
      } else {
        onBalanceChange(userBalance - createStake);
        setActiveRoomId(data.room.id);
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to establish match node." });
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) {
      setFeedback({ type: "error", text: "Please enter a 6-character room code." });
      return;
    }

    gameAudio.playButtonTap();
    setFeedback(null);

    try {
      const res = await fetch("/api/games/ludo/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, codeOrId: joinCodeInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", text: data.error || "Invalid room code." });
      } else {
        setActiveRoomId(data.room.id);
      }
    } catch {
      setFeedback({ type: "error", text: "Error joining arena." });
    }
  };

  const handleRollDice = async () => {
    if (!activeRoomId || isRolling) return;
    setIsRolling(true);
    gameAudio.playDiceRoll();
    const rollStartTime = Date.now();

    try {
      const res = await fetch("/api/games/ludo/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoomId, userId }),
      });

      const data = await res.json();
      const elapsed = Date.now() - rollStartTime;
      if (elapsed < 650) {
        await new Promise((resolve) => setTimeout(resolve, 650 - elapsed));
      }

      if (!res.ok || !data.success) {
        setFeedback({ type: "error", text: data.error || "Roll rejected by engine." });
      } else {
        // Auto move if only 1 move available for effortless play after roll settled
        if (data.validMoves && data.validMoves.length === 1) {
          setTimeout(() => {
            handleMoveToken(data.validMoves[0]);
          }, 500);
        }
      }
    } catch {
      setFeedback({ type: "error", text: "Network error submitting roll." });
    } finally {
      setIsRolling(false);
    }
  };

  const handleMoveToken = async (tokenId: number) => {
    if (!activeRoomId) return;
    gameAudio.playTokenStep();

    try {
      const res = await fetch("/api/games/ludo/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoomId, userId, tokenId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", text: data.error || "Move rejected." });
      } else {
        if (data.moveRecord?.capturedPlayerName) {
          gameAudio.playCaptureZap();
        }
      }
    } catch {
      setFeedback({ type: "error", text: "Error submitting move." });
    }
  };

  const handleLeaveRoom = () => {
    gameAudio.playButtonTap();
    setActiveRoomId(null);
    setRoomState(null);
  };

  // --- RENDER 1: IN-GAME ACTIVE ARENA ---
  if (activeRoomId && roomState) {
    const isMyTurn = roomState.isMyTurn;
    const currentDice = roomState.currentDice;
    const hasRolled = roomState.hasRolled;
    const validMoves = roomState.validTokenMoves || [];
    const prizePool = Math.round(roomState.entryFee * (roomState.players?.length || 2) * 0.95);

    return (
      <div className="space-y-4 font-mono">
        {/* Match Top Bar */}
        <div className="flex items-center justify-between p-3.5 bg-[#171b24] rounded-2xl border border-[#3c4a42]/60 shadow-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 rounded-lg bg-[#222731] border border-[#3c4a42]/50 text-[#bbcabf] hover:text-white"
              title="Leave Room"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#dfe2ee]">{roomState.name}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#4edea3]/20 text-[#4edea3] text-[9px] font-bold">
                  CODE: {roomState.code}
                </span>
              </div>
              <span className="text-[10px] text-[#bbcabf]">
                {roomState.mode.toUpperCase()} Duel • Prize Pool: <strong className="text-[#4edea3]">{prizePool} PTS</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time Connection Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
                connectionStatus === "connected"
                  ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]"
                  : connectionStatus === "reconnecting"
                  ? "bg-[#ffb95f]/10 border-[#ffb95f]/30 text-[#ffb95f]"
                  : connectionStatus === "offline"
                  ? "bg-[#ffb4ab]/10 border-[#ffb4ab]/30 text-[#ffb4ab]"
                  : "bg-[#222731] border-[#3c4a42]/60 text-[#bbcabf]"
              }`}
              title={`Real-Time Match Synchronization: ${connectionStatus.toUpperCase()}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-[#4edea3] animate-pulse"
                    : connectionStatus === "reconnecting"
                    ? "bg-[#ffb95f] animate-ping"
                    : connectionStatus === "offline"
                    ? "bg-[#ffb4ab]"
                    : "bg-[#bbcabf]"
                }`}
              />
              <span className="uppercase text-[9px]">{connectionStatus}</span>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-[#86948a] uppercase block">Turn Timer</span>
              <span
                className={`text-sm font-bold ${
                  roomState.turnSecondsLeft <= 5 ? "text-[#ffb4ab] animate-ping" : "text-[#ffb95f]"
                }`}
              >
                {roomState.turnSecondsLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Players Turn Status HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {roomState.players?.map((p: LudoPlayer, idx: number) => {
            const isTurn = idx === roomState.currentTurnIndex;
            const homeCount = p.tokens.filter((t) => t.step === 56).length;

            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  isTurn
                    ? "bg-[#222731] border-[#4edea3] shadow-[0_0_15px_rgba(78,222,163,0.3)] scale-[1.02]"
                    : "bg-[#171b24] border-[#3c4a42]/40 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      p.color === "emerald"
                        ? "bg-[#4edea3]"
                        : p.color === "amber"
                        ? "bg-[#ffb95f]"
                        : p.color === "cyan"
                        ? "bg-[#4cd7f6]"
                        : "bg-[#ffb4ab]"
                    }`}
                  />
                  <span className="text-[9px] text-[#bbcabf]">
                    {homeCount}/2 Home
                  </span>
                </div>
                <div className="text-xs font-bold text-[#dfe2ee] truncate">
                  {p.name} {p.id === userId && "(You)"}
                </div>
                <div className="text-[9px] text-[#86948a] flex items-center justify-between mt-1">
                  <span>{p.isBot ? "AI Node" : "Live Player"}</span>
                  {isTurn && (
                    <span className="text-[#4edea3] font-bold animate-pulse">TURNING</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Central Arena: 15x15 Vector Board with Embedded Center Dice */}
        <div className="relative">
          <LudoBoardCanvas
            players={roomState.players || []}
            currentTurnPlayerId={roomState.currentTurnPlayer?.id}
            currentTurnPlayerColor={roomState.currentTurnPlayer?.color}
            validTokenMoves={validMoves}
            onSelectToken={handleMoveToken}
            isMyTurn={isMyTurn}
            currentDice={currentDice}
            hasRolled={hasRolled}
            isRolling={isRolling}
            onRollDice={handleRollDice}
          />
        </div>

        {/* In-Game Action Bar: 3D Holographic Dice Roller & Turn Controls */}
        <div className="p-4 sm:p-5 bg-[#171b24] rounded-2xl border border-[#3c4a42]/70 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* 3D Dice Component */}
            <div className="shrink-0">
              <LudoDice
                value={currentDice}
                isRolling={isRolling}
                isMyTurn={isMyTurn}
                hasRolled={hasRolled}
                onRoll={handleRollDice}
                size="md"
                activePlayerColor={roomState.currentTurnPlayer?.color}
                showLabel={true}
                id="ludo-action-bar-dice"
              />
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMyTurn ? "bg-[#4edea3] animate-ping" : "bg-[#ffb95f]"
                  }`}
                />
                <span className="text-xs sm:text-sm font-bold text-[#dfe2ee]">
                  {isMyTurn
                    ? !hasRolled
                      ? "YOUR TURN TO ROLL!"
                      : validMoves.length > 0
                      ? `ROLLED A ${currentDice}! TAP A GLOWING TOKEN TO MOVE`
                      : `ROLLED A ${currentDice}. NO VALID MOVES.`
                    : `WAITING FOR ${roomState.currentTurnPlayer?.name?.toUpperCase() || "OPPONENT"}...`}
                </span>
              </div>
              <p className="text-[11px] text-[#bbcabf]">
                {isMyTurn && !hasRolled
                  ? "Tap the dice or press ROLL DICE below to test PRNG entropy."
                  : isMyTurn && hasRolled && validMoves.length > 0
                  ? `Tokens with dashed ring can advance by ${currentDice} nodes.`
                  : roomState.variant === "quick"
                  ? "Quick Match: First to get 2 tokens home wins!"
                  : "Classic Match: 4 tokens home to win."}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <button
              id="ludo-roll-dice-btn"
              type="button"
              onClick={handleRollDice}
              disabled={!isMyTurn || hasRolled || isRolling}
              className={`w-full md:w-auto px-7 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
                isMyTurn && !hasRolled && !isRolling
                  ? "bg-[#4edea3] text-[#003824] hover:bg-[#5ff0b4] hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(78,222,163,0.5)] cursor-pointer"
                  : isRolling
                  ? "bg-[#222731] text-[#4edea3] border border-[#4edea3]/40 cursor-not-allowed animate-pulse"
                  : isMyTurn && hasRolled
                  ? "bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/50 cursor-default font-bold"
                  : "bg-[#131720] text-[#86948a] border border-[#2a3444] cursor-not-allowed"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isRolling ? "animate-spin" : ""}`}>
                casino
              </span>
              <span>
                {isRolling
                  ? "ROLLING DICE..."
                  : isMyTurn && !hasRolled
                  ? "🎲 ROLL DICE"
                  : isMyTurn && hasRolled
                  ? `ROLLED ${currentDice} • CHOOSE TOKEN`
                  : `WAITING (${roomState.currentTurnPlayer?.name || "OPPONENT"})`}
              </span>
            </button>
          </div>
        </div>

        {/* Live Battle Feed */}
        <div className="p-3 bg-[#0f131c] rounded-2xl border border-[#3c4a42]/40 text-xs">
          <span className="text-[10px] text-[#86948a] uppercase tracking-wider block mb-1">
            Arena Event Feed
          </span>
          <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none pr-1">
            {roomState.logs?.map((l: string, i: number) => (
              <div key={i} className="text-[11px] text-[#bbcabf] truncate">
                • {l}
              </div>
            ))}
          </div>
        </div>

        {/* VICTORY MODAL */}
        {roomState.status === "COMPLETED" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#171b24] border border-[#4edea3] rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-[0_0_40px_rgba(78,222,163,0.3)]">
              <span className="material-symbols-outlined text-5xl text-[#ffb95f] animate-bounce">
                emoji_events
              </span>
              <h3 className="text-xl font-bold text-[#dfe2ee]">VICTORY DECLARED</h3>
              <p className="text-sm text-[#bbcabf]">
                <strong>{roomState.winnerName}</strong> has dominated the cyber arena and captured the{" "}
                <strong className="text-[#4edea3]">{prizePool} PTS</strong> bounty!
              </p>
              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 rounded-xl bg-[#4edea3] text-[#003824] font-bold text-sm hover:bg-[#5ff0b4] transition-all cursor-pointer shadow-lg"
              >
                Return to Game Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER 2: LOBBY & MATCHMAKING ---
  return (
    <div className="space-y-4 font-mono">
      {/* Sub-Navigation */}
      <div className="flex items-center justify-between border-b border-[#3c4a42]/50 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLobbyTab("play")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lobbyTab === "play" ? "bg-[#4edea3] text-[#003824]" : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Match Arena
          </button>
          <button
            onClick={() => setLobbyTab("rooms")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lobbyTab === "rooms" ? "bg-[#4edea3] text-[#003824]" : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Active Rooms ({publicRooms.length})
          </button>
          <button
            onClick={() => setLobbyTab("leaderboard")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lobbyTab === "leaderboard" ? "bg-[#4edea3] text-[#003824]" : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Leaderboards
          </button>
          <button
            onClick={() => setLobbyTab("history")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lobbyTab === "history" ? "bg-[#4edea3] text-[#003824]" : "text-[#bbcabf] hover:bg-[#222731]"
            }`}
          >
            Match Ledger
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#bbcabf]">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-colors ${
              connectionStatus === "connected"
                ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]"
                : connectionStatus === "reconnecting"
                ? "bg-[#ffb95f]/10 border-[#ffb95f]/30 text-[#ffb95f]"
                : connectionStatus === "offline"
                ? "bg-[#ffb4ab]/10 border-[#ffb4ab]/30 text-[#ffb4ab]"
                : "bg-[#222731] border-[#3c4a42]/60 text-[#bbcabf]"
            }`}
            title={`Lobby Network Synchronization: ${connectionStatus.toUpperCase()}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-[#4edea3] animate-pulse"
                  : connectionStatus === "reconnecting"
                  ? "bg-[#ffb95f] animate-ping"
                  : connectionStatus === "offline"
                  ? "bg-[#ffb4ab]"
                  : "bg-[#bbcabf]"
              }`}
            />
            <span className="uppercase text-[9px]">{connectionStatus}</span>
          </div>
          <div>
            Balance: <strong className="text-[#4edea3]">{userBalance.toLocaleString()} PTS</strong>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30"
              : "bg-[#ffb4ab]/15 text-[#ffb4ab] border border-[#ffb4ab]/30"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {feedback.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* LOBBY TAB: PLAY / MATCHMAKING */}
      {lobbyTab === "play" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Match Card */}
          <div className="p-5 bg-[#171b24] rounded-3xl border border-[#3c4a42]/60 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#4edea3]">bolt</span>
                <h3 className="text-sm font-bold text-[#dfe2ee]">Instant Quick Match</h3>
              </div>
              <p className="text-xs text-[#bbcabf] leading-relaxed">
                Connect directly with waiting miners or intelligent consensus bots. Instant queue, server-authoritative dice, and rapid 2-token win rules.
              </p>

              <div className="pt-2">
                <label className="text-[10px] text-[#86948a] uppercase block mb-1">
                  Stake Allocation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 100].map((stake) => (
                    <button
                      key={stake}
                      type="button"
                      onClick={() => setCreateStake(stake)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        createStake === stake
                          ? "bg-[#4edea3] text-[#003824] shadow-md"
                          : "bg-[#222731] text-[#bbcabf] hover:text-[#4edea3]"
                      }`}
                    >
                      {stake} PTS
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={isMatchmaking}
                onClick={() => handleQuickMatch("2p")}
                className="py-3 rounded-2xl bg-[#4edea3] text-[#003824] hover:bg-[#5ff0b4] font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">swords</span>
                <span>2P Duel</span>
              </button>
              <button
                type="button"
                disabled={isMatchmaking}
                onClick={() => handleQuickMatch("4p")}
                className="py-3 rounded-2xl bg-[#ffb95f] text-[#482a00] hover:bg-[#ffc880] font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">groups</span>
                <span>4P Battle</span>
              </button>
            </div>
          </div>

          {/* Join / Create Custom Room Card */}
          <div className="p-5 bg-[#171b24] rounded-3xl border border-[#3c4a42]/60 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[#4cd7f6]">meeting_room</span>
              <h3 className="text-sm font-bold text-[#dfe2ee]">Private Enclave Match</h3>
            </div>

            {/* Join with code */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#86948a] uppercase block">
                Join with Room Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. LUDO42"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs text-[#dfe2ee] font-mono tracking-widest focus:border-[#4edea3] focus:outline-none uppercase"
                />
                <button
                  type="button"
                  onClick={handleJoinByCode}
                  className="px-4 py-2 rounded-xl bg-[#222731] border border-[#3c4a42]/60 text-xs font-bold text-[#4edea3] hover:bg-[#4edea3] hover:text-[#003824] transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>

            <div className="border-t border-[#3c4a42]/40 pt-3 space-y-2">
              <label className="text-[10px] text-[#86948a] uppercase block">
                Or Host New Room
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateMode("2p")}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    createMode === "2p"
                      ? "bg-[#4edea3] text-[#003824]"
                      : "bg-[#222731] text-[#bbcabf]"
                  }`}
                >
                  2 Players
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("4p")}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                    createMode === "4p"
                      ? "bg-[#4edea3] text-[#003824]"
                      : "bg-[#222731] text-[#bbcabf]"
                  }`}
                >
                  4 Players
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-2.5 rounded-xl bg-[#222731] border border-[#4edea3]/50 text-xs font-bold text-[#4edea3] hover:bg-[#4edea3] hover:text-[#003824] transition-all cursor-pointer"
              >
                Create Room ({createStake} PTS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY TAB: ACTIVE ROOMS LIST */}
      {lobbyTab === "rooms" && (
        <div className="bg-[#171b24] p-4 rounded-3xl border border-[#3c4a42]/60 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
              Available Match Enclaves
            </h4>
            <span className="text-[10px] text-[#bbcabf]">{publicRooms.length} active</span>
          </div>

          <div className="space-y-2">
            {publicRooms.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#86948a]">
                No waiting rooms found. Host a new room or start a Quick Match!
              </div>
            ) : (
              publicRooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 hover:border-[#4edea3]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#dfe2ee]">{r.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#222731] text-[#4edea3] text-[9px]">
                        {r.code}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#bbcabf]">
                      {r.mode.toUpperCase()} • Entry: {r.entryFee} PTS • Slots: {r.playersCount}/{r.maxPlayers}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setJoinCodeInput(r.code);
                      handleJoinByCode();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#4edea3] text-[#003824] text-xs font-bold hover:bg-[#5ff0b4] transition-all cursor-pointer"
                  >
                    Join Room
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* LOBBY TAB: LEADERBOARD */}
      {lobbyTab === "leaderboard" && leaderboards && (
        <div className="bg-[#171b24] p-4 rounded-3xl border border-[#3c4a42]/60 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
              Cyber Ludo Champions
            </h4>
            <div className="flex items-center gap-1 bg-[#0f131c] p-0.5 rounded-xl border border-[#3c4a42]/50">
              {(["daily", "weekly", "allTime"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setLeaderboardTimeframe(tf)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                    leaderboardTimeframe === tf
                      ? "bg-[#4edea3] text-[#003824]"
                      : "text-[#bbcabf] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#3c4a42]/60 text-[#bbcabf]">
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Validator Node</th>
                <th className="py-2 px-3">Wins / Games</th>
                <th className="py-2 px-3">Win Rate</th>
                <th className="py-2 px-3 text-right">Points Won</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4a42]/30">
              {(leaderboards[leaderboardTimeframe] || []).map((entry: any) => (
                <tr key={entry.name} className="hover:bg-[#222731]/40">
                  <td className="py-2.5 px-3 font-bold text-[#dfe2ee]">
                    {entry.rank === 1 ? "🥇 #1" : entry.rank === 2 ? "🥈 #2" : entry.rank === 3 ? "🥉 #3" : `#${entry.rank}`}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#4edea3]">{entry.name}</td>
                  <td className="py-2.5 px-3 text-[#bbcabf]">
                    {entry.wins} / {entry.games}
                  </td>
                  <td className="py-2.5 px-3 text-[#ffb95f] font-bold">{entry.winRate}%</td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#dfe2ee]">
                    {entry.points.toLocaleString()} PTS
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOBBY TAB: MATCH HISTORY */}
      {lobbyTab === "history" && (
        <div className="bg-[#171b24] p-4 rounded-3xl border border-[#3c4a42]/60 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
              Recent Completed Matches
            </h4>
            <span className="text-[10px] text-[#bbcabf]">{completedHistory.length} matches</span>
          </div>

          <div className="space-y-2">
            {completedHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#86948a]">
                No matches logged in this session yet.
              </div>
            ) : (
              completedHistory.map((m: any) => (
                <div
                  key={m.gameId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#dfe2ee]">{m.name}</span>
                    <div className="text-[10px] text-[#bbcabf]">
                      Winner: <strong className="text-[#4edea3]">{m.winner}</strong> • Prize:{" "}
                      <strong className="text-[#ffb95f]">{m.prizePool} PTS</strong>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-[#86948a]">
                    <span>{m.totalMoves} moves</span>
                    <span className="block">{m.durationSec}s match</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
