import React, { useState } from "react";
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
  signOutUser,
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
  joiningBonus?: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onAuthSuccess,
  onSignOut,
  joiningBonus = 10.0,
}) => {
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setErrorMessage("Invalid email or password. Please verify your credentials.");
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
      setErrorMessage("Please provide your full callsign / legal name.");
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
      setErrorMessage("Passwords do not match.");
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
        joiningBonus
      );
      onAuthSuccess(user, profile);
      onClose();
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use" || err.message?.includes("already exists")) {
        setErrorMessage("An account already exists for this user. One User = One Account policy strictly enforced.");
      } else {
        setErrorMessage(err.message || "Registration failed.");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-[#0f141f] border border-[#2a3447] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[#94a3b8] hover:text-white transition-colors"
          title="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Brand & Security Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#10b981] via-[#059669] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-[#10b981]/20">
            <span className="material-symbols-outlined text-white text-[22px]">shield_person</span>
          </div>
          <div>
            <h2 className="text-lg font-mono font-black text-white tracking-tight">
              MSDQ Sovereign ID Enclave
            </h2>
            <p className="text-xs font-mono text-[#94a3b8]">
              One User = One Account Consensus Security
            </p>
          </div>
        </div>

        {/* ALREADY LOGGED IN VIEW */}
        {currentUser && userProfile ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#0a0e17] border border-[#10b981]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#94a3b8]">Verified Account</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                  AUTHENTICATED
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-white font-mono">
                  {userProfile.displayName || currentUser.displayName || "Sovereign Miner"}
                </div>
                <div className="text-xs text-[#94a3b8] font-mono">{currentUser.email}</div>
              </div>

              {/* Permanent Unique Wallet Address */}
              <div className="p-3 rounded-xl bg-[#131823] border border-[#2a3447] space-y-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#64748b]">
                  Permanent Sovereign Address
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#38bdf8] truncate">
                    {userProfile.walletAddress}
                  </span>
                  <button
                    onClick={handleCopyWalletAddress}
                    className="p-1.5 rounded-lg bg-[#1e2738] hover:bg-[#2a374f] text-[#94a3b8] hover:text-white transition-colors shrink-0"
                    title="Copy Address"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedAddress ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              </div>

              {/* KYC Status Badge */}
              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-[#94a3b8]">KYC Level:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    userProfile.kycStatus === "VERIFIED"
                      ? "bg-[#10b981]/20 text-[#10b981]"
                      : userProfile.kycStatus === "PENDING"
                      ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                      : "bg-[#64748b]/20 text-[#94a3b8]"
                  }`}
                >
                  {userProfile.kycStatus.replace("_", " ")}
                </span>
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
                Register
              </button>
            </div>

            {/* Notification messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-xs font-mono flex items-center gap-2 animate-fadeIn">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs font-mono flex items-center gap-2 animate-fadeIn">
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
              <span>OR EMAIL SECURE LOGIN</span>
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
                  {loading ? "Authenticating Enclave..." : "Sign In to MSDQ Node"}
                </button>
              </form>
            )}

            {/* TAB: REGISTER */}
            {tab === "signup" && (
              <form onSubmit={handleEmailSignUp} className="space-y-3 font-mono">
                <div>
                  <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                    Full Callsign / Legal Name
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
                    Phone (Optional Verification)
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
                    I agree to the MSDQ Network Consensus Protocol Terms. I understand that multi-accounting or fraudulent claims are forbidden.
                  </span>
                </label>

                {/* Account Genesis Balance Guarantee Note */}
                <div className="p-2.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/25 text-[10px] text-[#10b981] space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    <span>Genesis Balance Guarantee</span>
                  </div>
                  <p className="text-[#a7f3d0]">
                    New accounts begin from zero with un-mined reserves, receiving {joiningBonus.toFixed(2)} MSDQ initial genesis joining grant.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] text-white font-mono font-black text-xs transition-all shadow-lg shadow-[#10b981]/20 hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Creating Node Enclave..." : "Create Sovereign Account"}
                </button>
              </form>
            )}

            {/* TAB: FORGOT PASSWORD */}
            {tab === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-3 font-mono">
                <p className="text-xs text-[#94a3b8]">
                  Enter the email address registered with your MSDQ Network enclave to receive recovery instructions.
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
                    className="w-1/3 py-2.5 rounded-xl bg-[#1e2738] text-[#94a3b8] hover:text-white text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2.5 rounded-xl bg-[#10b981] text-[#0f141f] text-xs font-black hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send Reset Email"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Footer Policy Badge */}
        <div className="pt-2 text-center border-t border-[#2a3447]/60">
          <span className="text-[10px] font-mono text-[#64748b]">
            Secured by Firebase Auth • One-Account Byzantine Fault Proof
          </span>
        </div>
      </div>
    </div>
  );
};
