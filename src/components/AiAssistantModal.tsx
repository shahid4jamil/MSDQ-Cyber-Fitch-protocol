import React, { useState, useRef, useEffect } from "react";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "advisor";
  text: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      role: "advisor",
      text: `**MSDQ Neural Advisor v4.2 Enclave Synced.**
Node #MSDQ-8842 telemetry loaded. I can assist you with real-time **Epoch 4 Halving projections**, **multi-ledger settlement pipelines**, **syndicate hash surge optimizations**, and **provably fair verification**.

How can I assist your node operations today?`,
      timestamp: "Just now",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    "Halving Projection (#1.5M)",
    "Task Cycle Optimization",
    "Multi-Ledger Settlement Audit",
    "Provably Fair Verification",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();

      const advisorMsg: ChatMessage = {
        id: `advisor-${Date.now()}`,
        role: "advisor",
        text: data.reply || "Protocol telemetry received. Consensus sync in progress.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, advisorMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `advisor-err-${Date.now()}`,
        role: "advisor",
        text: "**Telemetry Gateway Offline:** Local cache indicates Block #941,208 remains verified.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg h-[85vh] flex flex-col rounded-3xl bg-[#0f131c] border border-[#4cd7f6]/40 shadow-[0_0_50px_rgba(76,215,246,0.15)] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 bg-[#181c24] border-b border-[#3c4a42]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4cd7f6]/15 border border-[#4cd7f6]/40 text-[#4cd7f6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#dfe2ee] uppercase tracking-wider">
                  MSDQ Neural Advisor
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#4cd7f6]/10 text-[#4cd7f6] border border-[#4cd7f6]/30">
                  v4.2
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#bbcabf] flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                <span>Advisory Enclave (ReadOnly)</span>
                <span>•</span>
                <span className="text-[#ffb95f]">Quota: 48/50 left</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#262a33] text-[#bbcabf] hover:text-white hover:bg-[#31353e] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quick Prompts Carousel */}
        <div className="p-2.5 bg-[#12161f] border-b border-[#3c4a42]/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleSend(prompt)}
              className="py-1 px-3 rounded-xl bg-[#1c2028] border border-[#3c4a42]/60 font-mono text-[10px] text-[#bbcabf] hover:text-[#4cd7f6] hover:border-[#4cd7f6]/50 transition-colors whitespace-nowrap shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#4edea3] text-[#003824] font-medium rounded-br-none shadow-[0_0_15px_rgba(78,222,163,0.2)]"
                    : "bg-[#1c2028] border border-[#3c4a42]/60 text-[#dfe2ee] rounded-bl-none shadow-md"
                }`}
              >
                <div className="whitespace-pre-line font-sans">{msg.text}</div>
              </div>
              <span className="text-[9px] font-mono text-[#86948a] mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#1c2028] border border-[#4cd7f6]/40 text-[#4cd7f6] text-xs font-mono w-fit">
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              <span>Querying Neural Enclave...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#181c24] border-t border-[#3c4a42]/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask Neural Advisor about halving, yields, or nodes..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/60 font-sans text-xs text-[#dfe2ee] placeholder:text-[#86948a] focus:border-[#4cd7f6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2.5 rounded-xl bg-[#4cd7f6] text-[#003640] hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
          <div className="text-[9px] font-mono text-[#86948a] text-center mt-2">
            Automated protocol analytics. Read-only advisory telemetry.
          </div>
        </div>
      </div>
    </div>
  );
};
