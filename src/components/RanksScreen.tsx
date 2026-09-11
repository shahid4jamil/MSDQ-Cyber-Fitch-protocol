import React from "react";

export const RanksScreen: React.FC = () => {
  const topVanguard = [
    {
      rank: 1,
      name: "CyberVanguard_01",
      mined: "48,920.00",
      tier: "Grandmaster",
      hash: "12.8 MH/s",
      badge: "🥇",
    },
    {
      rank: 2,
      name: "QuantumRig_Alpha",
      mined: "39,450.50",
      tier: "Master",
      hash: "10.4 MH/s",
      badge: "🥈",
    },
    {
      rank: 3,
      name: "AetherMiner_IX",
      mined: "32,180.20",
      tier: "Diamond",
      hash: "8.9 MH/s",
      badge: "🥉",
    },
  ];

  const clusterNodes = [
    { rank: 4, name: "NeonSentinel_9", mined: "28,400.00", tier: "Diamond", hash: "7.6 MH/s" },
    { rank: 5, name: "ChronoEnclave", mined: "24,110.40", tier: "Platinum", hash: "6.9 MH/s" },
    { rank: 6, name: "Hyperion_X", mined: "21,890.00", tier: "Platinum", hash: "6.2 MH/s" },
    { rank: 7, name: "BitNexus_Pro", mined: "19,450.20", tier: "Gold", hash: "5.8 MH/s" },
    { rank: 8, name: "Valkyrie_Node", mined: "17,900.50", tier: "Gold", hash: "5.4 MH/s" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-24 max-w-xl mx-auto px-3.5 pt-3">
      {/* Season 3 Prize Pool Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c2028] via-[#161a22] to-[#0f131c] border border-[#ffb95f]/40 p-5 shadow-lg">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#ffb95f] font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">military_tech</span>
            SEASON 3 LEADERBOARD
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30">
            12 DAYS REMAINING
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-mono font-bold text-[#dfe2ee] mt-2">
          250,000 MSDQ Prize Pool
        </h1>
        <p className="text-xs text-[#bbcabf] mt-1">
          Top 100 highest-yielding nodes receive proportional season genesis rewards and automated tier promotions.
        </p>

        {/* User Card in Leaderboard */}
        <div className="mt-4 p-3 rounded-2xl bg-[#0f131c] border border-[#4edea3]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4edea3]/20 border border-[#4edea3]/40 text-[#4edea3] flex items-center justify-center font-mono font-bold text-xs">
              #42
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#dfe2ee] flex items-center gap-1.5">
                <span>Node #MSDQ-8842 (You)</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#4edea3]/10 text-[#4edea3]">
                  DIAMOND
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#bbcabf]">
                14,852.40 MSDQ • Hash 1.50 MH/s
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#4edea3]">Top 5%</span>
        </div>
      </div>

      {/* Top 3 Vanguard Podium */}
      <div className="grid grid-cols-3 gap-2 items-end pt-2">
        {/* 2nd Place */}
        <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 flex flex-col items-center text-center">
          <span className="text-xl">🥈</span>
          <span className="text-[11px] font-mono font-bold text-[#dfe2ee] mt-1 truncate max-w-[90px]">
            {topVanguard[1].name}
          </span>
          <span className="text-[10px] font-mono text-[#4cd7f6] mt-0.5">
            {topVanguard[1].mined}
          </span>
          <span className="text-[9px] font-mono text-[#86948a] mt-0.5">Rank #2</span>
        </div>

        {/* 1st Place */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#262a33] to-[#1c2028] border border-[#ffb95f]/50 flex flex-col items-center text-center -translate-y-2 shadow-md">
          <span className="text-2xl">🥇</span>
          <span className="text-xs font-mono font-extrabold text-[#ffb95f] mt-1 truncate max-w-[100px]">
            {topVanguard[0].name}
          </span>
          <span className="text-xs font-mono font-bold text-[#dfe2ee] mt-0.5">
            {topVanguard[0].mined}
          </span>
          <span className="text-[10px] font-mono text-[#4edea3] mt-0.5">Rank #1</span>
        </div>

        {/* 3rd Place */}
        <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 flex flex-col items-center text-center">
          <span className="text-xl">🥉</span>
          <span className="text-[11px] font-mono font-bold text-[#dfe2ee] mt-1 truncate max-w-[90px]">
            {topVanguard[2].name}
          </span>
          <span className="text-[10px] font-mono text-[#ffb95f] mt-0.5">
            {topVanguard[2].mined}
          </span>
          <span className="text-[9px] font-mono text-[#86948a] mt-0.5">Rank #3</span>
        </div>
      </div>

      {/* Ranked Cluster List */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
          Node Cluster Vanguard (#4 - #8)
        </span>

        <div className="divide-y divide-[#3c4a42]/30 mt-3">
          {clusterNodes.map((node) => (
            <div key={node.rank} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-[#bbcabf] w-5">
                  #{node.rank}
                </span>
                <div>
                  <div className="text-xs font-medium text-[#dfe2ee]">{node.name}</div>
                  <div className="text-[10px] font-mono text-[#bbcabf]">
                    {node.tier} • {node.hash}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-[#4edea3]">
                  {node.mined} MSDQ
                </div>
                <div className="text-[9px] font-mono text-[#86948a]">Active Node</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
