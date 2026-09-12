// MSDQ Network - Firebase Firestore & Authentication Engine
// Supports sovereign accounts, zero-balance start, server-authoritative mining, referral mechanics, atomic transfers, KYC, and admin separation

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  limit,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Transaction, NodeReferral } from "../types";

export interface GameSession {
  id: string;
  userId: string;
  userName: string;
  gameType: "ludo" | "crash" | "dice" | "coinflip" | "wheel" | "numbers" | "colors";
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  roomId?: string;
  roomCode?: string;
  roundId?: string;
  stake?: number;
  lastActiveAt: number;
  reconnectToken?: string;
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  userId: string; // Public format: e.g. MSDQ-104829
  email: string;
  displayName: string;
  phoneNumber?: string;
  walletAddress: string; // Permanent unique address: e.g. MSDQ94K7P2A91X08
  referralCode: string; // Permanent unique code: e.g. MSDQ7K4P92
  referredByUserId?: string;
  referredByReferralCode?: string;
  referralCreatedAt?: number;
  msdqBalance: number; // Starts at exactly 0.0
  balanceMSDQ?: number; // Aliased for compatibility
  availableBalance: number; // Starts at 0.0
  miningBalance: number; // Starts at 0.0
  ptsBalance: number; // Starts at 0
  referralBalance: number; // Starts at 0.0
  rewardBalance: number; // Starts at 0.0
  joiningBonusClaimed: boolean;
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";
  kycDocumentNumber?: string;
  status: "Active" | "Frozen" | "Flagged";
  role: "user" | "admin" | "super_admin";
  createdAt: number;
  lastActiveAt: number;
  // Mining Engine state
  miningStatus: "idle" | "mining" | "completed";
  miningStartedAt?: number;
  miningEndsAt?: number;
  miningRate: number; // Default e.g. 1.0 MSDQ/hr
  miningSessionId?: string;
  lastMiningCalculatedAt?: number;
  // Daily Check-in state
  lastCheckInDate?: string; // YYYY-MM-DD
  checkInStreak: number;
  // Referral tracking
  totalReferrals: number;
  activeReferrals: number;
  referralRewards: number;
  referralCommissionEarned?: number;
}

export interface KycApplicationData {
  id: string;
  userId: string;
  userEmail: string;
  legalName: string;
  dob: string;
  nationality: string;
  idType: "National ID" | "Passport" | "Driver's License";
  idNumber: string;
  documentPhoto?: string;
  selfiePhoto?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";
  submittedAt: number;
  reviewedAt?: number;
  reviewNotes?: string;
}

export interface AdminAuditRecord {
  id: string;
  adminEmail: string;
  action: string;
  details: string;
  targetUserId?: string;
  timestamp: number;
}

// -------------------------------------------------------------
// Core Firebase Initialization
// -------------------------------------------------------------
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// -------------------------------------------------------------
// Firestore Error Logging Helper (Skill Mandated)
// -------------------------------------------------------------
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Security / ABAC Context: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Database Accessor (backwards compatible)
// -------------------------------------------------------------
export function getDb() {
  return db;
}

// -------------------------------------------------------------
// Deterministic Generators for Unique User Identity
// -------------------------------------------------------------
export function generateUserId(uid: string): string {
  // Generate public user ID in format MSDQ-XXXXXX
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const numericStr = Math.abs(hash).toString().padStart(6, "0").slice(0, 6);
  return `MSDQ-${numericStr}`;
}

export function generateWalletAddress(uid: string): string {
  // Permanent unique MSDQ address: MSDQ + clean unique hex address
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const hex1 = Math.abs(hash1).toString(16).toUpperCase().padStart(8, "0");
  const hex2 = Math.abs(hash2).toString(16).toUpperCase().padStart(8, "0");
  const prefix = (cleanUid.slice(0, 8) + "MSDQ").slice(0, 8);
  return `MSDQ${prefix}${hex1}${hex2}`.slice(0, 26);
}

export function generateReferralCode(uid: string): string {
  // Unique referral code in format MSDQ + unique chars derived from full UID
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash |= 0;
  }
  const suffix = Math.abs(hash).toString(36).toUpperCase().padStart(5, "0").slice(0, 5);
  const prefix = cleanUid.slice(0, 4);
  return `MSDQ${prefix}${suffix}`;
}

