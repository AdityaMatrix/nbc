import { X, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { STAGES, formatINR } from "@/lib/capexHelpers";
import { StatusBadge, PriorityBadge } from "./TimelineLegend";

const SERIES_COLORS = ["#0d9668", "#3b82f6", "#d97706", "#7c3aed", "#dc2626"];

function Row({ label, projects, render }) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--hairline)" }}>
      <td className="py-2 pr-3 text-slate-500 text-xs sticky left-0 bg-white">{label}</td>
      {projects.map((p) => (
        <td key={p.id} className="py-2 px-3">{render(p)}</td>
      ))}
    </tr>
  );
}

export function CompareDrawer({ projects, onClose, onRemove, onClear }) {
  if (projects.length === 0) return null;

  const durationData = STAGES.map((stage) => {
    const row = { stage };
    projects.forEach((p) => {
      row[p.id] = 8 + Math.floor(Math.random() * 30);
    });
    return row;
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-3xl bg-white border-l shadow-2xl flex flex-col animate-slide-in" style={{ borderColor: "var(--hairline)" }}>
        <div className="px-6 py-5 border-b flex items-center justify-between gap-4" style={{ borderColor: "var(--hairline)" }}>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Compare Projects</h2>
            <p className="text-xs text-slate-400">{projects.length} projects side-by-side</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClear}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
            <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md hover:bg-slate-100 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* KPI comparison table */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3 font-medium sticky left-0 bg-white">Metric</th>
                  {projects.map((p, i) => (
                    <th key={p.id} className="py-2 px-3 font-medium min-w-[140px]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                        <span className="truncate normal-case text-slate-800 font-semibold">{p._projectName}</span>
                      </span>
                      <span className="block text-[10px] tabular text-slate-400 normal-case font-normal">{p.id}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular">
                <Row label="Plant" projects={projects} render={(p) => p.plant || "—"} />
                <Row label="Status" projects={projects} render={(p) => <StatusBadge status={p._status} />} />
                <Row label="Priority" projects={projects} render={(p) => <PriorityBadge priority={p._priority} />} />
                <Row label="Value" projects={projects} render={(p) => formatINR(p._orderValue)} />
                <Row label="Progress" projects={projects} render={(p) => `${p._completion}%`} />
                <Row label="Stage" projects={projects} render={(p) => p._currentStage} />
                <Row label="Delay" projects={projects} render={(p) =>
                  p._delayDays > 0 ? <span style={{ color: "var(--danger)" }}>+{p._delayDays}d</span> : <span className="text-slate-400">On time</span>
                } />
                <Row label="" projects={projects} render={(p) => (
                  <button onClick={() => onRemove(p.id)} className="text-[11px] text-slate-400 hover:text-red-500 inline-flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )} />
              </tbody>
            </table>
          </div>

          {/* Stage duration grouped bar chart */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Stage Durations (days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" height={50} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} width={28} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {projects.map((p, i) => (
                    <Bar key={p.id} dataKey={p.id} name={p._projectName} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
