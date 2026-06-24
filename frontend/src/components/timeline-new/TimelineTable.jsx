import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Pencil, Trash2, FolderOpen } from "lucide-react";
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

function GroupAggGantt({ projects }) {
  // Show aggregate mini gantt: for each stage, show the "most advanced" status across all children
  const stageCounts = STAGES.map((stage) => {
    let done = 0, active = 0;
    for (const p of projects) {
      const idx = STAGES.indexOf(stage);
      const curIdx = STAGES.indexOf(p._currentStage);
      if (idx < curIdx) done++;
      else if (stage === p._currentStage && p._currentStage !== "Not Started") active++;
    }
    return { done, active, total: projects.length };
  });
  return (
    <div className="flex items-center gap-0.5">
      {stageCounts.map((s, i) => {
        const ratio = s.total > 0 ? (s.done + s.active * 0.5) / s.total : 0;
        return (
          <div
            key={STAGES[i]}
            title={`${STAGES[i]}: ${s.done}/${s.total} done`}
            className="h-2 flex-1 rounded-sm"
            style={{
              background: ratio >= 1 ? STATUS_COLORS["Completed"]
                : ratio > 0 ? STATUS_COLORS["In Progress"]
                  : "var(--hairline)",
              opacity: ratio > 0 ? 0.6 + ratio * 0.4 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

function ProjectRow({ p, i, selectedId, compareIds, onToggleCompare, onSelect, indent = false }) {
  return (
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
      <td className="px-5 py-3 text-slate-400 tabular">{indent ? "" : i + 1}</td>
      <td className="px-5 py-3">
        <div className={indent ? "pl-6" : ""}>
          <div className="font-medium">{p._projectName}</div>
          <div className="text-[11px] text-slate-400 tabular">{p.po_number || p.id}</div>
        </div>
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
  );
}

export function TimelineTable({
  projects, onSelect, selectedId, compareIds, onToggleCompare,
  groups = [], ungrouped = [], onEditGroup, onDeleteGroup, canManageGroups = false
}) {
  const [sortKey, setSortKey] = useState("delay");
  const [dir, setDir] = useState("desc");
  const [collapsed, setCollapsed] = useState(new Set());

  const hasGroups = groups.length > 0;

  // Sort function
  const sortProjects = (list) => {
    const mult = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") return (a._projectName || "").localeCompare(b._projectName || "") * mult;
      if (sortKey === "plant") return (a.plant || "").localeCompare(b.plant || "") * mult;
      if (sortKey === "value") return ((a._orderValue || 0) - (b._orderValue || 0)) * mult;
      if (sortKey === "progress") return ((a._completion || 0) - (b._completion || 0)) * mult;
      if (sortKey === "delay") return ((a._delayDays || 0) - (b._delayDays || 0)) * mult;
      return 0;
    });
  };

  // If no groups, use legacy flat list
  const sorted = useMemo(() => sortProjects(hasGroups ? ungrouped : projects),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, ungrouped, sortKey, dir, hasGroups]);

  function toggleSort(key) {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setDir(key === "name" || key === "plant" ? "asc" : "desc"); }
  }

  const toggleCollapse = (groupId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

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
            {/* Grouped sections */}
            {groups.map((g) => {
              const isCollapsed = collapsed.has(g.id);
              const childProjects = sortProjects(g._projects || []);
              const avgCompletion = childProjects.length > 0
                ? Math.round(childProjects.reduce((s, p) => s + (p._completion || 0), 0) / childProjects.length)
                : 0;
              const totalValue = childProjects.reduce((s, p) => s + (p._orderValue || 0), 0);
              const maxDelay = Math.max(0, ...childProjects.map((p) => p._delayDays || 0));

              return (
                <GroupSection
                  key={g.id}
                  group={g}
                  childProjects={childProjects}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleCollapse(g.id)}
                  avgCompletion={avgCompletion}
                  totalValue={totalValue}
                  maxDelay={maxDelay}
                  selectedId={selectedId}
                  compareIds={compareIds}
                  onToggleCompare={onToggleCompare}
                  onSelect={onSelect}
                  canManageGroups={canManageGroups}
                  onEdit={() => onEditGroup?.(g)}
                  onDelete={() => onDeleteGroup?.(g.id)}
                />
              );
            })}

            {/* Ungrouped divider */}
            {hasGroups && sorted.length > 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span>Ungrouped Projects ({sorted.length})</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </td>
              </tr>
            )}

            {/* Ungrouped / all projects */}
            {sorted.length === 0 && groups.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                  No projects match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  p={p}
                  i={i}
                  selectedId={selectedId}
                  compareIds={compareIds}
                  onToggleCompare={onToggleCompare}
                  onSelect={onSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GroupSection({
  group, childProjects, isCollapsed, onToggleCollapse,
  avgCompletion, totalValue, maxDelay,
  selectedId, compareIds, onToggleCompare, onSelect,
  canManageGroups, onEdit, onDelete
}) {
  return (
    <>
      {/* Group header row */}
      <tr
        className="bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:from-slate-100 transition-colors"
        onClick={onToggleCollapse}
      >
        <td className="px-3 py-3">
          {isCollapsed
            ? <ChevronRight className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </td>
        <td className="px-5 py-3">
          <FolderOpen className="w-4 h-4" style={{ color: "var(--brand, #0d9668)" }} />
        </td>
        <td className="px-5 py-3" colSpan={2}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{group.name}</span>
            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {childProjects.length} project{childProjects.length !== 1 ? "s" : ""}
            </span>
            {group.description && (
              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">— {group.description}</span>
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-right tabular text-slate-500 text-xs font-medium">
          {formatINR(totalValue)}
        </td>
        <td className="px-5 py-3">
          <div className="w-40">
            <GroupAggGantt projects={childProjects} />
            <div className="mt-1 text-[10px] text-slate-400 text-right tabular">{avgCompletion}% avg</div>
          </div>
        </td>
        <td className="px-5 py-3 text-right tabular">
          {maxDelay > 0 ? (
            <span style={{ color: "var(--danger)" }}>+{maxDelay}d max</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>
        <td className="px-5 py-3" />
        <td className="px-5 py-3" />
        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
          {canManageGroups && (
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-slate-200 transition"
                title="Edit group"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <button
                onClick={onDelete}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-red-50 transition"
                title="Delete group"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Child project rows */}
      {!isCollapsed &&
        childProjects.map((p, i) => (
          <ProjectRow
            key={p.id}
            p={p}
            i={i}
            selectedId={selectedId}
            compareIds={compareIds}
            onToggleCompare={onToggleCompare}
            onSelect={onSelect}
            indent={true}
          />
        ))}
    </>
  );
}