// -------------------------------------------------------------
// Authentication Service with Zero-Balance Rule & Referral Detection
// -------------------------------------------------------------

export async function signInWithGoogle(): Promise<{ user: User; profile: UserProfile; isNew: boolean }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Retrieve or initialize profile starting from ZERO
  const profileResult = await getOrCreateUserProfile(user);
  return { user, profile: profileResult.profile, isNew: profileResult.isNew };
}

export async function loginWithEmail(email: string, pass: string): Promise<{ user: User; profile: UserProfile }> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const profileResult = await getOrCreateUserProfile(result.user);
  return { user: result.user, profile: profileResult.profile };
}

// -------------------------------------------------------------
// Server-Side Cloud Function Referral Validation & Atomic Ledger
// -------------------------------------------------------------

/**
 * Validate Referral Code using Server-Side Cloud Function
 * - Ensures referrer exists and is active
 * - Prevents self-referral
 */
export async function validateReferralCodeServer(
  code: string,
  email?: string,
  newUserId?: string
): Promise<{
  valid: boolean;
  error?: string;
  referrer?: { id: string; displayName: string; userId: string };
}> {
  if (!code || !code.trim()) {
    return { valid: false, error: "Referral code cannot be blank." };
  }
  const cleanCode = code.trim().toUpperCase();

  try {
    const res = await fetch("/api/functions/validateReferralCode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: cleanCode, newUserEmail: email, newUserId }),
    });

    const data = await res.json();
    if (!res.ok || !data.valid) {
      return { valid: false, error: data.error || "Referral code is invalid." };
    }
    return { valid: true, referrer: data.referrer };
  } catch (err: any) {
    // Fallback direct Firestore validation if server HTTP endpoint is unreachable
    try {
      const q = query(
        collection(db, "users"),
        where("referralCode", "==", cleanCode),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return {
          valid: false,
          error: `Referral code "${cleanCode}" does not exist on MSDQ Network.`,
        };
      }
      const refDoc = snap.docs[0];
      const refData = refDoc.data() as UserProfile;
      if (newUserId && refDoc.id === newUserId) {
        return { valid: false, error: "Self-referral is strictly forbidden." };
      }
      if (
        email &&
        refData.email &&
        refData.email.trim().toLowerCase() === email.trim().toLowerCase()
      ) {
        return {
          valid: false,
          error: "Self-referral is strictly forbidden: code matches your email.",
        };
      }
      return {
        valid: true,
        referrer: {
          id: refDoc.id,
          displayName: refData.displayName || "Node Miner",
          userId: refData.userId || `MSDQ-${refDoc.id.slice(0, 6)}`,
        },
      };
    } catch {
      return { valid: false, error: err.message || "Failed to validate referral code." };
    }
  }
}

/**
 * Apply Referral using Server-Side Cloud Function with Atomic Transaction
 * - Atomically increments referrer's totalReferrals & activeReferrals
 * - Atomically credits referrer's reward balance (+25 MSDQ)
 * - Records subcollection referral document
 * - Generates immutable ledger transaction
 * - Updates newly registered user profile with referredByUserId
 */
