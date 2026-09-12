import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDocs,
  limit,
  runTransaction,
  Firestore,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

let dbInstance: Firestore | null = null;

// Protocol Constants
export const REFERRAL_REWARD_MSDQ = 100.0; // Strictly 100.0 MSDQ per qualified referral

/**
 * Returns an initialized Firestore instance using the platform applet config.
 */
export function getDb(): Firestore {
  if (!dbInstance) {
    let config: any;
    try {
      const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
      console.error("Failed to load firebase-applet-config.json on server:", err);
      throw new Error("Server Firebase configuration missing.");
    }

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const firestoreDbId = config.firestoreDatabaseId || "(default)";
    dbInstance = getFirestore(app, firestoreDbId);
  }
  return dbInstance;
}

export interface ReferrerInfo {
  id: string;
  displayName: string;
  userId: string;
  email?: string;
  status: string;
  referralCode: string;
}

export interface ValidateReferralResult {
  valid: boolean;
  error?: string;
  referrer?: ReferrerInfo;
}

/**
 * Server-side validation of a referral code:
 * - Ensures referral code format is clean
 * - Checks database to guarantee referrer exists and is active
 * - Prevents self-referral (by matching user UID or email)
 */
export async function validateReferralCodeServer(
  rawCode: string,
  newUserId?: string,
  newUserEmail?: string
): Promise<ValidateReferralResult> {
  if (!rawCode || typeof rawCode !== "string") {
    return { valid: false, error: "Referral code is required." };
  }

  const cleanCode = rawCode.trim().toUpperCase();
  if (cleanCode.length < 3 || cleanCode.length > 32) {
    return { valid: false, error: "Invalid referral code length." };
  }

  const db = getDb();

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", cleanCode), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      return {
        valid: false,
        error: `Referral code "${cleanCode}" does not exist on MSDQ Network.`,
      };
    }

    const referrerDoc = snap.docs[0];
    const data = referrerDoc.data();
    const referrerId = referrerDoc.id;

    // Verify operational standing
    if (data.status === "Frozen" || data.status === "Flagged" || data.status === "Banned") {
      return {
        valid: false,
        error: "Referrer node is currently suspended and cannot accept referrals.",
      };
    }

    // Anti-Self-Referral Enforcement
    if (newUserId && referrerId === newUserId) {
      return {
        valid: false,
        error: "Self-referral is strictly forbidden: You cannot use your own referral code.",
      };
    }

    if (
      newUserEmail &&
      data.email &&
      data.email.trim().toLowerCase() === newUserEmail.trim().toLowerCase()
    ) {
      return {
        valid: false,
        error: "Self-referral is strictly forbidden: The referral code belongs to your account email.",
      };
    }

    return {
      valid: true,
      referrer: {
        id: referrerId,
        displayName: data.displayName || "Node Miner",
        userId: data.userId || `MSDQ-${referrerId.slice(0, 6)}`,
        email: data.email,
        status: data.status || "Active",
        referralCode: cleanCode,
      },
    };
  } catch (err: any) {
    console.error("Error in validateReferralCodeServer:", err);
    return {
      valid: false,
      error: err.message || "Failed to validate referral code server-side.",
    };
  }
}

export interface ApplyReferralParams {
  newUserId: string;
  newUserEmail: string;
  newUserName?: string;
  referralCode: string;
}

export interface ApplyReferralResult {
  success: boolean;
  rewardGranted?: number;
  referrerId?: string;
  referrerName?: string;
  error?: string;
}

/**
 * Server-side Cloud Function / transactional handler:
 * - Validates referral code server-side
 * - Ensures referrer exists and is active
 * - Prevents self-referral
 * - Atomically increments the referrer's referral count and reward balance in a transaction
 * - Creates an immutable transaction ledger record and subcollection referral relationship
 */
