import React, { useState, useEffect, useRef } from "react";
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
  signOutUser,
  validateReferralCodeServer,
  formatFirebaseAuthError,
  sendEmailVerificationCode,
  verifyEmailCode,
  resendEmailVerificationCode,
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
  const [tab, setTab] = useState<"signin" | "signup" | "forgot" | "verify">("signin");
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

  // 6-Digit Email OTP Verification State
  const [otpCode, setOtpCode] = useState("");
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("10:00");
  const [otpVerified, setOtpVerified] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

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

  // Timer countdown for resend cooldown and code expiration
  useEffect(() => {
    if (resendCooldown <= 0 && !otpExpiresAt) return;

    const interval = setInterval(() => {
      // Handle cooldown
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));

      // Handle expiration
      if (otpExpiresAt) {
        const remainingMs = otpExpiresAt - Date.now();
        if (remainingMs <= 0) {
          setTimeLeftStr("Expired");
        } else {
          const mins = Math.floor(remainingMs / 60000);
          const secs = Math.floor((remainingMs % 60000) / 1000);
          setTimeLeftStr(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown, otpExpiresAt]);

  // Focus OTP input when switching to verify tab
  useEffect(() => {
    if (tab === "verify") {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  }, [tab]);

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
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and master password.");
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
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Password Policy: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  const validatePasswordPolicy = (pass: string): boolean => {
    if (pass.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNum = /[0-9]/.test(pass);
    return hasUpper && hasLower && hasNum;
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please provide your full legal name or callsign.");
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    // Strict Password Policy Enforcement (Requirement 9)
    if (!validatePasswordPolicy(password)) {
      setErrorMessage(
        "Password must contain at least 8 characters with at least one uppercase letter, one lowercase letter, and one number."
      );
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
    try {
      // 1. Create account with 0.00 starting balance in Firestore
      const { user, profile } = await registerWithEmail(
        fullName,
        email,
        password,
        phone.trim() || undefined,
        referralCode.trim() || undefined
      );

      setPendingUser(user);
      setPendingProfile(profile);

      // 2. Dispatch 6-digit numeric verification OTP
      try {
        const otpResp = await sendEmailVerificationCode(email, user.uid);
        setResendCooldown(otpResp.cooldownSeconds || 60);
        setOtpExpiresAt(otpResp.expiresAt || Date.now() + 10 * 60 * 1000);
        setSuccessMessage(
          `A 6-digit verification code has been dispatched to ${email}. Enter the code below to activate your account.`
        );
      } catch (otpErr: any) {
        console.warn("OTP dispatch notice:", otpErr?.message);
        setSuccessMessage(`Account initialized. Please enter the verification code sent to ${email}.`);
      }

      // 3. Move to Verify tab
      setTab("verify");
    } catch (err: any) {
      console.error("Registration error:", err);
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Please enter a valid 6-digit numeric verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await verifyEmailCode(email, cleanOtp, pendingUser?.uid);
      setOtpVerified(true);
      setSuccessMessage("Email verified successfully! Your MSDQ node account has been activated.");

      // Complete login flow with activated status
      setTimeout(() => {
        if (pendingUser && pendingProfile) {
          const activatedProfile: UserProfile = {
            ...pendingProfile,
            status: "Active",
          };
          onAuthSuccess(pendingUser, activatedProfile);
        }
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setErrorMessage(err.message || "Invalid or expired verification code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const resp = await resendEmailVerificationCode(email, pendingUser?.uid);
      setResendCooldown(resp.cooldownSeconds || 60);
      setOtpExpiresAt(resp.expiresAt || Date.now() + 10 * 60 * 1000);
      setSuccessMessage(`A new 6-digit verification code has been dispatched to ${email}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend verification code. Please wait a moment.");
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
      setErrorMessage(formatFirebaseAuthError(err));
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
      <div className="relative w-full max-w-md bg-[#0f141f] border border-[#2a3447] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#10b981] via-[#06b6d4] to-[#3b82f6]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[#10b981] text-[22px]">
                {tab === "verify" ? "mark_email_read" : "lock"}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-mono font-black text-white tracking-wide">
                {currentUser ? "Node Identity" : tab === "verify" ? "Email Verification" : "MSDQ Network"}
              </h2>
              <p className="text-xs text-[#94a3b8] font-mono">
                {currentUser ? "Sovereign Account" : tab === "verify" ? "6-Digit Security Code" : "Decentralized Mining Protocol"}
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
                <span className="text-[#94a3b8]">MSDQ User ID:</span>
                <span className="font-bold text-[#10b981] tracking-wider">
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
              className="w-full py-3 rounded-2xl bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444]/30 text-[#ef4444] font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Disconnect &amp; Logout
            </button>
          </div>
        ) : (
          <>
            {/* Tab Selection (only visible when not on OTP verification screen) */}
            {tab !== "verify" && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0a0e17] border border-[#2a3447]">
                <button
                  type="button"
                  onClick={() => {
                    setTab("signin");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
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
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    tab === "signup"
                      ? "bg-[#10b981] text-[#0f141f] shadow-md shadow-[#10b981]/20"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Notification messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-xs font-mono flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs font-mono flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">check_circle</span>
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* Google Fast Sign-In (on signin/signup tabs) */}
            {tab !== "verify" && tab !== "forgot" && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-[#1e2738] hover:bg-[#28354c] border border-[#2a3447] text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg disabled:opacity-50 min-h-[44px]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>OR EMAIL CREDENTIALS</span>
                  <div className="h-[1px] flex-1 bg-[#2a3447]"></div>
                </div>
              </>
            )}

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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[44px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("forgot");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[10px] text-[#38bdf8] hover:underline cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[44px]"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#94a3b8] pt-1">
                  <span>Have an unverified email?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("verify");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[#10b981] hover:underline cursor-pointer"
                  >
                    Enter Verification Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-[#0f141f] font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer disabled:opacity-50 min-h-[44px] mt-2"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[42px]"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[42px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                      Password (Min. 8)
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 chars"
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[42px]"
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
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[42px]"
                    />
                  </div>
                </div>

                {/* Password Criteria Prompt (Requirement 9) */}
                <div className="p-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-[10px] text-[#94a3b8] space-y-1">
                  <div className="text-white font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-[#38bdf8]">shield</span>
                    <span>Password Security Standards:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                    <span className={password.length >= 8 ? "text-[#10b981] font-bold" : "text-[#94a3b8]"}>
                      {password.length >= 8 ? "✓" : "•"} At least 8 characters
                    </span>
                    <span className={/[A-Z]/.test(password) ? "text-[#10b981] font-bold" : "text-[#94a3b8]"}>
                      {/[A-Z]/.test(password) ? "✓" : "•"} One uppercase letter (A-Z)
                    </span>
                    <span className={/[a-z]/.test(password) ? "text-[#10b981] font-bold" : "text-[#94a3b8]"}>
                      {/[a-z]/.test(password) ? "✓" : "•"} One lowercase letter (a-z)
                    </span>
                    <span className={/[0-9]/.test(password) ? "text-[#10b981] font-bold" : "text-[#94a3b8]"}>
                      {/[0-9]/.test(password) ? "✓" : "•"} One number (0-9)
                    </span>
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
                      className={`w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border text-white text-xs placeholder-[#475569] focus:outline-none uppercase min-h-[42px] ${
                        refStatus?.checked
                          ? refStatus.valid
                            ? "border-[#10b981] text-[#10b981]"
                            : "border-[#ef4444] text-[#ef4444]"
                          : "border-[#2a3447] focus:border-[#10b981]"
                      }`}
                    />
                    {refChecking && (
                      <div className="absolute right-3 top-3 flex items-center gap-1.5 text-[10px] text-[#38bdf8]">
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
                              +100.00 MSDQ referral reward will be credited to BOTH referrer and your account!
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[42px]"
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
                    All new accounts start with exactly 0.00 MSDQ. Earn tokens legitimately through server-validated daily mining, tasks, and referrals.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] text-white font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? "Initializing Account..." : "Create Free Account"}
                </button>
              </form>
            )}

            {/* TAB: 6-DIGIT EMAIL OTP VERIFICATION */}
            {tab === "verify" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 font-mono">
                <div className="p-3.5 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-[#38bdf8]">mail</span>
                    <span>Check Your Email Inbox</span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    We sent a 6-digit verification code to{" "}
                    <span className="text-white font-bold underline">{email || "your email address"}</span>. Enter the code to activate your account.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-bold">
                      Enter 6-Digit Code
                    </label>
                    <span className="text-[10px] font-mono text-[#38bdf8]">
                      Expires: {timeLeftStr}
                    </span>
                  </div>

                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(val);
                      if (val.length === 6) {
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="••••••"
                    className="w-full py-3 px-4 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-center text-white text-2xl font-black font-mono tracking-[0.5em] placeholder-[#334155] focus:outline-none focus:border-[#10b981] min-h-[52px]"
                  />
                  <p className="text-[10px] text-[#64748b] text-center mt-1">
                    6 numeric digits (e.g. 849201)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6 || otpVerified}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-[#0f141f] font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {loading
                    ? "Verifying Code..."
                    : otpVerified
                    ? "Account Activated! Redirecting..."
                    : "Verify & Activate Account"}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("signin");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-xs text-[#38bdf8] hover:underline disabled:text-[#475569] disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#10b981] min-h-[44px]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("signin");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#1e2738] hover:bg-[#28354c] border border-[#2a3447] text-white text-xs font-mono font-bold transition-all min-h-[44px] cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#0f141f] text-xs font-mono font-bold transition-all shadow-md shadow-[#10b981]/20 min-h-[44px] cursor-pointer disabled:opacity-50"
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