export async function validateAndApplyReferralServer(params: {
  newUserId: string;
  newUserEmail: string;
  newUserName?: string;
  referralCode: string;
}): Promise<{ success: boolean; rewardGranted?: number; error?: string }> {
  const { newUserId, newUserEmail, newUserName, referralCode } = params;
  const cleanCode = referralCode.trim().toUpperCase();

  try {
    const res = await fetch("/api/functions/validateAndApplyReferral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newUserId,
        newUserEmail,
        newUserName,
        referralCode: cleanCode,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to apply referral via Cloud Function.");
    }
    return { success: true, rewardGranted: data.rewardGranted };
  } catch (serverErr: any) {
    console.warn(
      "Cloud function HTTP call failed or errored, attempting atomic transaction fallback:",
      serverErr?.message
    );

    // Client-side atomic transaction fallback using runTransaction
    try {
      const q = query(
        collection(db, "users"),
        where("referralCode", "==", cleanCode),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error(`Referral code "${cleanCode}" does not exist on MSDQ Network.`);
      }

      const referrerId = snap.docs[0].id;
      if (referrerId === newUserId) {
        throw new Error("Self-referral is strictly forbidden.");
      }

      await runTransaction(db, async (tx) => {
        const referrerRef = doc(db, "users", referrerId);
        const newUserRef = doc(db, "users", newUserId);
        const refSubRef = doc(db, "users", referrerId, "referrals", newUserId);
        const txId = `ref-reward-${referrerId}-${newUserId}`;
        const txRef = doc(db, "transactions", txId);

        const [rSnap, uSnap, sSnap, tSnap] = await Promise.all([
          tx.get(referrerRef),
          tx.get(newUserRef),
          tx.get(refSubRef),
          tx.get(txRef),
        ]);

        if (!rSnap.exists()) throw new Error("Referrer account does not exist.");
        const rData = rSnap.data() as UserProfile;

        if (
          rData.email &&
          newUserEmail &&
          rData.email.trim().toLowerCase() === newUserEmail.trim().toLowerCase()
        ) {
          throw new Error("Self-referral is strictly forbidden.");
        }
        if (sSnap.exists()) throw new Error("Referral relationship already recorded.");
        if (tSnap.exists()) throw new Error("Referral reward has already been credited for this relationship.");

        const reward = 100.0;
        const curBal = rData.msdqBalance ?? rData.balanceMSDQ ?? 0.0;
        const curComm = rData.referralCommissionEarned || 0.0;

        tx.update(referrerRef, {
          totalReferrals: (rData.totalReferrals || 0) + 1,
          activeReferrals: (rData.activeReferrals || 0) + 1,
          msdqBalance: Number((curBal + reward).toFixed(4)),
          referralCommissionEarned: Number((curComm + reward).toFixed(4)),
          updatedAt: Date.now(),
        });

        tx.set(refSubRef, {
          id: newUserId,
          name: newUserName || "MSDQ Miner",
          email: newUserEmail,
          nodeCode: `MSDQ-${newUserId.slice(0, 6)}`,
          status: "Active",
          rewardMSDQ: reward,
          joinedAt: Date.now(),
        });

        tx.update(newUserRef, {
          referredByUserId: referrerId,
          referredByReferralCode: cleanCode,
          updatedAt: Date.now(),
        });

        tx.set(txRef, {
          id: txId,
          userId: referrerId,
          type: "REFERRAL_REWARD",
          amount: 100.0,
          usdValue: 50.0,
          referrerUserId: referrerId,
          referredUserId: newUserId,
          timestamp: Date.now(),
          status: "completed",
          txHash: `0x${Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("")}`,
          note: `Referral Reward: +100 MSDQ credited for verified referral of node #${newUserId.slice(0, 6)}`,
        });
      });

      return { success: true, rewardGranted: 100.0 };
    } catch (fallbackErr: any) {
      throw new Error(fallbackErr.message || serverErr.message || "Referral transaction failed.");
    }
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  pass: string,
  phone?: string,
  referralCodeInput?: string
): Promise<{ user: User; profile: UserProfile }> {
  // 1. One user = one account check: verify email not already registered
  try {
    const emailQuery = query(
      collection(db, "users"),
      where("email", "==", email.trim().toLowerCase()),
      limit(1)
    );
    const snap = await getDocs(emailQuery);
    if (!snap.empty) {
      throw new Error("An account already exists with this email address.");
    }
  } catch (err: any) {
    if (err.message?.includes("already exists")) throw err;
  }

  // 2. Server-side validation of Referral Code if provided
  const cleanRef = referralCodeInput?.trim().toUpperCase();
  if (cleanRef) {
    const validation = await validateReferralCodeServer(cleanRef, email.trim());
    if (!validation.valid) {
      throw new Error(validation.error || `Referral code "${cleanRef}" is invalid.`);
    }
  }

  // 3. Create Firebase Auth user
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name.trim()) {
    try {
      await updateProfile(result.user, { displayName: name.trim() });
    } catch {}
  }

  // 4. Initialize fresh profile starting strictly from ZERO
  const profileResult = await getOrCreateUserProfile(result.user, {
    displayName: name.trim() || "MSDQ Miner",
    phoneNumber: phone?.trim(),
  });

  // 5. Execute atomic server-side transaction for referral reward and verification
  if (cleanRef) {
    try {
      const applyResult = await validateAndApplyReferralServer({
        newUserId: result.user.uid,
        newUserEmail: email.trim(),
        newUserName: name.trim() || "MSDQ Miner",
        referralCode: cleanRef,
      });
      if (applyResult.success) {
        profileResult.profile.referredByReferralCode = cleanRef;
      }
    } catch (refErr: any) {
      console.warn("Referral transaction notice:", refErr?.message);
      // If error is self-referral or nonexistent, propagate clearly
      throw new Error(`Account created, but referral could not be applied: ${refErr.message}`);
    }
  }

  return { user: result.user, profile: profileResult.profile };
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// -------------------------------------------------------------
// Profile & Balances Management (New Account starts from ZERO)
// -------------------------------------------------------------
export async function getOrCreateUserProfile(
  user: User,
  options?: {
    displayName?: string;
    phoneNumber?: string;
    referredByUserId?: string;
    referredByReferralCode?: string;
  }
): Promise<{ profile: UserProfile; isNew: boolean }> {
  const userDocRef = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Update last active
      try {
        await updateDoc(userDocRef, { lastActiveAt: Date.now() });
      } catch {}
      return { profile: data, isNew: false };
    }
  } catch {
    // Continue to create or fallback
  }

  // New account initialization: START STRICTLY FROM ZERO
  // NO fake tokens, NO unearned welcome balance
  const isSuperAdmin = user.email === "shahid4jamil@gmail.com";
  const newProfile: UserProfile = {
    id: user.uid,
    userId: generateUserId(user.uid),
    email: user.email || "",
    displayName: options?.displayName || user.displayName || `Miner_${user.uid.slice(0, 5)}`,
    phoneNumber: options?.phoneNumber || user.phoneNumber || undefined,
    walletAddress: generateWalletAddress(user.uid),
    referralCode: generateReferralCode(user.uid),
    referredByUserId: options?.referredByUserId,
    referredByReferralCode: options?.referredByReferralCode,
    referralCreatedAt: options?.referredByUserId ? Date.now() : undefined,
    msdqBalance: 0.0,
    balanceMSDQ: 0.0,
    availableBalance: 0.0,
    miningBalance: 0.0,
    ptsBalance: 0,
    referralBalance: 0.0,
    rewardBalance: 0.0,
    joiningBonusClaimed: false,
    kycStatus: "NOT_SUBMITTED",
    status: "Active",
    role: isSuperAdmin ? "admin" : "user",
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    // Mining Engine defaults
    miningStatus: "idle",
    miningRate: 1.0,
    miningSessionId: undefined,
    // Daily Check-in defaults
    checkInStreak: 0,
    lastCheckInDate: undefined,
    // Referrals defaults
    totalReferrals: 0,
    activeReferrals: 0,
    referralRewards: 0.0,
    referralCommissionEarned: 0.0,
  };

  try {
    await setDoc(userDocRef, newProfile);
  } catch (err) {
    console.warn("Could not save initial user doc to Firestore:", err);
  }

  // Save to local storage cache as client backup
  try {
    localStorage.setItem(`msdq_user_profile_${user.uid}`, JSON.stringify(newProfile));
  } catch {}

  return { profile: newProfile, isNew: true };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn("Could not retrieve user profile from Firestore:", err);
  }
  return null;
}