export async function applyReferralServer(
  params: ApplyReferralParams
): Promise<ApplyReferralResult> {
  const { newUserId, newUserEmail, newUserName, referralCode } = params;

  if (!newUserId || !referralCode) {
    return { success: false, error: "Missing required parameters for referral application." };
  }

  const cleanCode = referralCode.trim().toUpperCase();

  // 1. Initial server-side pre-validation
  const validation = await validateReferralCodeServer(cleanCode, newUserId, newUserEmail);
  if (!validation.valid || !validation.referrer) {
    return { success: false, error: validation.error || "Referral validation failed." };
  }

  const referrerId = validation.referrer.id;
  const db = getDb();

  try {
    let resultPayload: ApplyReferralResult = { success: false };

    // 2. ATOMIC TRANSACTION: Enforce ACID invariants and prevent race conditions
    await runTransaction(db, async (transaction) => {
      const referrerRef = doc(db, "users", referrerId);
      const newUserRef = doc(db, "users", newUserId);
      const referralSubRef = doc(db, "users", referrerId, "referrals", newUserId);
      const txId = `ref-reward-${referrerId}-${newUserId}`;
      const txRef = doc(db, "transactions", txId);

      // ALL READS MUST OCCUR BEFORE WRITES IN FIRESTORE TRANSACTIONS
      const [referrerSnap, newUserSnap, refSubSnap, txSnap] = await Promise.all([
        transaction.get(referrerRef),
        transaction.get(newUserRef),
        transaction.get(referralSubRef),
        transaction.get(txRef),
      ]);

      if (!referrerSnap.exists()) {
        throw new Error("Referrer node does not exist in ledger.");
      }

      const referrerData = referrerSnap.data();

      // Ensure referrer is not frozen
      if (referrerData.status === "Frozen" || referrerData.status === "Flagged") {
        throw new Error("Referrer account is not in good standing.");
      }

      // Re-verify anti-self-referral inside transaction lock
      if (referrerSnap.id === newUserId) {
        throw new Error("Self-referral is strictly forbidden.");
      }
      if (
        referrerData.email &&
        newUserEmail &&
        referrerData.email.trim().toLowerCase() === newUserEmail.trim().toLowerCase()
      ) {
        throw new Error("Self-referral is strictly forbidden.");
      }

      if (!newUserSnap.exists()) {
        throw new Error("New user record not found in ledger.");
      }

      const newUserData = newUserSnap.data();

      // Prevent duplicate redemption: check if already referred
      if (newUserData.referredByUserId) {
        throw new Error("This account has already redeemed a referral code.");
      }

      // Check subcollection idempotency
      if (refSubSnap.exists()) {
        throw new Error("Referral relationship has already been recorded.");
      }

      // Check transaction ledger idempotency
      if (txSnap.exists()) {
        throw new Error("Referral reward transaction has already been credited.");
      }

      // COMPUTATION: Calculate atomic increments
      const totalReferrals = (referrerData.totalReferrals || 0) + 1;
      const activeReferrals = (referrerData.activeReferrals || 0) + 1;
      const currentBalance = referrerData.msdqBalance ?? referrerData.balanceMSDQ ?? 0.0;
      const updatedBalance = Number((currentBalance + REFERRAL_REWARD_MSDQ).toFixed(4));
      const currentCommission = referrerData.referralCommissionEarned || 0.0;
      const updatedCommission = Number((currentCommission + REFERRAL_REWARD_MSDQ).toFixed(4));

      // WRITES: Apply atomic state mutations
      // 1. Increment referrer's count & balance (+100 MSDQ)
      transaction.update(referrerRef, {
        totalReferrals,
        activeReferrals,
        msdqBalance: updatedBalance,
        balanceMSDQ: updatedBalance,
        referralCommissionEarned: updatedCommission,
        updatedAt: Date.now(),
      });

      // 2. Add referred user into referrer's subcollection
      transaction.set(referralSubRef, {
        id: newUserId,
        name: newUserName?.trim() || newUserData.displayName || "MSDQ Miner",
        email: newUserEmail?.trim() || newUserData.email || "",
        nodeCode: newUserData.userId || `MSDQ-${newUserId.slice(0, 6)}`,
        status: "Active",
        rewardMSDQ: REFERRAL_REWARD_MSDQ,
        joinedAt: Date.now(),
      });

      // 3. Update new user profile with verified referrer link AND credit +100 MSDQ welcome reward
      const newUserCurBalance = newUserData.msdqBalance ?? newUserData.balanceMSDQ ?? 0.0;
      const newUserNewBalance = Number((newUserCurBalance + REFERRAL_REWARD_MSDQ).toFixed(4));
      transaction.update(newUserRef, {
        referredByUserId: referrerId,
        referredByReferralCode: cleanCode,
        msdqBalance: newUserNewBalance,
        balanceMSDQ: newUserNewBalance,
        updatedAt: Date.now(),
      });

      // 4. Create immutable ledger entry for Referrer (+100 MSDQ)
      const randomHash = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      transaction.set(txRef, {
        id: txId,
        userId: referrerId,
        type: "REFERRAL_REWARD",
        amount: REFERRAL_REWARD_MSDQ,
        usdValue: Number((REFERRAL_REWARD_MSDQ * 0.5).toFixed(2)),
        referrerUserId: referrerId,
        referredUserId: newUserId,
        timestamp: Date.now(),
        status: "completed",
        txHash: `0x${randomHash}`,
        note: `Referral Reward: +100 MSDQ credited for verified referral of node #${newUserData.userId || newUserId.slice(0, 6)}`,
      });

      // 5. Create immutable ledger entry for New User (+100 MSDQ welcome bonus)
      const txIdNewUser = `ref-welcome-${newUserId}`;
      const txRefNewUser = doc(db, "transactions", txIdNewUser);
      const randomHash2 = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      transaction.set(txRefNewUser, {
        id: txIdNewUser,
        userId: newUserId,
        type: "REFERRAL_WELCOME_BONUS",
        amount: REFERRAL_REWARD_MSDQ,
        usdValue: Number((REFERRAL_REWARD_MSDQ * 0.5).toFixed(2)),
        referrerUserId: referrerId,
        referredUserId: newUserId,
        timestamp: Date.now(),
        status: "completed",
        txHash: `0x${randomHash2}`,
        note: `Referral Welcome Grant: +100 MSDQ credited for joining with referral code ${cleanCode}`,
      });

      resultPayload = {
        success: true,
        rewardGranted: REFERRAL_REWARD_MSDQ,
        referrerId,
        referrerName: referrerData.displayName || "Node Miner",
      };
    });

    return resultPayload;
  } catch (err: any) {
    console.error("Transaction failed in applyReferralServer:", err);
    return {
      success: false,
      error: err.message || "Atomic referral transaction failed.",
    };
  }
}
