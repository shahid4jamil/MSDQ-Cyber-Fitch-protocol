import React, { useState, useEffect } from "react";
import { NodeReferral } from "../types";
import { UserProfile } from "../lib/firebase";

interface ReferralLeader {
  rank: number;
  name: string;
  nodes: number;
  commission: string;
  badge: string;
  medal?: string;
}

interface ReferralsScreenProps {
  referrals: NodeReferral[];
  onPingNode: (nodeId: string) => void;
  onOpenInviteModal?: () => void;
  userProfile?: UserProfile | null;
}

export const ReferralsScreen: React.FC<ReferralsScreenProps> = ({
  referrals,
  onPingNode,
  onOpenInviteModal,
  userProfile,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [leaders, setLeaders] = useState<ReferralLeader[]>([
    { rank: 1, name: "CyberVanguard_01", nodes: 248, commission: "24,800.00", badge: "Grand Ambassador", medal: "🥇" },
    { rank: 2, name: "QuantumSentinel", nodes: 184, commission: "18,400.00", badge: "Master Ambassador", medal: "🥈" },
    { rank: 3, name: "NeonVanguard_X", nodes: 142, commission: "14,200.00", badge: "Lead Ambassador", medal: "🥉" },
    { rank: 4, name: "ChronoMiner_IV", nodes: 98, commission: "9,800.00", badge: "Syndicate Prime" },
    { rank: 5, name: "AetherForge_9", nodes: 76, commission: "7,600.00", badge: "Syndicate Prime" },
    { rank: 6, name: "BitNexus_Pro", nodes: 64, commission: "6,400.00", badge: "Senior Pioneer" },
    { rank: 7, name: "Hyperion_X", nodes: 51, commission: "5,100.00", badge: "Senior Pioneer" },
    { rank: 8, name: "Valkyrie_Node", nodes: 42, commission: "4,200.00", badge: "Pioneer Node" },
    { rank: 9, name: "Solaris_Core", nodes: 37, commission: "3,700.00", badge: "Pioneer Node" },
    { rank: 10, name: "ZeroGravity_Rig", nodes: 29, commission: "2,900.00", badge: "Pioneer Node" },
  ]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadLeaders = async () => {
      setIsLoadingLeaders(true);
      try {
        const resp = await fetch("/api/referrals/leaders");
        if (resp.ok) {
          const data = await resp.json();
          if (isMounted && data.success && Array.isArray(data.leaders) && data.leaders.length > 0) {
            setLeaders(data.leaders);
          }
        }
      } catch (err) {
        // Keeps graceful baseline pioneers
      } finally {
        if (isMounted) setIsLoadingLeaders(false);
      }
    };
    loadLeaders();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.totalReferrals]);

  const referralCode = userProfile?.referralCode || "MSDQ-CYBER";
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${referralCode}`
    : `https://msdq.network/?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Join MSDQ Network using my referral link:\n${referralLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MSDQ Network Sovereign Mining",
          text: `Join MSDQ Network using my referral link:\n${referralLink}`,
          url: referralLink,
        });
      } catch (e) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const totalReferrals = userProfile?.totalReferrals ?? referrals.length;
  const activeReferrals = userProfile?.activeReferrals ?? referrals.filter((r) => r.status === "Active").length;
  const referralRewards = userProfile?.referralCommissionEarned ?? userProfile?.referralRewards ?? 0.0;

  return (
    <div className="flex flex-col gap-4 pb-24 max-w-xl mx-auto px-3.5 pt-3">
      {/* Ambassador Tier Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c2028] via-[#151a24] to-[#12161f] border border-[#4edea3]/40 p-5 shadow-lg">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#4edea3] font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            AMBASSADOR SYNDICATE
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30">
            {totalReferrals} NODES LINKED
          </span>
        </div>

        <h1 className="text-xl font-mono font-bold text-[#dfe2ee] mt-2">
          Sovereign Node Syndicate
        </h1>
        <p className="text-xs text-[#bbcabf] mt-1">
          Expand your decentralized mining mesh to compound cryptographic hash surge bonuses across 3 recursive tiers.
        </p>

        {/* Tier Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#0a0e16] mt-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4edea3] to-[#4cd7f6]"
            style={{ width: `${Math.min(100, Math.max(10, (totalReferrals / 25) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[#bbcabf] mt-1.5">
          <span>{totalReferrals} Invited</span>
          <span>Next Rank: Master Ambassador (25 Nodes)</span>
        </div>
      </div>

      {/* Authoritative Referral Bounty Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1b2a24] to-[#15232d] border border-[#4edea3]/40 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
            <span className="material-symbols-outlined text-[24px]">card_giftcard</span>
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-[#dfe2ee]">
              Referral Reward: <span className="text-[#4edea3]">100.00 MSDQ</span>
            </div>
            <div className="text-[11px] text-[#bbcabf]">
              Credited automatically to your balance per qualified verified referral
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30 uppercase font-bold">
          100 MSDQ
        </span>
      </div>

      {/* Referral Yield Metrics Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 flex flex-col">
          <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Total Yield</span>
          <span className="text-sm font-mono font-bold text-[#4edea3] mt-1">
            {referralRewards.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#bbcabf] font-mono">MSDQ Earned</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 flex flex-col">
          <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Mesh Nodes</span>
          <span className="text-sm font-mono font-bold text-[#dfe2ee] mt-1">
            {totalReferrals}
          </span>
          <span className="text-[10px] text-[#4cd7f6] font-mono">{activeReferrals} Active</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 flex flex-col">
          <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Hash Surge</span>
          <span className="text-sm font-mono font-bold text-[#ffb95f] mt-1">
            +{(activeReferrals * 0.25).toFixed(2)} MH/s
          </span>
          <span className="text-[10px] text-[#4edea3] font-mono">
            +{(activeReferrals * 0.1).toFixed(2)} MSDQ/h
          </span>
        </div>
      </div>

      {/* Sovereign Node Referral Code & Share Card */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
            Your Sovereign Enclave Code
          </span>
          <span className="text-[10px] font-mono text-[#4edea3] bg-[#4edea3]/10 border border-[#4edea3]/30 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>

        {/* Code Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 rounded-2xl bg-[#0f131c] border border-[#4edea3]/40 font-mono text-sm font-bold text-[#4edea3] flex items-center justify-between">
            <span className="tracking-wider">{referralCode}</span>
            <span className="text-[10px] text-[#bbcabf] font-normal">ENCLAVE KEY</span>
          </div>

          <button
            onClick={handleCopyCode}
            className="p-3 rounded-2xl bg-[#262a33] border border-[#3c4a42]/60 text-[#dfe2ee] hover:text-[#4edea3] hover:border-[#4edea3]/40 transition-colors flex items-center justify-center cursor-pointer"
            title="Copy Referral Code"
          >
            <span className="material-symbols-outlined text-[20px]">
              {copiedCode ? "check" : "content_copy"}
            </span>
          </button>
        </div>

        {/* Referral Link Bar */}
        <div>
          <label className="text-[10px] font-mono text-[#bbcabf] uppercase block mb-1">
            Direct Invitation Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0f131c] border border-[#2a3447] font-mono text-xs text-[#94a3b8] truncate focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-[#262a33] border border-[#3c4a42]/60 text-xs font-mono text-[#dfe2ee] hover:text-[#4edea3] transition-colors cursor-pointer shrink-0"
            >
              {copiedLink ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Real Share Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* WhatsApp Share Button */}
          <button
            onClick={handleWhatsAppShare}
            className="py-2.5 px-3 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/30 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>WhatsApp Share</span>
          </button>

          {/* Native Web Share Button */}
          <button
            onClick={handleNativeShare}
            className="py-2.5 px-3 rounded-2xl bg-[#4edea3] text-[#003824] font-mono text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-[#4edea3]/20"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>Share Link</span>
          </button>
        </div>
      </div>

      {/* 3-Tier Commission Matrix */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
          Syndicate Commission Matrix
        </span>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#4edea3]/30">
            <span className="text-[10px] font-mono text-[#4edea3] font-bold uppercase">Tier 1 Direct</span>
            <div className="text-lg font-mono font-bold text-[#dfe2ee] mt-1">15%</div>
            <span className="text-[10px] text-[#bbcabf] font-mono">Direct Referrals</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#4cd7f6]/30">
            <span className="text-[10px] font-mono text-[#4cd7f6] font-bold uppercase">Tier 2 Sub</span>
            <div className="text-lg font-mono font-bold text-[#dfe2ee] mt-1">5%</div>
            <span className="text-[10px] text-[#bbcabf] font-mono">Secondary Mesh</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#ffb95f]/30">
            <span className="text-[10px] font-mono text-[#ffb95f] font-bold uppercase">Tier 3 Swarm</span>
            <div className="text-lg font-mono font-bold text-[#dfe2ee] mt-1">2%</div>
            <span className="text-[10px] text-[#bbcabf] font-mono">Swarm Quorum</span>
          </div>
        </div>
      </div>

      {/* Connected Hardware Nodes List */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[18px]">
              hub
            </span>
            <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
              Connected Hardware Nodes
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#bbcabf]">
            {referrals.length} Nodes Loaded
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#1c2028] border border-[#2a3447] mx-auto flex items-center justify-center text-[#94a3b8]">
              <span className="material-symbols-outlined text-[24px]">group_add</span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono">
              No nodes joined with your referral key yet.
            </p>
            <p className="text-[11px] text-[#4edea3] font-mono">
              Share your link above to build your mining syndicate!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#3c4a42]/30 mt-2">
            {referrals.map((node) => (
              <div key={node.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#262a33] flex items-center justify-center font-mono text-xs text-[#4edea3] border border-[#3c4a42]/50">
                    {node.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#dfe2ee]">{node.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#4edea3]/10 text-[#4edea3]">
                        {node.tier}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#bbcabf] mt-0.5">
                      +{node.hashContribution} MH/s • {node.yieldGenerated.toFixed(1)} MSDQ Yield
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                        node.status === "Active"
                          ? "bg-[#4edea3]/10 text-[#4edea3]"
                          : node.status === "Idle"
                          ? "bg-[#ffb4ab]/10 text-[#ffb4ab]"
                          : "bg-[#ffb95f]/10 text-[#ffb95f]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          node.status === "Active"
                            ? "bg-[#4edea3]"
                            : node.status === "Idle"
                            ? "bg-[#ffb4ab]"
                            : "bg-[#ffb95f]"
                        }`}
                      />
                      {node.status}
                    </span>
                    <div className="text-[9px] font-mono text-[#86948a] mt-0.5">
                      {node.lastPing}
                    </div>
                  </div>

                  {node.canPing && (
                    <button
                      onClick={() => onPingNode(node.id)}
                      className="p-1.5 rounded-xl bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30 hover:bg-[#ffb95f]/25 transition-colors text-xs flex items-center cursor-pointer"
                      title="Send Wakeup Ping"
                    >
                      <span className="material-symbols-outlined text-[16px]">notifications</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral Leaders — Top 10 Syndicate Vanguard */}
      <div className="rounded-3xl bg-[#181c24] border border-[#ffb95f]/40 p-4 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">
              leaderboard
            </span>
            <div>
              <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider block">
                Referral Leaders
              </span>
              <span className="text-[10px] font-mono text-[#bbcabf]">
                Top 10 Pioneers by Total Nodes Referred
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30">
            SEASON 3
          </span>
        </div>

        {/* Top 10 Referral Leaderboard List */}
        <div className="divide-y divide-[#3c4a42]/30 mt-2">
          {leaders.map((leader) => (
            <div key={leader.rank} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                    leader.rank === 1
                      ? "bg-[#ffb95f]/20 text-[#ffb95f] border border-[#ffb95f]/50"
                      : leader.rank === 2
                      ? "bg-[#dfe2ee]/20 text-[#dfe2ee] border border-[#dfe2ee]/40"
                      : leader.rank === 3
                      ? "bg-[#cd7f32]/20 text-[#ffaa55] border border-[#cd7f32]/40"
                      : "bg-[#262a33] text-[#bbcabf]"
                  }`}
                >
                  {leader.medal || `#${leader.rank}`}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#dfe2ee]">{leader.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30">
                      {leader.badge}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#bbcabf] mt-0.5">
                    Commission: <span className="text-[#4edea3]">+{leader.commission} MSDQ</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-[#ffb95f]">
                  {leader.nodes} Nodes
                </div>
                <div className="text-[9px] font-mono text-[#86948a]">
                  Referred
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anti-Fraud Sybil Security Banner */}
      <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-start gap-3">
        <span className="material-symbols-outlined text-[#4cd7f6] text-[20px] shrink-0 mt-0.5">
          security
        </span>
        <div className="text-xs text-[#bbcabf] leading-relaxed">
          <span className="font-bold text-[#dfe2ee]">Automated Sybil Armor Active: </span>
          All referral nodes must pass decentralized Proof-of-Tap and hardware entropy challenges. Duplicate IP clustering is automatically isolated.
        </div>
      </div>
    </div>
  );
};