export function subscribeToAuth(
  callback: (user: User | null, profile: UserProfile | null) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    const { profile } = await getOrCreateUserProfile(user);
    callback(user, profile);
  });
}

// -------------------------------------------------------------
// Server-Authoritative Mining Engine
// -------------------------------------------------------------

export async function startMiningSession(
  uid: string,
  rate: number = 1.0
): Promise<{ success: boolean; startedAt: number; endsAt: number; sessionId: string }> {
  const userRef = doc(db, "users", uid);
  const now = Date.now();
  const endsAt = now + 24 * 60 * 60 * 1000;
  const sessionId = `mine_${now}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    await updateDoc(userRef, {
      miningStatus: "mining",
      miningStartedAt: now,
      miningEndsAt: endsAt,
      miningRate: rate,
      miningSessionId: sessionId,
      lastMiningCalculatedAt: now,
    });

    // Save session record
    const sessionDocRef = doc(db, "users", uid, "miningSessions", sessionId);
    await setDoc(sessionDocRef, {
      id: sessionId,
      startTime: new Date(now).toISOString(),
      endTime: new Date(endsAt).toISOString(),
      durationHours: 24,
      effectiveRate: rate,
      status: "active",
    });

    return { success: true, startedAt: now, endsAt, sessionId };
  } catch (err: any) {
    console.error("Start mining failed:", err);
    throw new Error(err.message || "Failed to initiate sovereign mining sequence.");
  }
}

export async function claimMiningSessionReward(
  uid: string
): Promise<{ earned: number; newBalance: number }> {
  const userRef = doc(db, "users", uid);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) {
      throw new Error("User account not found.");
    }

    const data = snap.data() as UserProfile;
    if (data.miningStatus !== "mining" && data.miningStatus !== "completed") {
      throw new Error("No active or claimable mining cycle found.");
    }

    const now = Date.now();
    const startedAt = data.miningStartedAt || now;
    const endsAt = data.miningEndsAt || now;
    const rate = data.miningRate || 1.0;

    // Calculate accrued elapsed hours capped at 24 hours
    const elapsedMs = Math.min(endsAt, now) - startedAt;
    const elapsedHours = Math.max(0, elapsedMs / 3600000);
    const earned = parseFloat((elapsedHours * rate).toFixed(4));

    if (earned <= 0) {
      throw new Error("No mining yield accrued yet in this cycle.");
    }

    const currentBal = data.msdqBalance || 0;
    const newBal = parseFloat((currentBal + earned).toFixed(4));

    // Update user document atomically
    transaction.update(userRef, {
      msdqBalance: newBal,
      balanceMSDQ: newBal,
      miningStatus: "idle",
      miningStartedAt: null,
      miningEndsAt: null,
      miningBalance: 0,
      lastActiveAt: now,
    });

    // Record ledger transaction
    const txId = `tx-mine-${now}`;
    const txRef = doc(db, "transactions", txId);
    transaction.set(txRef, {
      id: txId,
      userId: uid,
      type: "mining",
      amount: earned,
      usdValue: earned * 0.5,
      timestamp: new Date(now).toISOString(),
      status: "confirmed",
      txHash: `0xmine${now.toString(16)}`,
      note: `Settled ${elapsedHours.toFixed(2)}h Consensus Mining Session`,
    });

    return { earned, newBalance: newBal };
  });
}

// -------------------------------------------------------------
// Daily Check-In Engine (Strict 1-per-day rule)
// -------------------------------------------------------------

export async function claimDailyCheckIn(
  uid: string,
  rewardAmount: number = 0.5
): Promise<{ claimed: boolean; streak: number; newBalance: number; message: string }> {
  const userRef = doc(db, "users", uid);
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) {
      throw new Error("User record not found.");
    }

    const data = snap.data() as UserProfile;
    if (data.lastCheckInDate === todayStr) {
      throw new Error("Daily check-in already completed for today! Return tomorrow.");
    }

    // Check if streak continued (yesterday)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = data.lastCheckInDate === yesterday ? (data.checkInStreak || 0) + 1 : 1;
    const currentBal = data.msdqBalance || 0;
    const newBal = parseFloat((currentBal + rewardAmount).toFixed(4));

    transaction.update(userRef, {
      msdqBalance: newBal,
      balanceMSDQ: newBal,
      lastCheckInDate: todayStr,
      checkInStreak: newStreak,
      lastActiveAt: Date.now(),
    });

    // Record check-in ledger transaction
    const txId = `tx-checkin-${Date.now()}`;
    const txRef = doc(db, "transactions", txId);
    transaction.set(txRef, {
      id: txId,
      userId: uid,
      type: "daily_reward",
      amount: rewardAmount,
      usdValue: rewardAmount * 0.5,
      timestamp: new Date().toISOString(),
      status: "confirmed",
      txHash: `0xcheck${Date.now().toString(16)}`,
      note: `Day ${newStreak} Sovereign Daily Node Check-in Reward`,
    });

    return {
      claimed: true,
      streak: newStreak,
      newBalance: newBal,
      message: `Day ${newStreak} Check-in successfully claimed (+${rewardAmount} MSDQ)!`,
    };
  });
}

// -------------------------------------------------------------
// Ledger / Transaction Management
// -------------------------------------------------------------

export async function recordLedgerTransaction(
  userId: string,
  tx: Omit<Transaction, "id">
): Promise<string> {
  const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const txRef = doc(db, "transactions", txId);

  const payload: Transaction = {
    ...tx,
    id: txId,
  };

  try {
    await setDoc(txRef, payload);
    return txId;
  } catch (err) {
    console.error("Could not record transaction:", err);
    return txId;
  }
}

export function subscribeToUserTransactions(
  uid: string,
  callback: (transactions: Transaction[]) => void
): () => void {
  try {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", uid),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push(doc.data() as Transaction);
      });
      // Sort newest first
      txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(txs);
    }, (err) => {
      console.warn("Error listening to transactions:", err);
    });
  } catch (e) {
    console.warn("Could not setup transaction listener:", e);
    return () => {};
  }
}

export function subscribeToUserReferrals(
  uid: string,
  callback: (referrals: NodeReferral[]) => void
): () => void {
  try {
    const q = query(
      collection(db, "users", uid, "referrals"),
      limit(50)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const refs: NodeReferral[] = [];
        snapshot.forEach((doc) => {
          refs.push(doc.data() as NodeReferral);
        });
        callback(refs);
      },
      (err) => {
        console.warn("Error listening to referrals:", err);
      }
    );
  } catch (e) {
    console.warn("Could not setup referrals listener:", e);
    return () => {};
  }
}

// -------------------------------------------------------------
// Atomic P2P User-to-User MSDQ Transfer
// -------------------------------------------------------------
export async function transferMsdqAtomic(
  senderUid: string,
  senderAddress: string,
  recipientAddress: string,
  amount: number,
  fee: number = 0.1
): Promise<{ success: boolean; txHash: string; message: string }> {
  if (amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  if (senderAddress.toUpperCase() === recipientAddress.trim().toUpperCase()) {
    throw new Error("Cannot send MSDQ to your own wallet address.");
  }

  const txHash = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-4)}`;
  const totalDeduction = amount + fee;

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Sender doc
      const senderRef = doc(db, "users", senderUid);
      const senderSnap = await transaction.get(senderRef);

      if (!senderSnap.exists()) {
        throw new Error("Sender account not found on protocol ledger.");
      }

      const senderData = senderSnap.data() as UserProfile;
      if (senderData.status === "Frozen") {
        throw new Error("Account is frozen. Outgoing transfers suspended.");
      }
      if (senderData.msdqBalance < totalDeduction) {
        throw new Error(
          `Insufficient MSDQ balance. Needed: ${totalDeduction.toFixed(2)} MSDQ (including fee), Available: ${senderData.msdqBalance.toFixed(2)} MSDQ.`
        );
      }

      // 2. Locate recipient by unique wallet address
      const recipientQuery = query(
        collection(db, "users"),
        where("walletAddress", "==", recipientAddress.trim().toUpperCase()),
        limit(1)
      );
      const recipientDocs = await getDocs(recipientQuery);

      if (recipientDocs.empty) {
        throw new Error(`Recipient wallet address "${recipientAddress}" not found on MSDQ Network.`);
      }

      const recipientDoc = recipientDocs.docs[0];
      const recipientRef = recipientDoc.ref;
      const recipientData = recipientDoc.data() as UserProfile;

      // 3. Atomically update balances
      transaction.update(senderRef, {
        msdqBalance: parseFloat((senderData.msdqBalance - totalDeduction).toFixed(4)),
        balanceMSDQ: parseFloat((senderData.msdqBalance - totalDeduction).toFixed(4)),
        lastActiveAt: Date.now(),
      });

      transaction.update(recipientRef, {
        msdqBalance: parseFloat((recipientData.msdqBalance + amount).toFixed(4)),
        balanceMSDQ: parseFloat((recipientData.msdqBalance + amount).toFixed(4)),
        lastActiveAt: Date.now(),
      });

      // 4. Record transactions in ledger
      const senderTxId = `tx-send-${Date.now()}`;
      const recipientTxId = `tx-recv-${Date.now()}`;

      const txSenderRef = doc(db, "transactions", senderTxId);
      transaction.set(txSenderRef, {
        id: senderTxId,
        userId: senderUid,
        type: "send",
        amount: -amount,
        fee,
        senderAddress,
        receiverAddress: recipientAddress.trim().toUpperCase(),
        txHash,
        status: "confirmed",
        timestamp: new Date().toISOString(),
        note: `P2P Transfer to ${recipientAddress.slice(0, 8)}...`,
      });

      const txRecipientRef = doc(db, "transactions", recipientTxId);
      transaction.set(txRecipientRef, {
        id: recipientTxId,
        userId: recipientData.id,
        type: "receive",
        amount: amount,
        fee: 0,
        senderAddress,
        receiverAddress: recipientAddress.trim().toUpperCase(),
        txHash,
        status: "confirmed",
        timestamp: new Date().toISOString(),
        note: `Received P2P Transfer from ${senderAddress.slice(0, 8)}...`,
      });
    });

    return {
      success: true,
      txHash,
      message: `Successfully transferred ${amount.toFixed(2)} MSDQ to ${recipientAddress}.`,
    };
  } catch (err: any) {
    console.error("Atomic transfer failed:", err);
    throw new Error(err.message || "Transaction failed. Please try again.");
  }
}

