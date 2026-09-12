import React, { useState, useEffect } from "react";
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
  signOutUser,
  validateReferralCodeServer,
  UserProfile,
} from "../../lib/firebase";
import { User } from "firebase/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onAuthSuccess: (user: User, profile: UserProfile) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onAuthSuccess,
  onSignOut,
}) => {
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Real-time server referral validation state
  const [refChecking, setRefChecking] = useState(false);
  const [refStatus, setRefStatus] = useState<{
    checked: boolean;
    valid: boolean;
    error?: string;
    referrer?: { id: string; displayName: string; userId: string };
  } | null>(null);

  // Auto-detect referral code from URL query parameter ?ref=CODE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get("ref");
      if (refParam) {
        setReferralCode(refParam.trim().toUpperCase());
      }
    } catch {}
  }, []);

  // Real-time server-side debounce validation of referral code
  useEffect(() => {
    const cleanRef = referralCode.trim().toUpperCase();
    if (!cleanRef) {
      setRefStatus(null);
      setRefChecking(false);
      return;
    }

    setRefChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await validateReferralCodeServer(cleanRef, email.trim());
        setRefStatus({
          checked: true,
          valid: result.valid,
          error: result.error,
          referrer: result.referrer,
        });
      } catch (err: any) {
        setRefStatus({
          checked: true,
          valid: false,
          error: err.message || "Failed to validate code.",
        });
      } finally {
        setRefChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [referralCode, email]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { user, profile } = await signInWithGoogle();
      onAuthSuccess(user, profile);
      onClose();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setErrorMessage(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const { user, profile } = await loginWithEmail(email, password);
      onAuthSuccess(user, profile);
      onClose();
    } catch (err: any) {
      console.error("Email login error:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setErrorMessage("Invalid email or master password. Please verify your credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setErrorMessage("Too many failed attempts. Please reset your password or try again later.");
      } else {
        setErrorMessage(err.message || "Failed to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage("Please provide your full legal name or callsign.");
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage("Please enter email and password.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }
    if (!termsAccepted) {
      setErrorMessage("You must accept the MSDQ Network Consensus Terms & Conditions.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { user, profile } = await registerWithEmail(
        fullName,
        email,
        password,
        phone.trim() || undefined,
        referralCode.trim() || undefined
      );
      onAuthSuccess(user, profile);
      onClose();
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use" || err.message?.includes("already exists")) {
        setErrorMessage("An account already exists with this email address.");
      } else {
        setErrorMessage(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your registered account email.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await sendPasswordReset(email);
      setSuccessMessage(`Password recovery link dispatched to ${email}. Check your inbox.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to send password recovery link.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWalletAddress = () => {
    if (!userProfile?.walletAddress) return;
    navigator.clipboard?.writeText(userProfile.walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div
      id="msdq-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md bg-[#0f141f] border border-[#2a3447] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#10b981] via-[#06b6d4] to-[#3b82f6]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[#10b981] text-[22px]">
                lock
              </span>
            </div>
            <div>
              <h2 className="text-lg font-mono font-black text-white tracking-wide">
                {currentUser ? "Node Identity" : "MSDQ Network"}
              </h2>
              <p className="text-xs text-[#94a3b8] font-mono">
                {currentUser ? "Sovereign Account" : "Decentralized Mining Protocol"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#1e2738] hover:bg-[#28354c] border border-[#2a3447] text-[#94a3b8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {currentUser ? (
          /* Profile Details (Logged In) */
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Callsign:</span>
                <span className="font-bold text-white">
                  {userProfile?.displayName || currentUser.displayName || "Miner"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">User ID:</span>
                <span className="font-bold text-[#10b981]">
                  {userProfile?.userId || "MSDQ-NODE"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Email:</span>
                <span className="text-white truncate max-w-[200px]">
                  {currentUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Referral Code:</span>
                <span className="font-bold text-[#38bdf8]">
                  {userProfile?.referralCode || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2738]">
                <span className="text-[#94a3b8]">Account Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/30">
                  {userProfile?.status || "Active"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[#94a3b8]">
                  <span>Sovereign Address:</span>
                  <button
                    onClick={handleCopyWalletAddress}
                    className="text-[#10b981] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedAddress ? "check" : "content_copy"}
                    </span>
                    <span>{copiedAddress ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-[#1e2738] text-[11px] text-white font-mono break-all select-all border border-[#2a3447]">
                  {userProfile?.walletAddress || "Generating..."}
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                await signOutUser();
                onSignOut();
                onClose();
              }}
              className="w-full py-3 rounded-2xl bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444]/30 text-[#ef4444] font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Disconnect &amp; Logout
            </button>
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0a0e17] border border-[#2a3447]">
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  tab === "signin"
                    ? "bg-[#10b981] text-[#0f141f] shadow-md shadow-[#10b981]/20"
                    : "text-[#94a3b8] hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  tab === "signup"
                    ? "bg-[#10b981] text-[#0f141f] shadow-md shadow-[#10b981]/20"
                    : "text-[#94a3b8] hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Notification messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-xs font-mono flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs font-mono flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Google Fast Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-[#1e2738] hover:bg-[#28354c] border border-[#2a3447] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 text-[#64748b] text-xs font-mono">
              <div className="h-[1px] flex-1 bg-[#2a3447]"></div>
              <span>OR EMAIL ACCOUNT</span>
              <div className="h-[1px] flex-1 bg-[#2a3447]"></div>
            </div>

            {/* TAB: SIGN IN */}
            {tab === "signin" && (
              <form onSubmit={handleEmailSignIn} className="space-y-3 font-mono">
                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="miner@msdq.network"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab("forgot")}
                      className="text-[10px] text-[#38bdf8] hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-[#0f141f] font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? "Authenticating Node..." : "Sign In to MSDQ Node"}
                </button>
              </form>
            )}

            {/* TAB: REGISTER */}
            {tab === "signup" && (
              <form onSubmit={handleEmailSignUp} className="space-y-3 font-mono">
                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Full Name / Callsign
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Miner"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="miner@msdq.network"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                      Confirm
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MSDQ7K4P92"
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border text-white text-xs placeholder-[#475569] focus:outline-none uppercase ${
                        refStatus?.checked
                          ? refStatus.valid
                            ? "border-[#10b981] text-[#10b981]"
                            : "border-[#ef4444] text-[#ef4444]"
                          : "border-[#2a3447] focus:border-[#10b981]"
                      }`}
                    />
                    {refChecking && (
                      <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[10px] text-[#38bdf8]">
                        <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping"></span>
                        <span className="font-mono text-[9px]">Verifying...</span>
                      </div>
                    )}
                  </div>

                  {/* Server-Side Validation Feedback */}
                  {refStatus?.checked && (
                    <div
                      className={`mt-1.5 p-2 rounded-lg text-[10px] font-mono flex items-start gap-1.5 ${
                        refStatus.valid
                          ? "bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]"
                          : "bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">
                        {refStatus.valid ? "verified" : "cancel"}
                      </span>
                      <div>
                        {refStatus.valid ? (
                          <>
                            <div className="font-bold">
                              Referrer Verified: {refStatus.referrer?.displayName} (
                              {refStatus.referrer?.userId})
                            </div>
                            <div className="text-[9px] text-[#10b981]/80">
                              +100.00 MSDQ reward atomically credited to referrer in Firestore transaction
                            </div>
                          </>
                        ) : (
                          <div>{refStatus.error || "Referral code invalid or self-referral detected."}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                {/* Terms Agreement Checkbox */}
                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-[#2a3447] bg-[#0a0e17] text-[#10b981] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[10px] text-[#94a3b8] leading-tight">
                    I agree to the MSDQ Network Protocol Terms. I understand multi-accounting is strictly prohibited.
                  </span>
                </label>

                {/* Account Zero Starting Balance Guarantee */}
                <div className="p-2.5 rounded-xl bg-[#1e2738] border border-[#2a3447] text-[10px] text-[#94a3b8] space-y-0.5">
                  <div className="font-bold text-white flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#10b981]">verified</span>
                    <span>Zero-Balance Standard</span>
                  </div>
                  <p>
                    All new accounts start with exactly 0.00 MSDQ. Earn rewards through server-validated daily mining, tasks, and referrals.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] text-white font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Creating Node Account..." : "Create Free Account"}
                </button>
              </form>
            )}

            {/* TAB: FORGOT PASSWORD */}
            {tab === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-3 font-mono">
                <p className="text-xs text-[#94a3b8]">
                  Enter the email address registered with your MSDQ Network account to receive a secure password reset link.
                </p>
                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="miner@msdq.network"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("signin")}
                    className="flex-1 py-2.5 rounded-xl bg-[#1e2738] hover:bg-[#28354c] border border-[#2a3447] text-white text-xs font-mono font-bold transition-all"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#0f141f] text-xs font-mono font-bold transition-all shadow-md shadow-[#10b981]/20"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
