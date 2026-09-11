import crypto from "crypto";
import { LudoRoom, LudoPlayer, LudoToken, LudoMoveRecord, GameSettings } from "./types.js";
import { gameLedger } from "./gameLedger.js";
import { antiCheat } from "./antiCheat.js";

// Board constants
const COMMON_TRACK_LENGTH = 52;
const HOME_RUN_START = 51;
const GOAL_STEP = 56;

// Starting offset on common track for each color index (clockwise: Top-Left, Top-Right, Bottom-Right, Bottom-Left)
const COLOR_START_OFFSETS: Record<number, number> = {
  0: 0, // Emerald / Green (top-left)
  1: 13, // Amber / Yellow (top-right)
  2: 26, // Cyan / Blue (bottom-right)
  3: 39, // Ruby / Red (bottom-left)
};

// Safe squares on global 52-tile circuit (indices 0..51)
const SAFE_GLOBAL_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export class LudoEngine {
  private rooms: Map<string, LudoRoom> = new Map();
  private matchmakingQueues: { "2p": string[]; "4p": string[] } = { "2p": [], "4p": [] };
  private completedGames: any[] = [];
  private leaderboards: {
    allTime: any[];
    weekly: any[];
    daily: any[];
  };
  private settings: GameSettings;
  private timer: NodeJS.Timeout | null = null;
  private roomListeners: Map<string, Set<() => void>> = new Map();

  public subscribeRoom(roomId: string, listener: () => void): () => void {
    if (!this.roomListeners.has(roomId)) {
      this.roomListeners.set(roomId, new Set());
    }
    const set = this.roomListeners.get(roomId)!;
    set.add(listener);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.roomListeners.delete(roomId);
      }
    };
  }

  public notifyRoomListeners(roomId: string) {
    const set = this.roomListeners.get(roomId);
    if (set && set.size > 0) {
      for (const listener of set) {
        try {
          listener();
        } catch {
          // Safe listener execution
        }
      }
    }
  }

  constructor(settings: GameSettings) {
    this.settings = settings;
    this.leaderboards = this.seedLeaderboards();
    this.createDemoRooms();
    this.startLoop();
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): GameSettings {
    return this.settings;
  }

  private seedLeaderboards() {
    return {
      allTime: [
        { rank: 1, name: "Node_Satoshi#88", wins: 142, games: 180, winRate: 78.8, points: 7100 },
        { rank: 2, name: "CyberEnclave_7", wins: 118, games: 165, winRate: 71.5, points: 5900 },
        { rank: 3, name: "QuantumRider", wins: 95, games: 140, winRate: 67.8, points: 4750 },
        { rank: 4, name: "ZeroKnowledge_X", wins: 88, games: 135, winRate: 65.1, points: 4400 },
        { rank: 5, name: "EmeraldMiner#42", wins: 76, games: 120, winRate: 63.3, points: 3800 },
      ],
      weekly: [
        { rank: 1, name: "QuantumRider", wins: 28, games: 35, winRate: 80.0, points: 1400 },
        { rank: 2, name: "CyberEnclave_7", wins: 24, games: 32, winRate: 75.0, points: 1200 },
        { rank: 3, name: "Node_Satoshi#88", wins: 22, games: 30, winRate: 73.3, points: 1100 },
      ],
      daily: [
        { rank: 1, name: "EmeraldMiner#42", wins: 8, games: 10, winRate: 80.0, points: 400 },
        { rank: 2, name: "QuantumRider", wins: 6, games: 8, winRate: 75.0, points: 300 },
      ],
    };
  }

  private createDemoRooms() {
    // Create an active public room
    const demoRoom = this.createRoomInternal("MSDQ Cyber Arena #1", "2p", 50, "system-demo");
    demoRoom.code = "LUDO42";
    // Add bot player
    this.addBotPlayer(demoRoom, 0);
  }

  private startLoop() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    if (this.settings.ludoMaintenance) return;

    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.status === "PLAYING") {
        const currentPlayer = room.players[room.currentTurnIndex];
        if (!currentPlayer) continue;

        // If turn has expired
        if (now >= room.turnExpiresAt) {
          this.handleTurnTimeout(room, currentPlayer);
        } else if (currentPlayer.isBot) {
          // Trigger bot action with a natural delay
          this.processBotTurn(room, currentPlayer);
        }
        this.notifyRoomListeners(roomId);
      }
    }
  }

  private handleTurnTimeout(room: LudoRoom, player: LudoPlayer) {
    player.timeouts++;
    room.logs.unshift(`Turn timed out for ${player.name} (${player.timeouts}/${this.settings.ludoMaxTimeouts || 3}).`);

    if (player.timeouts >= (this.settings.ludoMaxTimeouts || 3)) {
      player.isBot = true; // Bot takes over for disconnected/inactive player
      room.logs.unshift(`${player.name} timed out repeatedly. Auto-pilot AI engaged.`);
    }

    // If haven't rolled dice, auto roll & move
    if (!room.hasRolled) {
      const dice = this.generateAuthoritativeDice();
      room.currentDice = dice;
      room.hasRolled = true;
      room.validTokenMoves = this.calculateValidMoves(player, dice, room.variant);

      if (room.validTokenMoves.length > 0) {
        // Auto move highest progress token
        const bestToken = room.validTokenMoves[0];
        this.executeMove(room, player.id, bestToken, dice);
      } else {
        this.nextTurn(room);
      }
    } else {
      if (room.validTokenMoves.length > 0) {
        const bestToken = room.validTokenMoves[0];
        this.executeMove(room, player.id, bestToken, room.currentDice || 1);
      } else {
        this.nextTurn(room);
      }
    }
  }

  private processBotTurn(room: LudoRoom, bot: LudoPlayer) {
    // Add slight natural delay if bot just got the turn
    const turnAge = (room.turnDurationSec * 1000) - (room.turnExpiresAt - Date.now());
    if (turnAge < 1200) return; // Wait 1.2s before rolling

    if (!room.hasRolled) {
      const dice = this.generateAuthoritativeDice();
      room.currentDice = dice;
      room.hasRolled = true;
      room.validTokenMoves = this.calculateValidMoves(bot, dice, room.variant);
      room.logs.unshift(`${bot.name} rolled a ${dice}!`);

      if (room.validTokenMoves.length === 0) {
        setTimeout(() => {
          this.nextTurn(room);
        }, 1000);
      }
    } else if (room.validTokenMoves.length > 0) {
      // Pick best strategic token
      const tokenId = this.pickBestBotToken(room, bot, room.currentDice || 1);
      setTimeout(() => {
        this.executeMove(room, bot.id, tokenId, room.currentDice || 1);
      }, 800);
    }
  }

  private pickBestBotToken(room: LudoRoom, bot: LudoPlayer, dice: number): number {
    // Strategy: 1. Can we capture someone? 2. Can we move out of yard? 3. Can we reach home? 4. Most advanced
    for (const tid of room.validTokenMoves) {
      const tok = bot.tokens[tid];
      if (tok.step >= 0) {
        const targetStep = tok.step + dice;
        if (targetStep < HOME_RUN_START) {
          const targetGlobal = (COLOR_START_OFFSETS[bot.colorIndex] + targetStep) % COMMON_TRACK_LENGTH;
          // Check if any opponent token sits here and is not safe
          if (!SAFE_GLOBAL_SQUARES.has(targetGlobal)) {
            for (const opp of room.players) {
              if (opp.id !== bot.id) {
                for (const ot of opp.tokens) {
                  if (ot.step >= 0 && ot.step < HOME_RUN_START) {
                    const oppGlobal = (COLOR_START_OFFSETS[opp.colorIndex] + ot.step) % COMMON_TRACK_LENGTH;
                    if (oppGlobal === targetGlobal) {
                      return tid; // High priority: Capture!
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Next: Exit yard if 6
    if (dice === 6) {
      const yardToken = room.validTokenMoves.find((tid) => bot.tokens[tid].step === -1);
      if (yardToken !== undefined) return yardToken;
    }

    // Default: Choose token furthest along
    return room.validTokenMoves.sort((a, b) => bot.tokens[b].step - bot.tokens[a].step)[0];
  }

  private generateAuthoritativeDice(): number {
    return crypto.randomInt(1, 7); // Secure 1 to 6
  }

  private calculateValidMoves(player: LudoPlayer, dice: number, variant: "classic" | "quick"): number[] {
    const valid: number[] = [];

    for (let i = 0; i < player.tokens.length; i++) {
      const tok = player.tokens[i];
      if (tok.step === GOAL_STEP) {
        // Already home
        continue;
      }
      if (tok.step === -1) {
        // In yard: requires 6 to enter
        if (dice === 6) valid.push(i);
      } else {
        // On board or home run
        if (tok.step + dice <= GOAL_STEP) {
          valid.push(i);
        }
      }
    }

    return valid;
  }

  // Converts a player's token step to global board position (or -1 if yard/home)
  private getGlobalPosition(colorIndex: number, step: number): number {
    if (step < 0 || step >= HOME_RUN_START) return -1;
    return (COLOR_START_OFFSETS[colorIndex] + step) % COMMON_TRACK_LENGTH;
  }

  private executeMove(room: LudoRoom, playerId: string, tokenId: number, dice: number) {
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1 || playerIndex !== room.currentTurnIndex) return;

    const player = room.players[playerIndex];
    const token = player.tokens[tokenId];
    if (!token) return;

    const fromStep = token.step;
    let toStep = fromStep;
    let capturedPlayerName: string | undefined = undefined;
    let earnedBonusTurn = false;

    if (fromStep === -1 && dice === 6) {
      // Step out of base to starting square (step 0)
      toStep = 0;
      token.step = 0;
      earnedBonusTurn = true; // Rolling a 6 earns a bonus turn
      room.logs.unshift(`${player.name}'s token #${tokenId + 1} exited the base onto Node #0!`);
    } else if (fromStep >= 0 && fromStep + dice <= GOAL_STEP) {
      toStep = fromStep + dice;
      token.step = toStep;

      if (toStep === GOAL_STEP) {
        room.logs.unshift(`${player.name}'s token #${tokenId + 1} reached HOME BASE! +100 PTS!`);
        earnedBonusTurn = true; // Reaching home gives bonus roll
      } else if (toStep < HOME_RUN_START) {
        // Check capture on common track
        const landingGlobal = this.getGlobalPosition(player.colorIndex, toStep);
        if (!SAFE_GLOBAL_SQUARES.has(landingGlobal)) {
          // Check if opponent token is here
          for (const opp of room.players) {
            if (opp.id !== player.id) {
              for (const oppToken of opp.tokens) {
                if (oppToken.step >= 0 && oppToken.step < HOME_RUN_START) {
                  const oppGlobal = this.getGlobalPosition(opp.colorIndex, oppToken.step);
                  if (oppGlobal === landingGlobal) {
                    // Capture!
                    oppToken.step = -1; // Send back to yard
                    capturedPlayerName = opp.name;
                    earnedBonusTurn = true; // Capturing awards bonus turn
                    room.logs.unshift(
                      `⚡ CAPTURE! ${player.name} knocked ${opp.name}'s token back to the Enclave yard!`
                    );
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if (dice === 6) {
        earnedBonusTurn = true;
      }
    }

    // Check consecutive sixes rule
    if (dice === 6) {
      player.consecutiveSixes = (player.consecutiveSixes || 0) + 1;
      if (player.consecutiveSixes >= 3) {
        earnedBonusTurn = false;
        player.consecutiveSixes = 0;
        room.logs.unshift(`Triple-six rolled! Turn forfeited to prevent streak monopoly.`);
      }
    } else {
      player.consecutiveSixes = 0;
    }

    // Record move in room history
    const moveRecord: LudoMoveRecord = {
      id: `MOVE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      turn: room.moveHistory.length + 1,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      dice,
      tokenId,
      fromStep,
      toStep,
      capturedPlayerName,
      timestamp: Date.now(),
      description: `${player.name} moved Token #${tokenId + 1} by ${dice} nodes (${fromStep} -> ${toStep}).`,
    };
    room.moveHistory.unshift(moveRecord);

    // Check win condition
    const tokensHome = player.tokens.filter((t) => t.step === GOAL_STEP).length;
    const tokensRequiredToWin = room.variant === "quick" ? 2 : 4;

    if (tokensHome >= tokensRequiredToWin) {
      this.declareWinner(room, player);
      return;
    }

    // Pass turn or grant bonus turn
    if (earnedBonusTurn) {
      room.hasRolled = false;
      room.currentDice = null;
      room.validTokenMoves = [];
      room.turnExpiresAt = Date.now() + room.turnDurationSec * 1000;
      room.logs.unshift(`Bonus roll granted to ${player.name}!`);
    } else {
      this.nextTurn(room);
    }
  }

  private nextTurn(room: LudoRoom) {
    room.hasRolled = false;
    room.currentDice = null;
    room.validTokenMoves = [];
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    room.turnExpiresAt = Date.now() + room.turnDurationSec * 1000;
    const nextPlayer = room.players[room.currentTurnIndex];
    if (nextPlayer) {
      room.logs.unshift(`It is now ${nextPlayer.name}'s turn.`);
    }
  }

  private declareWinner(room: LudoRoom, winner: LudoPlayer) {
    room.status = "COMPLETED";
    room.winnerId = winner.id;
    room.winnerName = winner.name;
    const prizePool = Math.round(room.entryFee * room.players.length * 0.95);

    room.logs.unshift(`🏆 VICTORY! ${winner.name} won the match and claimed the ${prizePool} PTS bounty!`);

    if (!winner.isBot) {
      gameLedger.recordTransaction(
        "ludo",
        room.id,
        winner.id,
        winner.name,
        "GAME_REWARD",
        prizePool,
        `Winner payout for Ludo match ${room.name} (${room.code})`
      );
    }

    this.completedGames.unshift({
      gameId: room.id,
      roomCode: room.code,
      name: room.name,
      mode: room.mode,
      entryFee: room.entryFee,
      prizePool,
      winner: winner.name,
      players: room.players.map((p) => p.name),
      totalMoves: room.moveHistory.length,
      durationSec: Math.round((Date.now() - room.createdAt) / 1000),
      timestamp: Date.now(),
    });

    if (this.completedGames.length > 50) {
      this.completedGames = this.completedGames.slice(0, 50);
    }
  }

  private createRoomInternal(
    name: string,
    mode: "2p" | "4p",
    entryFee: number,
    creatorId: string,
    creatorName?: string
  ): LudoRoom {
    const roomId = `LR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const maxPlayers = mode === "2p" ? 2 : 4;
    const turnDurationSec = this.settings.ludoTurnDurationSec || 15;

    const colors: Array<"emerald" | "amber" | "cyan" | "ruby"> = ["emerald", "amber", "cyan", "ruby"];

    const players: LudoPlayer[] = [];
    if (creatorId !== "system-demo") {
      players.push({
        id: creatorId,
        name: creatorName || "Player Emerald",
        color: "emerald",
        colorIndex: 0,
        tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
        isBot: false,
        isReady: true,
        timeouts: 0,
        consecutiveSixes: 0,
        score: 0,
        connected: true,
      });
    }

    const room: LudoRoom = {
      id: roomId,
      code,
      name,
      mode,
      variant: "quick",
      entryFee,
      status: "WAITING",
      maxPlayers,
      players,
      currentTurnIndex: 0,
      currentDice: null,
      validTokenMoves: [],
      hasRolled: false,
      turnExpiresAt: Date.now() + turnDurationSec * 1000,
      turnDurationSec,
      moveHistory: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      createdBy: creatorId,
      logs: [`Room initialized: ${name} (${mode.toUpperCase()} Duel, ${entryFee} PTS entry).`],
    };

    this.rooms.set(roomId, room);
    return room;
  }

  private addBotPlayer(room: LudoRoom, preferredIndex?: number): LudoPlayer {
    const colors: Array<"emerald" | "amber" | "cyan" | "ruby"> = ["emerald", "amber", "cyan", "ruby"];
    const botNames = ["Emerald Miner", "Amber Rig #01", "Cyan Enclave", "Ruby Validator"];

    const usedIndices = new Set(room.players.map((p) => p.colorIndex));
    let colorIndex: 0 | 1 | 2 | 3 = 0;
    if (preferredIndex !== undefined && !usedIndices.has(preferredIndex as any)) {
      colorIndex = preferredIndex as 0 | 1 | 2 | 3;
    } else {
      for (let i = 0; i < 4; i++) {
        if (!usedIndices.has(i as any)) {
          colorIndex = i as 0 | 1 | 2 | 3;
          break;
        }
      }
    }

    const botName = botNames[colorIndex] || `CyberBot_${colorIndex}`;

    const bot: LudoPlayer = {
      id: `bot-${Date.now()}-${colorIndex}`,
      name: botName,
      color: colors[colorIndex],
      colorIndex: colorIndex,
      tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      isBot: true,
      isReady: true,
      timeouts: 0,
      consecutiveSixes: 0,
      score: 0,
      connected: true,
    };

    room.players.push(bot);
    return bot;
  }

  // --- Public API Methods ---

  public createRoom(
    userId: string,
    userName: string,
    name: string,
    mode: "2p" | "4p",
    entryFee: number,
    variant: "classic" | "quick" = "quick"
  ): { success: boolean; room?: LudoRoom; error?: string } {
    if (this.settings.ludoMaintenance) {
      return { success: false, error: "Cyber Ludo Arena is currently undergoing maintenance." };
    }

    const rl = antiCheat.checkRateLimit(userId, "ludo:create");
    if (!rl.allowed) return { success: false, error: rl.reason };

    const room = this.createRoomInternal(name, mode, entryFee, userId, userName);
    room.variant = variant;

    if (entryFee > 0) {
      gameLedger.recordTransaction(
        "ludo",
        room.id,
        userId,
        userName,
        "GAME_ENTRY",
        -entryFee,
        `Entry fee for Ludo match ${room.code}`
      );
    }

    return { success: true, room };
  }

  public joinRoom(
    userId: string,
    userName: string,
    identifier: string // code or roomId
  ): { success: boolean; room?: LudoRoom; error?: string } {
    if (this.settings.ludoMaintenance) {
      return { success: false, error: "Cyber Ludo Arena is currently undergoing maintenance." };
    }

    const rl = antiCheat.checkRateLimit(userId, "ludo:join");
    if (!rl.allowed) return { success: false, error: rl.reason };

    const clean = identifier.trim().toUpperCase();
    let targetRoom: LudoRoom | undefined;

    for (const r of this.rooms.values()) {
      if (r.id === identifier || r.code === clean) {
        targetRoom = r;
        break;
      }
    }

    if (!targetRoom) {
      return { success: false, error: `No room found with code ${identifier}.` };
    }

    // Check if player is already in the room (reconnect scenario!)
    const existing = targetRoom.players.find((p) => p.id === userId);
    if (existing) {
      existing.connected = true;
      targetRoom.logs.unshift(`${existing.name} reconnected to match.`);
      return { success: true, room: targetRoom };
    }

    if (targetRoom.players.length >= targetRoom.maxPlayers) {
      return { success: false, error: "This room is already at maximum capacity." };
    }

    const colors: Array<"emerald" | "amber" | "cyan" | "ruby"> = ["emerald", "amber", "cyan", "ruby"];
    const usedIndices = new Set(targetRoom.players.map((p) => p.colorIndex));
    let nextColorIndex: 0 | 1 | 2 | 3 = 0;
    for (let i = 0; i < 4; i++) {
      if (!usedIndices.has(i as any)) {
        nextColorIndex = i as 0 | 1 | 2 | 3;
        break;
      }
    }

    const newPlayer: LudoPlayer = {
      id: userId,
      name: userName,
      color: colors[nextColorIndex],
      colorIndex: nextColorIndex,
      tokens: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      isBot: false,
      isReady: true,
      timeouts: 0,
      consecutiveSixes: 0,
      score: 0,
      connected: true,
    };

    targetRoom.players.push(newPlayer);
    targetRoom.logs.unshift(`${userName} joined the room as Player ${colors[nextColorIndex].toUpperCase()}.`);

    if (targetRoom.entryFee > 0) {
      gameLedger.recordTransaction(
        "ludo",
        targetRoom.id,
        userId,
        userName,
        "GAME_ENTRY",
        -targetRoom.entryFee,
        `Entry fee for Ludo match ${targetRoom.code}`
      );
    }

    // If full, start game!
    if (targetRoom.players.length >= targetRoom.maxPlayers) {
      targetRoom.status = "PLAYING";
      targetRoom.currentTurnIndex = 0;
      targetRoom.turnExpiresAt = Date.now() + targetRoom.turnDurationSec * 1000;
      targetRoom.logs.unshift(`Arena full! Battle commenced. Turn: ${targetRoom.players[0].name}.`);
    }

    this.notifyRoomListeners(targetRoom.id);
    return { success: true, room: targetRoom };
  }

  public findActiveRoomForUser(userId: string): LudoRoom | null {
    for (const r of this.rooms.values()) {
      if (r.status !== "COMPLETED") {
        const isMember = r.players.some((p) => p.id === userId);
        if (isMember) return r;
      }
    }
    return null;
  }

  public quickMatch(
    userId: string,
    userName: string,
    mode: "2p" | "4p" = "2p",
    entryFee = 50
  ): { success: boolean; room: LudoRoom } {
    // 1. Check if player has an existing active match session to resume (prevents duplicate instances)
    const existing = this.findActiveRoomForUser(userId);
    if (existing) {
      existing.logs.unshift(`${userName} resumed active match session.`);
      this.notifyRoomListeners(existing.id);
      return { success: true, room: existing };
    }

    // 2. Find an open public waiting room
    for (const r of this.rooms.values()) {
      if (r.status === "WAITING" && r.mode === mode && r.players.length < r.maxPlayers) {
        const joinRes = this.joinRoom(userId, userName, r.id);
        if (joinRes.success && joinRes.room) {
          return { success: true, room: joinRes.room };
        }
      }
    }

    // If no room found, create one and auto-fill remaining with cyber bots for instant fun!
    const createRes = this.createRoom(
      userId,
      userName,
      `${mode.toUpperCase()} Quick Match #${Math.floor(Math.random() * 900 + 100)}`,
      mode,
      entryFee,
      "quick"
    );

    const room = createRes.room!;
    // Auto-fill bots so player doesn't wait indefinitely
    const needed = room.maxPlayers - room.players.length;
    for (let i = 0; i < needed; i++) {
      this.addBotPlayer(room, room.players.length);
    }
    room.status = "PLAYING";
    room.currentTurnIndex = 0;
    room.turnExpiresAt = Date.now() + room.turnDurationSec * 1000;
    room.logs.unshift(`Matchmaking complete! Arena filled with consensus nodes. Game started.`);

    return { success: true, room };
  }

  public rollDice(roomId: string, userId: string): { success: boolean; dice?: number; validMoves?: number[]; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Room not found." };
    if (room.status !== "PLAYING") return { success: false, error: "Game is not currently active." };

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== userId) {
      antiCheat.recordAlert({
        game: "ludo",
        userId,
        userName: `User #${userId.slice(0, 8)}`,
        alertType: "SPEED_MANIPULATION",
        details: `Attempted to roll dice out of turn.`,
        severity: "low",
      });
      return { success: false, error: "It is not your turn to roll." };
    }

    if (room.hasRolled) {
      return { success: false, error: "Dice already rolled for this turn. Please select a token to move." };
    }

    const dice = this.generateAuthoritativeDice();
    room.currentDice = dice;
    room.hasRolled = true;
    const validMoves = this.calculateValidMoves(currentPlayer, dice, room.variant);
    room.validTokenMoves = validMoves;

    room.logs.unshift(`${currentPlayer.name} rolled a ${dice}!`);

    // If no valid moves possible, advance turn after brief display
    if (validMoves.length === 0) {
      room.logs.unshift(`No valid moves for ${currentPlayer.name} with roll of ${dice}.`);
      setTimeout(() => {
        this.nextTurn(room);
        this.notifyRoomListeners(roomId);
      }, 1200);
    }

    this.notifyRoomListeners(roomId);
    return { success: true, dice, validMoves };
  }

  public moveToken(
    roomId: string,
    userId: string,
    tokenId: number
  ): { success: boolean; moveRecord?: LudoMoveRecord; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: "Room not found." };
    if (room.status !== "PLAYING") return { success: false, error: "Game is not active." };

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== userId) {
      return { success: false, error: "It is not your turn." };
    }

    if (!room.hasRolled || room.currentDice === null) {
      return { success: false, error: "You must roll the dice first." };
    }

    if (!room.validTokenMoves.includes(tokenId)) {
      return { success: false, error: "Invalid token selection for current dice roll." };
    }

    this.executeMove(room, userId, tokenId, room.currentDice);
    const lastMove = room.moveHistory[0];
    this.notifyRoomListeners(roomId);
    return { success: true, moveRecord: lastMove };
  }

  public getRoomState(roomId: string, userId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const myPlayer = userId ? room.players.find((p) => p.id === userId) : undefined;
    const isMyTurn = myPlayer && room.players[room.currentTurnIndex]?.id === userId;

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      mode: room.mode,
      variant: room.variant,
      entryFee: room.entryFee,
      status: room.status,
      maxPlayers: room.maxPlayers,
      players: room.players,
      currentTurnIndex: room.currentTurnIndex,
      currentTurnPlayer: room.players[room.currentTurnIndex],
      currentDice: room.currentDice,
      hasRolled: room.hasRolled,
      validTokenMoves: room.validTokenMoves,
      turnSecondsLeft: Math.max(0, Math.ceil((room.turnExpiresAt - Date.now()) / 1000)),
      winnerId: room.winnerId,
      winnerName: room.winnerName,
      moveHistory: room.moveHistory.slice(0, 15),
      logs: room.logs.slice(0, 8),
      isMyTurn,
      myPlayer,
    };
  }

  public getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter((r) => r.status !== "COMPLETED")
      .map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        mode: r.mode,
        entryFee: r.entryFee,
        playersCount: r.players.length,
        maxPlayers: r.maxPlayers,
        status: r.status,
      }));
  }

  public getLeaderboards() {
    return this.leaderboards;
  }

  public getCompletedGames() {
    return this.completedGames;
  }
}
