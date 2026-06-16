import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { formatINR, STATUS_COLORS, STAGES } from "@/lib/capexHelpers";
import { StatusBadge, PriorityBadge } from "./TimelineLegend";

const COLUMNS = [
  { key: "name", label: "Project", align: "left" },
  { key: "plant", label: "Plant", align: "left" },
  { key: "value", label: "Value", align: "right" },
  { key: "progress", label: "Progress", align: "left" },
  { key: "delay", label: "Delay", align: "right" },
];

function MiniGantt({ project }) {
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((stage, i) => {
        const done = i < STAGES.indexOf(project._currentStage);
        const active = stage === project._currentStage;
        return (
          <div
            key={stage}
            title={`${stage} · ${done ? "done" : active ? "active" : "pending"}`}
            className="h-2 flex-1 rounded-sm"
            style={{
              background: done
                ? STATUS_COLORS["Completed"]
                : active
                  ? STATUS_COLORS[project._status] || "#94a3b8"
                  : "var(--hairline)",
            }}
          />
        );
      })}
    </div>
  );
}

export function TimelineTable({ projects, onSelect, selectedId, compareIds, onToggleCompare }) {
  const [sortKey, setSortKey] = useState("delay");
  const [dir, setDir] = useState("desc");

  const sorted = useMemo(() => {
    const mult = dir === "asc" ? 1 : -1;
    return [...projects].sort((a, b) => {
      if (sortKey === "name") return (a._projectName || "").localeCompare(b._projectName || "") * mult;
      if (sortKey === "plant") return (a.plant || "").localeCompare(b.plant || "") * mult;
      if (sortKey === "value") return ((a._orderValue || 0) - (b._orderValue || 0)) * mult;
      if (sortKey === "progress") return ((a._completion || 0) - (b._completion || 0)) * mult;
      if (sortKey === "delay") return ((a._delayDays || 0) - (b._delayDays || 0)) * mult;
      return 0;
    });
  }, [projects, sortKey, dir]);

  function toggleSort(key) {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir(key === "name" || key === "plant" ? "asc" : "desc"); }
  }

  return (
    <section className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--hairline)" }}>
        <div>
          <h3 className="text-sm font-semibold">Project Lifecycle</h3>
          <p className="text-xs text-slate-500">
            Click a project for personalized analytics · {STAGES.join(" → ")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[820px]">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              <th className="px-3 py-3 w-8" />
              <th className="px-5 py-3 w-10">#</th>
              {COLUMNS.map((c) => {
                const isActive = c.key === sortKey;
                const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={c.key} className={"px-5 py-3 " + (c.align === "right" ? "text-right" : "text-left")}>
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={
                        "inline-flex items-center gap-1 hover:text-slate-700 transition-colors " +
                        (isActive ? "text-slate-700 " : "") +
                        (c.align === "right" ? "flex-row-reverse" : "")
                      }
                    >
                      {c.label}
                      <Icon className="w-3 h-3" />
                    </button>
                  </th>
                );
              })}
              <th className="px-5 py-3">Priority</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y text-sm" style={{ borderColor: "var(--hairline)" }}>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                  No projects match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className={
                    "cursor-pointer transition-colors " +
                    (selectedId === p.id ? "bg-emerald-50/60" : "hover:bg-slate-50/50")
                  }
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={compareIds.has(p.id)}
                      onChange={() => onToggleCompare(p.id)}
                      className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                      title="Add to compare"
                    />
                  </td>
                  <td className="px-5 py-3 text-slate-400 tabular">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{p._projectName}</div>
                    <div className="text-[11px] text-slate-400 tabular">{p.po_number || p.id}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{p.plant || "—"}</td>
                  <td className="px-5 py-3 text-right tabular">{formatINR(p._orderValue)}</td>
                  <td className="px-5 py-3">
                    <div className="w-40">
                      <MiniGantt project={p} />
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{p._currentStage}</span>
                        <span className="tabular">{p._completion}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular">
                    {p._delayDays > 0 ? (
                      <span style={{ color: "var(--danger)" }}>+{p._delayDays}d</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3"><PriorityBadge priority={p._priority} /></td>
                  <td className="px-5 py-3"><StatusBadge status={p._status} /></td>
                  <td className="px-5 py-3 text-slate-400"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
