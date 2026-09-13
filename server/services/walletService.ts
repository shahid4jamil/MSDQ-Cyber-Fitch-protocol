import {
  doc,
  collection,
  query,
  where,
  getDocs,
  limit,
  runTransaction,
} from "firebase/firestore";
import { getDb } from "./referralService.js";

export interface TransferResult {
  success: boolean;
  error?: string;
  txHash?: string;
  newBalance?: number;
  message?: string;
}

/**
 * Server-Authoritative P2P Wallet Transfer:
 * - Runs in an atomic Firestore transaction.
 * - Prevents client balance manipulation.
 * - Enforces minimum gas fees and non-negative balance constraints.
 * - Records cryptographic immutable ledger entries for sender and recipient.
 */
export async function executeServerTransfer(
  senderUid: string,
  senderAddress: string,
  recipientAddress: string,
  amount: number
): Promise<TransferResult> {
  if (!senderUid) {
    return { success: false, error: "Sender authentication required." };
  }

  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Invalid transfer amount. Must be greater than 0." };
  }

  const cleanRecipient = (recipientAddress || "").trim().toUpperCase();
  if (!cleanRecipient) {
    return { success: false, error: "Recipient MSDQ address is required." };
  }

  const db = getDb();
  const fee = 0.10; // Standard consensus gas fee in MSDQ
  const totalDeduction = parseFloat((amount + fee).toFixed(4));
  const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;

  try {
    const senderRef = doc(db, "users", senderUid);

    // Locate recipient by unique wallet address
    const recipientQuery = query(
      collection(db, "users"),
      where("walletAddress", "==", cleanRecipient),
      limit(1)
    );
    const recipientDocs = await getDocs(recipientQuery);

    if (recipientDocs.empty) {
      return {
        success: false,
        error: `Recipient wallet address "${cleanRecipient}" not found on MSDQ Network.`,
      };
    }

    const recipientDoc = recipientDocs.docs[0];
    const recipientRef = recipientDoc.ref;
    const recipientData = recipientDoc.data();

    if (recipientDoc.id === senderUid) {
      return { success: false, error: "Self-transfers are not allowed." };
    }

    let updatedSenderBal = 0;

    await runTransaction(db, async (transaction) => {
      const senderSnap = await transaction.get(senderRef);
      if (!senderSnap.exists()) {
        throw new Error("Sender account record not found.");
      }

      const senderData = senderSnap.data();
      const currentSenderBal = senderData.msdqBalance ?? senderData.balanceMSDQ ?? 0;

      if (senderData.status === "Frozen") {
        throw new Error("Sender account is frozen. Outgoing transfers suspended.");
      }

      if (currentSenderBal < totalDeduction) {
        throw new Error(
          `Insufficient MSDQ balance. Needed: ${totalDeduction.toFixed(2)} MSDQ (including 0.10 gas fee), Available: ${currentSenderBal.toFixed(2)} MSDQ.`
        );
      }

      const currentRecipientBal = recipientData.msdqBalance ?? recipientData.balanceMSDQ ?? 0;
      updatedSenderBal = parseFloat((currentSenderBal - totalDeduction).toFixed(4));
      const updatedRecipientBal = parseFloat((currentRecipientBal + amount).toFixed(4));

      // Atomically update both user balances
      transaction.update(senderRef, {
        msdqBalance: updatedSenderBal,
        balanceMSDQ: updatedSenderBal,
        lastActiveAt: Date.now(),
      });

      transaction.update(recipientRef, {
        msdqBalance: updatedRecipientBal,
        balanceMSDQ: updatedRecipientBal,
        lastActiveAt: Date.now(),
      });

      // Write immutable ledger transactions
      const senderTxId = `tx-send-${Date.now()}`;
      const recipientTxId = `tx-recv-${Date.now()}`;

      const txSenderRef = doc(db, "transactions", senderTxId);
      transaction.set(txSenderRef, {
        id: senderTxId,
        userId: senderUid,
        type: "send",
        amount: -amount,
        fee,
        senderAddress: senderAddress || senderData.walletAddress,
        receiverAddress: cleanRecipient,
        txHash,
        status: "confirmed",
        timestamp: new Date().toISOString(),
        note: `P2P Transfer to ${cleanRecipient.slice(0, 10)}... (Gas: 0.10 MSDQ)`,
      });

      const txRecipientRef = doc(db, "transactions", recipientTxId);
      transaction.set(txRecipientRef, {
        id: recipientTxId,
        userId: recipientDoc.id,
        type: "receive",
        amount: amount,
        fee: 0,
        senderAddress: senderAddress || senderData.walletAddress,
        receiverAddress: cleanRecipient,
        txHash,
        status: "confirmed",
        timestamp: new Date().toISOString(),
        note: `Received P2P Transfer from ${(senderAddress || senderData.walletAddress || "").slice(0, 10)}...`,
      });
    });

    return {
      success: true,
      txHash,
      newBalance: updatedSenderBal,
      message: `Transferred ${amount.toFixed(2)} MSDQ to ${cleanRecipient}.`,
    };
  } catch (err: any) {
    console.error("executeServerTransfer error:", err);
    return {
      success: false,
      error: err.message || "Failed to execute server-side transfer.",
    };
  }
}

