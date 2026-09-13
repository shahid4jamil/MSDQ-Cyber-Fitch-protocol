import React, { useState } from "react";
import { TaskItem } from "../types";

interface TasksScreenProps {
  tasks: TaskItem[];
  onClaimTask: (taskId: string) => void;
  onCompleteTask?: (taskId: string) => void;
  protocolBalance: number;
  onNavigate: (screen: any) => void;
}

type TaskCategoryFilter =
  | "all"
  | "daily"
  | "hourly"
  | "weekly"
  | "monthly"
  | "special"
  | "social"
  | "referral";

export const TasksScreen: React.FC<TasksScreenProps> = ({
  tasks,
  onClaimTask,
  onCompleteTask,
  protocolBalance,
  onNavigate,
}) => {
  const [activeCategory, setActiveCategory] = useState<TaskCategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories: { id: TaskCategoryFilter; label: string; icon: string }[] = [
    { id: "all", label: "All Tasks", icon: "task_alt" },
    { id: "daily", label: "Daily", icon: "today" },
    { id: "hourly", label: "Hourly", icon: "schedule" },
    { id: "weekly", label: "Weekly", icon: "date_range" },
    { id: "monthly", label: "Monthly", icon: "calendar_month" },
    { id: "special", label: "Special", icon: "stars" },
    { id: "social", label: "Social", icon: "share" },
    { id: "referral", label: "Syndicate", icon: "groups" },
  ];

  // Use state tasks directly, deduplicated by ID
  const uniqueTasks: TaskItem[] = Array.from(
    new Map<string, TaskItem>(tasks.map((t) => [t.id, t])).values()
  );

  const filteredTasks = uniqueTasks.filter((t) => {
    const matchesCat = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalCompleted = uniqueTasks.filter((t) => t.completed).length;
  const totalClaimable = uniqueTasks.filter((t) => t.completed && !t.claimed).length;
  const totalEarnedRewards = uniqueTasks
    .filter((t) => t.claimed)
    .reduce((acc, curr) => acc + curr.reward, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 pb-24 space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#131823] via-[#1a2232] to-[#131823] border border-[#2a3447] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f59e0b]/20 to-[#10b981]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
            <span className="material-symbols-outlined text-[28px]">assignment_turned_in</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#10b981] uppercase">
                Consensus Bounty Protocol
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
              Tasks & Bounties
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Complete daily, weekly, and protocol tasks to earn direct MSDQ emissions and PTS vault points.
            </p>
          </div>
        </div>

        {/* Overview Stats Capsule */}
        <div className="flex items-center gap-2.5 bg-[#0a0e17] border border-[#2a3447] rounded-2xl p-2.5 sm:p-3 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="text-center px-2">
            <span className="text-[9px] font-mono uppercase text-[#94a3b8] block">Claimable</span>
            <span className="text-base font-mono font-bold text-[#f59e0b]">
              {totalClaimable}
            </span>
          </div>
          <div className="h-7 w-[1px] bg-[#2a3447]" />
          <div className="text-center px-2">
            <span className="text-[9px] font-mono uppercase text-[#94a3b8] block">Completed</span>
            <span className="text-base font-mono font-bold text-[#10b981]">
              {totalCompleted}/{uniqueTasks.length}
            </span>
          </div>
          <div className="h-7 w-[1px] bg-[#2a3447]" />
          <div className="text-center px-2">
            <span className="text-[9px] font-mono uppercase text-[#94a3b8] block">Yield Won</span>
            <span className="text-base font-mono font-bold text-[#38bdf8]">
              +{totalEarnedRewards.toFixed(0)} MSDQ
            </span>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Horizontal Category Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`py-2 px-3.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-[#10b981] text-[#003824] shadow-md shadow-[#10b981]/20 font-black"
                  : "bg-[#131823] text-[#94a3b8] hover:text-white hover:bg-[#1e2738] border border-[#2a3447]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94a3b8] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131823] border border-[#2a3447] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-[#64748b] focus:outline-none focus:border-[#10b981]"
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-3xl bg-[#131823] border border-[#2a3447] text-[#94a3b8] font-mono text-xs space-y-2">
            <span className="material-symbols-outlined text-[36px] text-[#64748b] block mx-auto">
              task
            </span>
            <span>No tasks found matching current filters.</span>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isReadyToClaim = task.completed && !task.claimed;
            const progressPercent = Math.min(100, (task.progress / task.total) * 100);

            return (
              <div
                key={task.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-3 ${
                  task.claimed
                    ? "bg-[#0d121c] border-[#2a3447]/40 opacity-70"
                    : isReadyToClaim
                    ? "bg-[#131823] border-[#f59e0b]/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    : "bg-[#131823] border-[#2a3447] hover:border-[#38bdf8]/40 shadow-lg"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-[#1e2738] text-[#38bdf8] border border-[#2a3447]">
                            {task.badge}
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase text-[#94a3b8]">
                          {task.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-[#94a3b8] mt-0.5">{task.description}</p>
                      )}
                    </div>

                    {/* Reward Pill */}
                    <div className="shrink-0 px-2.5 py-1 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-right">
                      <span className="text-xs font-mono font-bold text-[#10b981] block">
                        +{task.reward} {task.rewardType || "MSDQ"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#94a3b8]">
                      <span>Progress</span>
                      <span>
                        {task.progress}/{task.total} ({progressPercent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0a0e17] border border-[#2a3447] overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          task.completed
                            ? "bg-[#10b981]"
                            : "bg-gradient-to-r from-[#38bdf8] to-[#10b981]"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Claim / Status Button */}
                <div className="pt-2 border-t border-[#2a3447]/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#64748b]">
                    {task.claimed
                      ? "✓ Reward Claimed"
                      : isReadyToClaim
                      ? "⚡ Ready to Disburse"
                      : "• In Progress"}
                  </span>

                  {task.claimed ? (
                    <span className="px-3 py-1 rounded-xl bg-[#1e2738] text-[10px] font-mono text-[#94a3b8] border border-[#2a3447]">
                      Claimed
                    </span>
                  ) : isReadyToClaim ? (
                    <button
                      onClick={() => onClaimTask(task.id)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:brightness-110 text-[#0f172a] font-mono text-xs font-black transition-all shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Claim Reward</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onCompleteTask ? onCompleteTask(task.id) : null}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1e2738] hover:bg-[#2a3447] text-[#38bdf8] font-mono text-xs font-bold transition-all border border-[#38bdf8]/40 hover:border-[#38bdf8] flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                      <span>Start Task</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