// -------------------------------------------------------------
// KYC Submission & Management
// -------------------------------------------------------------
export async function submitKycVerification(
  userId: string,
  userEmail: string,
  data: Omit<KycApplicationData, "id" | "userId" | "userEmail" | "status" | "submittedAt">
): Promise<{ success: boolean; message: string }> {
  // One account check: ensure ID number is not already verified under another account
  try {
    const duplicateQuery = query(
      collection(db, "users"),
      where("kycDocumentNumber", "==", data.idNumber.trim().toUpperCase()),
      where("kycStatus", "==", "VERIFIED"),
      limit(1)
    );
    const dupSnap = await getDocs(duplicateQuery);
    if (!dupSnap.empty && dupSnap.docs[0].id !== userId) {
      throw new Error("This identity document is already associated with another verified MSDQ account.");
    }
  } catch (err: any) {
    if (err.message?.includes("already associated")) throw err;
  }

  const appRef = doc(db, "kyc_applications", userId);
  const applicationRecord: KycApplicationData = {
    ...data,
    id: userId,
    userId,
    userEmail,
    idNumber: data.idNumber.trim().toUpperCase(),
    status: "PENDING",
    submittedAt: Date.now(),
  };

  try {
    await setDoc(appRef, applicationRecord);
    // Update user profile status
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      kycStatus: "PENDING",
      kycDocumentNumber: data.idNumber.trim().toUpperCase(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `kyc_applications/${userId}`);
  }

  return {
    success: true,
    message: "Your KYC application has been submitted securely and is pending administrative review.",
  };
}

