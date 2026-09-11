import React, { useState, useEffect } from "react";
import { FAQ_ITEMS } from "../data/mockData";

export const HalvingScreen: React.FC = () => {
  // Real-time countdown timer
  const [timeLeft, setTimeLeft] = useState({
    days: 48,
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  // Interactive scarcity calculator slider
  const [simulatedHashrate, setSimulatedHashrate] = useState<number>(1.5);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [epochAlertEnabled, setEpochAlertEnabled] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const preDaily = simulatedHashrate * 24;
  const postDaily = (simulatedHashrate * 0.5) * 24;
  const projectedDeflationGain = preDaily * 0.5 * 1.85; // Estimated scarcity value appreciation

  return (
    <div className="flex flex-col gap-4 pb-24 max-w-xl mx-auto px-3.5 pt-3">
      {/* Halving Countdown Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c2028] via-[#151921] to-[#0f131c] border border-[#ffb95f]/40 p-5 shadow-[0_4px_30px_rgba(255,185,95,0.08)]">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#ffb95f]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between text-xs font-mono text-[#bbcabf]">
          <span className="flex items-center gap-1.5 text-[#ffb95f] font-bold">
            <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            PROTOCOL DEFICIT CYCLE
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ffb95f]/15 text-[#ffb95f] border border-[#ffb95f]/30">
            EPOCH 4 HALVING
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-mono font-bold text-[#dfe2ee] mt-3">
          Emission Halving in Progress
        </h1>
        <p className="text-xs text-[#bbcabf] mt-1">
          At block height #1,500,000, base node block emissions automatically compress by 50% to maintain programmatic scarcity.
        </p>

        {/* 4-Column Countdown Timer Box */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a0e16]/80 border border-[#3c4a42]/60">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#ffb95f]">
              {String(timeLeft.days).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase mt-0.5">Days</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a0e16]/80 border border-[#3c4a42]/60">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#dfe2ee]">
              {String(timeLeft.hours).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase mt-0.5">Hours</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a0e16]/80 border border-[#3c4a42]/60">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#dfe2ee]">
              {String(timeLeft.minutes).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase mt-0.5">Mins</span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0a0e16]/80 border border-[#3c4a42]/60">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#4edea3] animate-pulse">
              {String(timeLeft.seconds).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase mt-0.5">Secs</span>
          </div>
        </div>

        {/* Rate Cut Shift Comparison */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#3c4a42]/40">
          <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50">
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Current Yield</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-[#dfe2ee]">1.00</span>
              <span className="text-xs font-mono text-[#4edea3]">MSDQ/h</span>
            </div>
            <span className="text-[10px] text-[#86948a] font-mono">Epoch 3 (Active)</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#1c2028] border border-[#ffb95f]/40 relative overflow-hidden">
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#ffb95f] text-[#472a00]">
              -50%
            </div>
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Post-Halving Yield</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-mono font-bold text-[#ffb95f]">0.50</span>
              <span className="text-xs font-mono text-[#ffb95f]">MSDQ/h</span>
            </div>
            <span className="text-[10px] text-[#bbcabf] font-mono">Epoch 4 (At #1.50M)</span>
          </div>
        </div>
      </div>

      {/* Epoch 3 Block Progress Bar Card */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#dfe2ee] font-semibold">Epoch 3 Progression</span>
          <span className="text-[#4edea3] font-bold">62.7% Completed</span>
        </div>

        {/* Progress bar container */}
        <div className="w-full h-3 rounded-full bg-[#0a0e16] border border-[#3c4a42]/50 mt-2.5 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4edea3] via-[#4cd7f6] to-[#ffb95f] transition-all duration-500 shadow-[0_0_12px_rgba(78,222,163,0.5)]"
            style={{ width: "62.7%" }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-[#bbcabf] mt-2">
          <span>Synced: Block #941,208</span>
          <span>Target: Block #1,500,000</span>
        </div>

        <div className="mt-3 p-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center justify-between text-xs">
          <span className="text-[#bbcabf] font-mono">Circulating Supply</span>
          <span className="font-mono font-bold text-[#dfe2ee]">
            142,850,000 / 210,000,000 MSDQ
          </span>
        </div>
      </div>

      {/* Interactive Yield Scarcity Simulator */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">
              tune
            </span>
            <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase">
              Yield Scarcity Model Simulator
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#4edea3]">Live Calculator</span>
        </div>

        <p className="text-xs text-[#bbcabf] mt-2">
          Slide your node hashrate to project personal daily yield adjustments and potential scarcity appreciation.
        </p>

        {/* Slider Input */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#bbcabf]">Selected Hashrate:</span>
            <span className="text-sm font-bold text-[#4edea3]">
              {simulatedHashrate.toFixed(2)} MH/s
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="10.0"
            step="0.25"
            value={simulatedHashrate}
            onChange={(e) => setSimulatedHashrate(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg bg-[#0a0e16] accent-[#4edea3] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#86948a] mt-1">
            <span>0.50 MH/s</span>
            <span>5.00 MH/s</span>
            <span>10.00 MH/s</span>
          </div>
        </div>

        {/* Results Matrix */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
            <span className="text-[10px] font-mono text-[#bbcabf] uppercase">Pre-Halving Daily</span>
            <div className="text-base font-mono font-bold text-[#dfe2ee] mt-0.5">
              {preDaily.toFixed(2)} MSDQ
            </div>
            <span className="text-[10px] text-[#bbcabf] font-mono">≈ ${(preDaily * 0.5).toFixed(2)} USD</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#ffb95f]/40">
            <span className="text-[10px] font-mono text-[#ffb95f] uppercase">Post-Halving Daily</span>
            <div className="text-base font-mono font-bold text-[#ffb95f] mt-0.5">
              {postDaily.toFixed(2)} MSDQ
            </div>
            <span className="text-[10px] text-[#4edea3] font-mono">Deflationary Cap</span>
          </div>
        </div>

        <div className="mt-3 p-2.5 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/30 text-xs flex items-center justify-between">
          <span className="text-[#dfe2ee]">Target Valuation Scarcity Index</span>
          <span className="font-mono font-bold text-[#4edea3]">+85% Projected</span>
        </div>
      </div>

      {/* Epoch Historical Roadmap Timeline */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
          MSDQ Epoch Roadmap
        </span>

        <div className="relative pl-6 mt-4 space-y-4 border-l border-[#3c4a42]/60">
          <div className="relative">
            <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-[#4edea3] ring-4 ring-[#0f131c]"></div>
            <div className="text-xs font-mono font-bold text-[#4edea3]">Epoch 1 (Genesis 2024)</div>
            <div className="text-xs text-[#bbcabf]">Block #0 - #500,000 • 4.00 MSDQ/hr (Completed)</div>
          </div>

          <div className="relative">
            <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-[#4edea3] ring-4 ring-[#0f131c]"></div>
            <div className="text-xs font-mono font-bold text-[#4edea3]">Epoch 2 (2025)</div>
            <div className="text-xs text-[#bbcabf]">Block #500,000 - #1,000,000 • 2.00 MSDQ/hr (Completed)</div>
          </div>

          <div className="relative">
            <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#ffb95f] ring-4 ring-[#0f131c] animate-pulse"></div>
            <div className="text-xs font-mono font-bold text-[#ffb95f]">Epoch 3 (Current Active)</div>
            <div className="text-xs text-[#dfe2ee]">Block #1,000,000 - #1,500,000 • 1.00 MSDQ/hr (In Progress)</div>
          </div>

          <div className="relative opacity-70">
            <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-[#3c4a42] ring-4 ring-[#0f131c]"></div>
            <div className="text-xs font-mono font-bold text-[#bbcabf]">Epoch 4 (Next Block #1.5M)</div>
            <div className="text-xs text-[#86948a]">Block #1,500,000 - #2,000,000 • 0.50 MSDQ/hr</div>
          </div>
        </div>
      </div>

      {/* Halving FAQ Accordion */}
      <div className="rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 p-4">
        <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
          Halving Protocol FAQ
        </span>

        <div className="divide-y divide-[#3c4a42]/30 mt-3">
          {FAQ_ITEMS.map((faq, idx) => (
            <div key={idx} className="py-2.5">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left text-xs font-medium text-[#dfe2ee] hover:text-[#4edea3] transition-colors"
              >
                <span>{faq.q}</span>
                <span className="material-symbols-outlined text-[18px] text-[#bbcabf]">
                  {expandedFaq === idx ? "expand_less" : "expand_more"}
                </span>
              </button>
              {expandedFaq === idx && (
                <p className="text-xs text-[#bbcabf] mt-1.5 leading-relaxed pl-1">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Halving Alert Notification Toggle */}
      <div className="p-3.5 rounded-2xl bg-[#1c2028] border border-[#3c4a42]/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ffb95f] text-[22px]">
            notifications_active
          </span>
          <div>
            <div className="text-xs font-bold text-[#dfe2ee]">Decentralized Epoch Alert</div>
            <div className="text-[10px] text-[#bbcabf]">Notify me 48 hours and 1 hour before trigger block</div>
          </div>
        </div>
        <button
          onClick={() => setEpochAlertEnabled(!epochAlertEnabled)}
          className={`w-11 h-6 rounded-full p-1 transition-colors ${
            epochAlertEnabled ? "bg-[#4edea3]" : "bg-[#3c4a42]"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-[#0f131c] transition-transform ${
              epochAlertEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          ></div>
        </button>
      </div>
    </div>
  );
};
