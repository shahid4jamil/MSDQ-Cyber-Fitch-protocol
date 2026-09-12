import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const REFERRAL_REWARD_MSDQ = 100.0;

/**
 * Firebase Cloud Function: validateReferralCode
 * Validates a referral code server-side:
 * 1. Checks that the code exists and points to an active account.
 * 2. Prevents self-referral (checking caller UID and email).
 */
export const validateReferralCode = onCall(async (request) => {
  const { code, email, newUserId } = request.data || {};
  const callerUid = request.auth?.uid || newUserId;
  const callerEmail = request.auth?.token?.email || email;

  if (!code || typeof code !== "string") {
    throw new HttpsError("invalid-argument", "Referral code is required.");
  }

  const cleanCode = code.trim().toUpperCase();

  try {
    const snap = await db
      .collection("users")
      .where("referralCode", "==", cleanCode)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError(
        "not-found",
        `Referral code "${cleanCode}" does not exist on MSDQ Network.`
      );
    }

    const referrerDoc = snap.docs[0];
    const referrerData = referrerDoc.data();
    const referrerId = referrerDoc.id;

    // Check account status
    if (
      referrerData.status === "Frozen" ||
      referrerData.status === "Flagged" ||
      referrerData.status === "Banned"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Referrer node is currently suspended and cannot accept new referrals."
      );
    }

    // Prevent self-referral
    if (callerUid && referrerId === callerUid) {
      throw new HttpsError(
        "permission-denied",
        "Self-referral is strictly forbidden: You cannot use your own referral code."
      );
    }

    if (
      callerEmail &&
      referrerData.email &&
      referrerData.email.trim().toLowerCase() === callerEmail.trim().toLowerCase()
    ) {
      throw new HttpsError(
        "permission-denied",
        "Self-referral is strictly forbidden: The referral code matches your account email."
      );
    }

    return {
      valid: true,
      referrer: {
        id: referrerId,
        displayName: referrerData.displayName || "Node Miner",
        userId: referrerData.userId || `MSDQ-${referrerId.slice(0, 6)}`,
        status: referrerData.status || "Active",
      },
    };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Failed to validate referral code.");
  }
});

/**
 * Firebase Cloud Function: validateAndApplyReferral
 * Atomically validates and applies a referral:
 * 1. Validates code, guarantees referrer exists and is active.
 * 2. Prevents self-referral.
 * 3. Uses a Firestore transaction to atomically increment referrer's count & reward balance,
 *    subcollection relationship, and ledger transaction to avoid race conditions.
 */