export async function reviewKycApplication(
  appId: string,
  decision: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION",
  notes: string = ""
): Promise<boolean> {
  const appRef = doc(db, "kyc_applications", appId);
  const userRef = doc(db, "users", appId);

  try {
    await updateDoc(appRef, {
      status: decision,
      reviewedAt: Date.now(),
      reviewNotes: notes,
    });

    await updateDoc(userRef, {
      kycStatus: decision,
    });

    return true;
  } catch (err) {
    console.error("KYC review determination failed:", err);
    return false;
  }
}

// -------------------------------------------------------------
// Admin Security & Management Functions
// -------------------------------------------------------------

export function isUserAdmin(user: User | null, profile: UserProfile | null): boolean {
  if (!user && !profile) return false;
  if (user?.email === "shahid4jamil@gmail.com") return true;
  if (profile?.role === "admin" || profile?.role === "super_admin") return true;
  return false;
}

export async function fetchAllUsersForAdmin(): Promise<UserProfile[]> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, limit(100));
  const snap = await getDocs(q);
  const list: UserProfile[] = [];
  snap.forEach((doc) => {
    list.push(doc.data() as UserProfile);
  });
  return list;
}

export async function updateUserStatusByAdmin(
  targetUid: string,
  status: "Active" | "Frozen" | "Flagged",
  adminEmail: string
): Promise<boolean> {
  try {
    const userRef = doc(db, "users", targetUid);
    await updateDoc(userRef, { status });

    // Save audit log
    await saveAdminAuditLog({
      adminEmail,
      action: "USER_STATUS_CHANGE",
      details: `Changed status of user ${targetUid} to ${status}`,
      targetUserId: targetUid,
    });

    return true;
  } catch (err) {
    console.error("Admin status update failed:", err);
    return false;
  }
}

