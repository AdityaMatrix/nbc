import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, ChevronRight, ChevronDown, FolderOpen } from "lucide-react";
import { STAGES, STAGE_COLORS, daysBetween, projectsDateRange, monthTicks } from "@/lib/capexHelpers";

const ZOOM_LEVELS = [1.2, 2, 3.2, 5, 8];
const ROW_H = 40;
const LABEL_W = 220;

function GanttRow({ p, range, pxPerDay, ticks, trackWidth, onSelect, selectedId, compareIds, onToggleCompare, indent = false }) {
  const isSel = selectedId === p.id;
  return (
    <div className={"flex items-stretch transition-colors " + (isSel ? "bg-emerald-50/60" : "hover:bg-slate-50/50")}>
      <div className="shrink-0 flex items-center gap-2 px-3 border-r" style={{ width: LABEL_W, borderColor: "var(--hairline)" }}>
        <input type="checkbox" checked={compareIds.has(p.id)} onChange={() => onToggleCompare(p.id)}
          className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer shrink-0" title="Add to compare" />
        <button onClick={() => onSelect(p)} className={`min-w-0 text-left py-2 ${indent ? "pl-5" : ""}`}>
          <div className="text-xs font-medium truncate">{p._projectName}</div>
          <div className="text-[10px] text-slate-400 tabular truncate">{p.plant} · {p._completion}%</div>
        </button>
      </div>
      <div className="relative cursor-pointer" style={{ width: trackWidth, height: ROW_H }} onClick={() => onSelect(p)}>
        {ticks.map((t) => (
          <div key={t.iso} className="absolute top-0 h-full border-l" style={{ left: t.offsetDays * pxPerDay, borderColor: "rgba(0,0,0,0.03)" }} />
        ))}
        {p._steps?.map((s) => {
          const left = daysBetween(range.start, s.start) * pxPerDay;
          const w = Math.max(3, daysBetween(s.start, s.end) * pxPerDay);
          return (
            <div key={s.stage} title={`${s.stage}: ${s.start} → ${s.end}`}
              className="absolute top-1/2 -translate-y-1/2 h-4 rounded-[3px] flex items-center px-1 overflow-hidden"
              style={{
                left, width: w,
                background: STAGE_COLORS[s.stage] || "#94a3b8",
                opacity: s.status === "pending" ? 0.35 : 1,
                outline: s.status === "active" ? "1.5px solid #1e293b" : "none",
              }}>
              {w > 46 && <span className="text-[9px] font-medium text-white truncate leading-none">{s.stage}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupHeaderRow({ group, childProjects, isCollapsed, onToggle, range, pxPerDay, ticks, trackWidth }) {
  // Compute a span bar covering all children's date range
  let minStart = null, maxEnd = null;
  for (const p of childProjects) {
    if (!minStart || p._startDate < minStart) minStart = p._startDate;
    if (!maxEnd || p._plannedEnd > maxEnd) maxEnd = p._plannedEnd;
  }

  return (
    <div
      className="flex items-stretch bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <div className="shrink-0 flex items-center gap-2 px-3 border-r" style={{ width: LABEL_W, borderColor: "var(--hairline)" }}>
        {isCollapsed
          ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        }
        <FolderOpen className="w-4 h-4 shrink-0" style={{ color: "var(--brand, #0d9668)" }} />
        <div className="min-w-0 py-2">
          <div className="text-xs font-semibold truncate">{group.name}</div>
          <div className="text-[10px] text-slate-400 tabular">{childProjects.length} project{childProjects.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="relative" style={{ width: trackWidth, height: ROW_H }}>
        {ticks.map((t) => (
          <div key={t.iso} className="absolute top-0 h-full border-l" style={{ left: t.offsetDays * pxPerDay, borderColor: "rgba(0,0,0,0.03)" }} />
        ))}
        {/* Aggregate span bar */}
        {minStart && maxEnd && (() => {
          const left = Math.max(0, daysBetween(range.start, minStart) * pxPerDay);
          const w = Math.max(6, daysBetween(minStart, maxEnd) * pxPerDay);
          return (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md"
              style={{
                left, width: w,
                background: "linear-gradient(135deg, var(--brand, #0d9668), #3b82f6)",
                opacity: 0.2,
              }}
            />
          );
        })()}
      </div>
    </div>
  );
}

export function GanttChart({
  projects, onSelect, selectedId, compareIds, onToggleCompare,
  groups = [], ungrouped = []
}) {
  const [zoom, setZoom] = useState(2);
  const [collapsed, setCollapsed] = useState(new Set());
  const pxPerDay = ZOOM_LEVELS[zoom];

  const hasGroups = groups.length > 0;
  const allProjects = hasGroups
    ? [...groups.flatMap(g => g._projects || []), ...ungrouped]
    : projects;

  const range = useMemo(() => projectsDateRange(allProjects), [allProjects]);
  const ticks = useMemo(() => monthTicks(range), [range]);
  const trackWidth = range.totalDays * pxPerDay;

  const toggleCollapse = (groupId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const displayProjects = hasGroups ? ungrouped : projects;

  return (
    <section className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--hairline)" }}>
        <div>
          <h3 className="text-sm font-semibold">Gantt — Stage Date Ranges</h3>
          <p className="text-xs text-slate-500">
            {range.start} → {range.end} · {allProjects.length} projects · drag to scroll
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 rounded-md border border-slate-200 p-0.5">
          <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0}
            className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 disabled:opacity-40 transition" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(1)} className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 transition" title="Fit">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))} disabled={zoom === ZOOM_LEVELS.length - 1}
            className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 disabled:opacity-40 transition" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {allProjects.length === 0 ? (
        <div className="px-5 py-12 text-center text-slate-400 text-sm">No projects match the current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ width: LABEL_W + trackWidth, minWidth: "100%" }}>
            {/* Axis header */}
            <div className="flex sticky top-0 z-10 bg-slate-50/80 border-b" style={{ borderColor: "var(--hairline)" }}>
              <div className="shrink-0 px-4 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider" style={{ width: LABEL_W }}>
                Project
              </div>
              <div className="relative" style={{ width: trackWidth, height: 32 }}>
                {ticks.map((t) => (
                  <div key={t.iso} className="absolute top-0 h-full border-l" style={{ left: t.offsetDays * pxPerDay, borderColor: "var(--hairline)" }}>
                    <span className="pl-1.5 text-[10px] text-slate-400 tabular whitespace-nowrap">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: "var(--hairline)" }}>
              {/* Grouped sections */}
              {groups.map((g) => {
                const isCollapsedGroup = collapsed.has(g.id);
                const childProjects = g._projects || [];
                return (
                  <div key={g.id}>
                    <GroupHeaderRow
                      group={g}
                      childProjects={childProjects}
                      isCollapsed={isCollapsedGroup}
                      onToggle={() => toggleCollapse(g.id)}
                      range={range}
                      pxPerDay={pxPerDay}
                      ticks={ticks}
                      trackWidth={trackWidth}
                    />
                    {!isCollapsedGroup && childProjects.map((p) => (
                      <GanttRow
                        key={p.id}
                        p={p}
                        range={range}
                        pxPerDay={pxPerDay}
                        ticks={ticks}
                        trackWidth={trackWidth}
                        onSelect={onSelect}
                        selectedId={selectedId}
                        compareIds={compareIds}
                        onToggleCompare={onToggleCompare}
                        indent={true}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Ungrouped divider */}
              {hasGroups && displayProjects.length > 0 && (
                <div className="flex items-center px-5 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider w-full">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span>Ungrouped ({displayProjects.length})</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                </div>
              )}

              {/* Ungrouped / all projects */}
              {displayProjects.map((p) => (
                <GanttRow
                  key={p.id}
                  p={p}
                  range={range}
                  pxPerDay={pxPerDay}
                  ticks={ticks}
                  trackWidth={trackWidth}
                  onSelect={onSelect}
                  selectedId={selectedId}
                  compareIds={compareIds}
                  onToggleCompare={onToggleCompare}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stage legend */}
      <div className="px-5 py-3 border-t flex flex-wrap items-center gap-x-4 gap-y-2" style={{ borderColor: "var(--hairline)" }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stages</span>
        {STAGES.map((st) => (
          <span key={st} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: STAGE_COLORS[st] }} />
            {st}
          </span>
        ))}
      </div>
    </section>
  );
}