export const validateAndApplyReferral = onCall(async (request) => {
  const { referralCode, newUserId, newUserEmail, newUserName } = request.data || {};
  const callerUid = request.auth?.uid || newUserId;
  const callerEmail = request.auth?.token?.email || newUserEmail;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "User must be authenticated to apply a referral.");
  }
  if (!referralCode || typeof referralCode !== "string") {
    throw new HttpsError("invalid-argument", "Referral code is required.");
  }

  const cleanCode = referralCode.trim().toUpperCase();

  // 1. Locate referrer
  const snap = await db
    .collection("users")
    .where("referralCode", "==", cleanCode)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError(
      "not-found",
      `Referral code "${cleanCode}" is invalid or does not exist.`
    );
  }

  const referrerDoc = snap.docs[0];
  const referrerId = referrerDoc.id;
  const referrerInitialData = referrerDoc.data();

  // Immediate anti-self-referral gate
  if (referrerId === callerUid) {
    throw new HttpsError(
      "permission-denied",
      "Self-referral is strictly forbidden: You cannot use your own referral code."
    );
  }

  if (
    callerEmail &&
    referrerInitialData.email &&
    referrerInitialData.email.trim().toLowerCase() === callerEmail.trim().toLowerCase()
  ) {
    throw new HttpsError(
      "permission-denied",
      "Self-referral is strictly forbidden: The referral code matches your account email."
    );
  }

  const referrerRef = db.collection("users").doc(referrerId);
  const newUserRef = db.collection("users").doc(callerUid);
  const referralSubRef = referrerRef.collection("referrals").doc(callerUid);
  const txId = `ref-reward-${referrerId}-${callerUid}`;
  const txRef = db.collection("transactions").doc(txId);

  try {
    // 2. ATOMIC TRANSACTION: Enforce ACID concurrency and prevent race conditions
    const result = await db.runTransaction(async (transaction) => {
      // All reads first
      const [refSnap, userSnap, subSnap, txSnap] = await Promise.all([
        transaction.get(referrerRef),
        transaction.get(newUserRef),
        transaction.get(referralSubRef),
        transaction.get(txRef),
      ]);

      if (!refSnap.exists) {
        throw new HttpsError("not-found", "Referrer node record does not exist.");
      }

      const refData = refSnap.data() || {};
      if (refData.status === "Frozen" || refData.status === "Flagged") {
        throw new HttpsError("failed-precondition", "Referrer node is not in active standing.");
      }

      // Re-verify self-referral inside transactional lock
      if (refSnap.id === callerUid) {
        throw new HttpsError("permission-denied", "Self-referral is strictly forbidden.");
      }
      if (
        refData.email &&
        callerEmail &&
        refData.email.trim().toLowerCase() === callerEmail.trim().toLowerCase()
      ) {
        throw new HttpsError("permission-denied", "Self-referral is strictly forbidden.");
      }

      if (!userSnap.exists) {
        throw new HttpsError("not-found", "New user profile not found in ledger.");
      }

      const userData = userSnap.data() || {};
      if (userData.referredByUserId) {
        throw new HttpsError(
          "already-exists",
          "Account has already redeemed a referral code."
        );
      }

      if (subSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "Referral relationship has already been recorded."
        );
      }

      if (txSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "Referral reward transaction has already been credited."
        );
      }

      // Atomic Increments
      const totalReferrals = (refData.totalReferrals || 0) + 1;
      const activeReferrals = (refData.activeReferrals || 0) + 1;
      const currentBalance = refData.msdqBalance ?? refData.balanceMSDQ ?? 0.0;
      const updatedBalance = Number((currentBalance + REFERRAL_REWARD_MSDQ).toFixed(4));
      const currentCommission = refData.referralCommissionEarned || 0.0;
      const updatedCommission = Number((currentCommission + REFERRAL_REWARD_MSDQ).toFixed(4));

      // Transaction Writes
      // 1. Update Referrer Profile
      transaction.update(referrerRef, {
        totalReferrals,
        activeReferrals,
        msdqBalance: updatedBalance,
        referralCommissionEarned: updatedCommission,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Add to Referrals Subcollection
      transaction.set(referralSubRef, {
        id: callerUid,
        name: newUserName || userData.displayName || "MSDQ Miner",
        email: callerEmail || userData.email || "",
        nodeCode: userData.userId || `MSDQ-${callerUid.slice(0, 6)}`,
        status: "Active",
        rewardMSDQ: REFERRAL_REWARD_MSDQ,
        joinedAt: Date.now(),
      });

      // 3. Update New User with Referrer Link
      transaction.update(newUserRef, {
        referredByUserId: referrerId,
        referredByReferralCode: cleanCode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Create Immutable Ledger Entry with Deduplicated ID
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
        referredUserId: callerUid,
        timestamp: Date.now(),
        status: "completed",
        txHash: `0x${randomHash}`,
        note: `Referral Reward: +100 MSDQ credited for verified referral of node #${userData.userId || callerUid.slice(0, 6)}`,
      });

      return {
        success: true,
        rewardGranted: REFERRAL_REWARD_MSDQ,
        referrerId,
        referrerName: refData.displayName || "Node Miner",
      };
    });

    return result;
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Referral transaction failed.");
  }
});