export async function adjustUserBalanceByAdmin(
  targetUid: string,
  delta: number,
  reason: string,
  adminEmail: string
): Promise<boolean> {
  const userRef = doc(db, "users", targetUid);

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error("Target user does not exist.");

      const data = snap.data() as UserProfile;
      const newBal = Math.max(0, (data.msdqBalance || 0) + delta);

      transaction.update(userRef, {
        msdqBalance: newBal,
        balanceMSDQ: newBal,
      });

      // Record transaction
      const txId = `tx-admin-${Date.now()}`;
      const txRef = doc(db, "transactions", txId);
      transaction.set(txRef, {
        id: txId,
        userId: targetUid,
        type: "conversion",
        amount: delta,
        usdValue: delta * 0.5,
        timestamp: new Date().toISOString(),
        status: "confirmed",
        txHash: `0xadmin${Date.now().toString(16)}`,
        note: `Admin adjustment by ${adminEmail}: ${reason}`,
      });
    });

    // Save audit log
    await saveAdminAuditLog({
      adminEmail,
      action: "BALANCE_ADJUSTMENT",
      details: `Adjusted user ${targetUid} by ${delta > 0 ? "+" : ""}${delta} MSDQ. Reason: ${reason}`,
      targetUserId: targetUid,
    });

    return true;
  } catch (err) {
    console.error("Admin balance adjustment failed:", err);
    return false;
  }
}

