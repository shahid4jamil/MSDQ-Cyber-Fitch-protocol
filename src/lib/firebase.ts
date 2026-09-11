// MSDQ Network - Firebase Firestore & Authentication Engine
// Supports sovereign wallets, one-account policy, atomic transfers, KYC validation, and game session resumption

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
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

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
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  walletAddress: string;
  msdqBalance: number;
  balanceMSDQ?: number;
  ptsBalance: number;
  miningBalance: number;
  earnedBalance: number;
  joiningBonusClaimed: boolean;
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";
  kycDocumentNumber?: string;
  status: "Active" | "Frozen" | "Flagged";
  role: "user" | "admin";
  createdAt: number;
  lastActiveAt: number;
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
// Deterministic Unique Wallet Address Generator
// -------------------------------------------------------------
export function generateWalletAddress(uid: string): string {
  // Convert UID to uppercase alphanumeric format prefixed by MSDQ
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = cleanUid.length >= 10 ? cleanUid.slice(0, 10) : (cleanUid + "8K4X92AB7P").slice(0, 10);
  return `MSDQ${suffix}7R`;
}

// -------------------------------------------------------------
// Authentication Service with One-User-One-Account Enforcement
// -------------------------------------------------------------

export async function signInWithGoogle(): Promise<{ user: User; profile: UserProfile; isNew: boolean }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Retrieve or initialize profile starting from ZERO + configured joining bonus
  const profileResult = await getOrCreateUserProfile(user);
  return { user, profile: profileResult.profile, isNew: profileResult.isNew };
}

export async function loginWithEmail(email: string, pass: string): Promise<{ user: User; profile: UserProfile }> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const profileResult = await getOrCreateUserProfile(result.user);
  return { user: result.user, profile: profileResult.profile };
}

export async function registerWithEmail(
  name: string,
  email: string,
  pass: string,
  phone?: string,
  joiningBonus: number = 10.0
): Promise<{ user: User; profile: UserProfile }> {
  // 1. One user = one account check: verify email or phone not already registered
  try {
    const emailQuery = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()), limit(1));
    const snap = await getDocs(emailQuery);
    if (!snap.empty) {
      throw new Error("An account already exists for this user.");
    }
  } catch (err: any) {
    if (err.message?.includes("An account already exists")) throw err;
  }

  // 2. Create Firebase Auth user
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name.trim()) {
    try {
      await updateProfile(result.user, { displayName: name.trim() });
    } catch {}
  }

  // 3. Initialize fresh profile starting from ZERO
  const profileResult = await getOrCreateUserProfile(result.user, {
    displayName: name.trim() || "MSDQ Miner",
    phoneNumber: phone?.trim(),
    joiningBonus,
  });

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
  options?: { displayName?: string; phoneNumber?: string; joiningBonus?: number }
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

  // New account initialization: START FROM ZERO with ONLY the configured joining bonus
  const joiningBonusAmount = options?.joiningBonus ?? 10.0;
  const newProfile: UserProfile = {
    id: user.uid,
    email: user.email || "",
    displayName: options?.displayName || user.displayName || `Miner_${user.uid.slice(0, 5)}`,
    phoneNumber: options?.phoneNumber || user.phoneNumber || undefined,
    walletAddress: generateWalletAddress(user.uid),
    msdqBalance: joiningBonusAmount, // Only joining bonus granted initially
    ptsBalance: 0,
    miningBalance: 0,
    earnedBalance: 0,
    joiningBonusClaimed: true,
    kycStatus: "NOT_SUBMITTED",
    status: "Active",
    role: user.email === "shahid4jamil@gmail.com" ? "admin" : "user",
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  try {
    await setDoc(userDocRef, newProfile);
  } catch (err) {
    console.warn("Could not save initial user doc to Firestore (local fallback applied):", err);
  }

  // Save to local storage cache as backup
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
        msdqBalance: senderData.msdqBalance - totalDeduction,
        lastActiveAt: Date.now(),
      });

      transaction.update(recipientRef, {
        msdqBalance: recipientData.msdqBalance + amount,
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
        timestamp: Date.now(),
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
        timestamp: Date.now(),
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