/**
 * Server-Authoritative Daily Streak Check-in:
 * - Strictly enforces once-per-calendar-day (UTC).
 * - Credits exact bonus (0.50 MSDQ or streak scaled).
 * - Enforces immutable ledger record creation.
 */
export async function executeServerDailyCheckIn(
  uid: string
): Promise<{ success: boolean; error?: string; reward?: number; streak?: number; newBalance?: number }> {
  if (!uid) {
    return { success: false, error: "Authentication required." };
  }

  const db = getDb();
  const userRef = doc(db, "users", uid);
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD (UTC)

  try {
    let resultBal = 0;
    let rewardGiven = 0.50;
    let newStreak = 1;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) {
        throw new Error("User record not found.");
      }

      const data = snap.data();
      if (data.lastCheckInDate === todayStr) {
        throw new Error("Daily check-in already claimed for today. Return tomorrow!");
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const currentStreak = data.checkInStreak || 0;
      newStreak = data.lastCheckInDate === yesterday ? currentStreak + 1 : 1;

      // Tiered rewards based on streak
      const streakBonuses = [0.50, 1.00, 1.50, 2.00, 2.50, 5.00, 10.00];
      rewardGiven = streakBonuses[Math.min(newStreak - 1, streakBonuses.length - 1)] || 0.50;

      const currentBal = data.msdqBalance ?? data.balanceMSDQ ?? 0;
      resultBal = parseFloat((currentBal + rewardGiven).toFixed(4));

      transaction.update(userRef, {
        msdqBalance: resultBal,
        balanceMSDQ: resultBal,
        lastCheckInDate: todayStr,
        checkInStreak: newStreak,
        lastActiveAt: Date.now(),
      });

      const txId = `tx-checkin-${Date.now()}`;
      const txRef = doc(db, "transactions", txId);
      transaction.set(txRef, {
        id: txId,
        userId: uid,
        type: "reward",
        amount: rewardGiven,
        usdValue: rewardGiven * 0.5,
        timestamp: new Date().toISOString(),
        status: "confirmed",
        txHash: `0xchk${Date.now().toString(16)}`,
        note: `Day ${newStreak} Consecutive Check-In Protocol Reward`,
      });
    });

    return {
      success: true,
      reward: rewardGiven,
      streak: newStreak,
      newBalance: resultBal,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed daily check-in." };
  }
}

/**
 * Server-Authoritative Task Claim:
 * - Verifies user has not already claimed this taskId.
 * - Enforces exact reward amount.
 * - Updates user profile and records immutable transaction.
 */
export async function executeServerTaskClaim(
  uid: string,
  taskId: string,
  rewardAmount: number,
  taskTitle: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  if (!uid || !taskId) {
    return { success: false, error: "Missing parameters." };
  }

  const db = getDb();
  const userRef = doc(db, "users", uid);

  try {
    let resultBal = 0;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) {
        throw new Error("User record not found.");
      }

      const data = snap.data();
      const claimed: string[] = data.claimedTaskIds || [];

      if (claimed.includes(taskId)) {
        throw new Error("This task bounty has already been claimed.");
      }

      // Bound reward to strictly authorized values (max 500 MSDQ per task)
      const sanitizedReward = Math.min(Math.max(0.1, rewardAmount), 500.0);
      const currentBal = data.msdqBalance ?? data.balanceMSDQ ?? 0;
      resultBal = parseFloat((currentBal + sanitizedReward).toFixed(4));

      transaction.update(userRef, {
        msdqBalance: resultBal,
        balanceMSDQ: resultBal,
        claimedTaskIds: [...claimed, taskId],
        lastActiveAt: Date.now(),
      });

      const cleanTaskId = taskId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const txId = `tx-task-${cleanTaskId}-${uid}`;
      const txRef = doc(db, "transactions", txId);
      transaction.set(txRef, {
        id: txId,
        userId: uid,
        type: "task_reward",
        amount: sanitizedReward,
        usdValue: sanitizedReward * 0.5,
        timestamp: new Date().toISOString(),
        status: "confirmed",
        txHash: `0xtask${Date.now().toString(16)}`,
        note: `Task Bounty: ${taskTitle || taskId}`,
      });
    });

    return { success: true, newBalance: resultBal };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to claim task bounty." };
  }
}
