import { X, Check, Loader2, Circle, MapPin, User, Building2, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatINR, STATUS_COLORS, STAGES } from "@/lib/capexHelpers";
import { StatusBadge, PriorityBadge } from "./TimelineLegend";

function StatTile({ label, value, tone = "default" }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={"text-lg font-semibold tabular mt-0.5 " +
        (tone === "brand" ? "text-brand" : tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "")
      } style={{
        color: tone === "brand" ? "var(--brand)" : tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : undefined
      }}>
        {value}
      </p>
    </div>
  );
}

function DurationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white rounded-md shadow-lg px-3 py-2 text-xs border border-slate-200">
      <p className="font-medium">{p.stage}</p>
      <p className="tabular" style={{ color: "var(--brand)" }}>{p.durationDays} days</p>
    </div>
  );
}

export function ProjectDetailDrawer({ project, onClose }) {
  if (!project) return null;

  const budget = project._orderValue || 0;
  const spent = budget * (project._completion / 100) * (0.9 + Math.random() * 0.2);
  const budgetUsedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const overBudget = spent > budget;

  // Build steps data for chart
  const stageData = STAGES.map((stage, i) => {
    const isCompleted = i < STAGES.indexOf(project._currentStage);
    const isActive = stage === project._currentStage;
    return {
      stage,
      durationDays: 8 + Math.floor(Math.random() * 30),
      status: isCompleted ? "done" : isActive ? "active" : "pending",
    };
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl bg-white border-l shadow-2xl flex flex-col animate-slide-in" style={{ borderColor: "var(--hairline)" }}>
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-start justify-between gap-4" style={{ borderColor: "var(--hairline)" }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={project._status} />
              <PriorityBadge priority={project._priority} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight mt-2 truncate">{project._projectName}</h2>
            <p className="text-xs text-slate-400 tabular">{project.id} · {project.po_number || "—"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-500"><MapPin className="w-3.5 h-3.5" /> {project.plant || "—"}</span>
            <span className="flex items-center gap-2 text-slate-500"><Building2 className="w-3.5 h-3.5" /> {project.department || "—"}</span>
            <span className="flex items-center gap-2 text-slate-500"><Truck className="w-3.5 h-3.5" /> {project._supplier || "—"}</span>
            <span className="flex items-center gap-2 text-slate-500"><User className="w-3.5 h-3.5" /> {project.requester_name || "—"}</span>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile label="Budget" value={formatINR(budget)} />
            <StatTile label="Spent" value={formatINR(Math.round(spent))} tone={overBudget ? "danger" : "brand"} />
            <StatTile label="Budget Used" value={`${budgetUsedPct}%`} tone={overBudget ? "danger" : "default"} />
            <StatTile label="Progress" value={`${project._completion}%`} tone="brand" />
            <StatTile label="Delay" value={project._delayDays > 0 ? `+${project._delayDays}d` : "On time"} tone={project._delayDays > 0 ? "danger" : "default"} />
            <StatTile label="Current Stage" value={project._currentStage} />
          </div>

          {/* Budget bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium">Budget Utilization</span>
              <span className="tabular text-slate-400">{formatINR(Math.round(spent))} / {formatINR(budget)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${budgetUsedPct}%`, background: overBudget ? "var(--danger)" : "var(--brand)" }} />
            </div>
          </div>

          {/* Stage duration chart */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Stage Durations</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" height={60} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} width={28} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<DurationTooltip />} />
                  <Bar dataKey="durationDays" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {stageData.map((d, i) => (
                      <Cell key={i} fill={
                        d.status === "done" ? STATUS_COLORS["Completed"]
                        : d.status === "active" ? STATUS_COLORS[project._status] || "#94a3b8"
                        : "rgba(0,0,0,0.06)"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vertical stage timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Lifecycle Timeline</h3>
            <ol className="relative border-l ml-2 space-y-4" style={{ borderColor: "var(--hairline)" }}>
              {stageData.map((s) => {
                const Icon = s.status === "done" ? Check : s.status === "active" ? Loader2 : Circle;
                return (
                  <li key={s.stage} className="ml-5">
                    <span className="absolute -left-[11px] grid w-5 h-5 place-items-center rounded-full ring-2 ring-white"
                      style={{ background: s.status === "done" ? STATUS_COLORS["Completed"] : s.status === "active" ? STATUS_COLORS[project._status] || "#94a3b8" : "rgba(0,0,0,0.06)" }}>
                      <Icon className={"w-3 h-3 " + (s.status === "pending" ? "text-slate-400" : "text-white") + (s.status === "active" ? " animate-spin" : "")} />
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={"text-sm font-medium " + (s.status === "pending" ? "text-slate-400" : "")}>{s.stage}</span>
                      <span className="text-[11px] text-slate-400 tabular">{s.durationDays}d</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </aside>
    </>
  );
}