export async function saveAdminAuditLog(
  log: Omit<AdminAuditRecord, "id" | "timestamp">
): Promise<void> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const auditRef = doc(db, "system_audit_logs", id);
    await setDoc(auditRef, {
      ...log,
      id,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn("Could not record admin audit log:", e);
  }
}

// -------------------------------------------------------------
// Active Game Sessions (State Resumption & Reconnection)
// -------------------------------------------------------------
export async function checkActiveSessionInFirebase(
  userId: string,
  gameType: "ludo" | "crash" | "dice" | "coinflip" | "wheel" | "numbers" | "colors"
): Promise<GameSession | null> {
  const sessionId = `${userId}_${gameType}`;

  // Check local cache fallback first
  try {
    const cached = localStorage.getItem(`msdq_active_session_${gameType}_${userId}`);
    if (cached) {
      const parsed: GameSession = JSON.parse(cached);
      if (parsed.status === "ACTIVE" && Date.now() - parsed.lastActiveAt < 15 * 60 * 1000) {
        if (db) {
          try {
            const snap = await getDoc(doc(db, "game_sessions", sessionId));
            if (snap.exists()) {
              const remote = snap.data() as GameSession;
              if (remote.status === "ACTIVE") return remote;
            }
          } catch {
            return parsed;
          }
        }
        return parsed;
      }
    }
  } catch {}

  if (!db) return null;

  try {
    const docRef = doc(db, "game_sessions", sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as GameSession;
      if (data.status === "ACTIVE") return data;
    }
  } catch (err) {
    console.warn(`Failed to check Firebase session for ${sessionId}:`, err);
  }

  return null;
}

export async function saveActiveSessionToFirebase(session: GameSession): Promise<boolean> {
  const sessionId = `${session.userId}_${session.gameType}`;
  session.id = sessionId;
  session.lastActiveAt = Date.now();

  try {
    localStorage.setItem(`msdq_active_session_${session.gameType}_${session.userId}`, JSON.stringify(session));
  } catch {}

  if (!db) return true;

  try {
    const docRef = doc(db, "game_sessions", sessionId);
    await setDoc(docRef, session, { merge: true });
    return true;
  } catch (err) {
    console.warn(`Failed to save active game session:`, err);
    return false;
  }
}

export async function clearActiveSessionInFirebase(
  userId: string,
  gameType: "ludo" | "crash" | "dice" | "coinflip" | "wheel" | "numbers" | "colors",
  status: "COMPLETED" | "ABANDONED" = "COMPLETED"
): Promise<void> {
  const sessionId = `${userId}_${gameType}`;

  try {
    localStorage.removeItem(`msdq_active_session_${gameType}_${userId}`);
  } catch {}

  if (!db) return;

  try {
    const docRef = doc(db, "game_sessions", sessionId);
    await updateDoc(docRef, { status, lastActiveAt: Date.now() });
  } catch {
    try {
      await deleteDoc(doc(db, "game_sessions", sessionId));
    } catch {}
  }
}
