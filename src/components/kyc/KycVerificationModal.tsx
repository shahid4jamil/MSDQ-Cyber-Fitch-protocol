import React, { useState } from "react";
import { submitKycVerification, KycApplicationData } from "../../lib/firebase";

interface KycVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  currentKycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";
  onKycSubmitted: (newStatus: "PENDING") => void;
  reviewNotes?: string;
}

export const KycVerificationModal: React.FC<KycVerificationModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentKycStatus,
  onKycSubmitted,
  reviewNotes,
}) => {
  const [legalName, setLegalName] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [idType, setIdType] = useState<"National ID" | "Passport" | "Driver's License">("National ID");
  const [idNumber, setIdNumber] = useState("");
  const [documentFile, setDocumentFile] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfieFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !dob || !nationality.trim() || !idNumber.trim()) {
      setErrorMsg("Please complete all required identity verification fields.");
      return;
    }
    if (!consentChecked) {
      setErrorMsg("Please confirm the legal verification declaration.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitKycVerification(userId, userEmail, {
        legalName: legalName.trim(),
        dob,
        nationality: nationality.trim(),
        idType,
        idNumber: idNumber.trim().toUpperCase(),
        documentPhoto: documentFile || "demo_document_captured.png",
        selfiePhoto: selfieFile || "demo_selfie_captured.png",
      });

      setSuccessMsg(res.message);
      onKycSubmitted("PENDING");
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error("KYC submission error:", err);
      setErrorMsg(err.message || "Failed to submit KYC verification. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="msdq-kyc-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#0f141f] border border-[#2a3447] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#1e2738] hover:bg-[#2a374f] text-[#94a3b8] hover:text-white transition-colors"
          title="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#0284c7] flex items-center justify-center text-white shadow-lg shadow-[#3b82f6]/20">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
          <div>
            <h2 className="text-lg font-mono font-black text-white tracking-tight">
              Sovereign KYC Enclave (Level 2)
            </h2>
            <p className="text-xs font-mono text-[#94a3b8]">
              Anti-Sybil Verification &amp; Unrestricted Sovereign Ledger Access
            </p>
          </div>
        </div>

        {/* CURRENT STATUS VIEW */}
        {currentKycStatus === "VERIFIED" && (
          <div className="p-5 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/40 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#10b981]/20 border border-[#10b981] text-[#10b981] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h3 className="text-base font-mono font-bold text-white">Identity Verified &amp; Certified</h3>
            <p className="text-xs font-mono text-[#94a3b8] max-w-md mx-auto">
              Your sovereign identity has been authenticated. Your account has full unconstrained privileges for P2P transfers, high-yield staking, and high-frequency game node consensus.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-[#10b981] text-[#0f141f] font-mono font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {currentKycStatus === "PENDING" && (
          <div className="p-5 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/40 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b] text-[#f59e0b] flex items-center justify-center mx-auto animate-pulse">
              <span className="material-symbols-outlined text-[28px]">hourglass_top</span>
            </div>
            <h3 className="text-base font-mono font-bold text-white">Verification in Progress</h3>
            <p className="text-xs font-mono text-[#94a3b8] max-w-md mx-auto">
              Your identity documents are undergoing administrative consensus review. This process typically takes under 24 hours. You will receive an in-app notice upon determination.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-[#1e2738] text-white font-mono font-bold text-xs"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

        {/* NOT_SUBMITTED, REJECTED, or NEEDS_RESUBMISSION FORM */}
        {(currentKycStatus === "NOT_SUBMITTED" ||
          currentKycStatus === "REJECTED" ||
          currentKycStatus === "NEEDS_RESUBMISSION") && (
          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            {/* Rejection / Resubmission Notice */}
            {reviewNotes && (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Feedback from Admin Protocol Enclave:</span>
                </div>
                <p className="text-[11px] text-[#fca5a5]">{reviewNotes}</p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                Legal Full Name (Matching Official Document)
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Alexander Vance"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                  Nationality / Country
                </label>
                <input
                  type="text"
                  required
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. United Kingdom"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                  Document Type
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs focus:outline-none focus:border-[#3b82f6]"
                >
                  <option value="National ID">National ID Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver's License">Driver's License</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block mb-1">
                  Document Serial Number
                </label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. A93820194"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-[#2a3447] text-white text-xs placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
            </div>

            {/* Document and Selfie Upload Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2">
                <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block">
                  1. Front Document Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDocumentUpload}
                  className="text-[10px] text-[#64748b] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-mono file:bg-[#1e2738] file:text-[#38bdf8] hover:file:bg-[#28354c] cursor-pointer"
                />
                {documentFile && (
                  <div className="text-[10px] text-[#10b981] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Document Image Captured</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-[#0a0e17] border border-[#2a3447] space-y-2">
                <label className="text-[10px] text-[#94a3b8] uppercase tracking-wider block">
                  2. Selfie / Facial Liveness
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  className="text-[10px] text-[#64748b] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-mono file:bg-[#1e2738] file:text-[#38bdf8] hover:file:bg-[#28354c] cursor-pointer"
                />
                {selfieFile && (
                  <div className="text-[10px] text-[#10b981] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Selfie Image Captured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Declaration Checkbox */}
            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded border-[#2a3447] bg-[#0a0e17] text-[#3b82f6] focus:ring-0 cursor-pointer"
              />
              <span className="text-[10px] text-[#94a3b8] leading-tight">
                I hereby declare that this government document belongs to me and that this is my sole account on the MSDQ Network.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#3b82f6] via-[#0284c7] to-[#0369a1] text-white font-mono font-black text-xs transition-all shadow-lg shadow-[#3b82f6]/25 hover:brightness-110 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Encrypting & Transmitting Payload..." : "Submit KYC Identity Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
