// Project Gantt: render a single project row's stage bars proportionally between viewStart and viewEnd
// Stages: CEA → PR → PO → Manufacturing → Dispatch → Installation → Commissioning → Closure

const STAGE_COLORS = {
  cea: "#6366F1",          // indigo
  pr: "#3B82F6",           // blue
  po: "#8B5CF6",           // violet
  manufacturing: "#06B6D4",// cyan
  dispatch: "#F97316",     // orange
  installation: "#EC4899", // pink
  commissioning: "#10B981",// emerald
  closure: "#22C55E",      // green
};

const safeDate = (v) => v ? new Date(v) : null;

// Compute X position (0–100) given a date in [viewStart, viewEnd]
const toPct = (date, viewStart, viewEnd) => {
  if (!date) return null;
  const t = new Date(date).getTime();
  const s = viewStart.getTime();
  const e = viewEnd.getTime();
  if (e <= s) return null;
  return ((t - s) / (e - s)) * 100;
};

// Build a stage segment [startDate, endDate] using fallbacks for end-date
const stageSeg = (start, end) => {
  if (!start) return null;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date(); // ongoing = up to today
  if (e < s) return null;
  return { start: s, end: e };
};

const renderBar = (seg, viewStart, viewEnd, color, label, info, todayPct) => {
  if (!seg) return null;
  const x1 = toPct(seg.start, viewStart, viewEnd);
  const x2 = toPct(seg.end, viewStart, viewEnd);
  if (x1 === null || x2 === null) return null;
  if (x2 < 0 || x1 > 100) return null;
  const left = Math.max(0, x1);
  const width = Math.max(0.5, Math.min(100, x2) - left);
  return (
    <div
      key={label}
      className="absolute h-3 rounded-sm shadow-sm cursor-help transition-all hover:h-3.5 hover:z-10"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        top: "50%",
        transform: "translateY(-50%)",
        background: color,
      }}
      title={`${label}: ${info}`}
      data-testid={`stage-${label.toLowerCase()}`}
    >
      <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold opacity-0 hover:opacity-100 transition-opacity px-0.5 truncate">
        {label}
      </span>
    </div>
  );
};

export const TimelineGanttRow = ({ project, viewStart, viewEnd }) => {
  const r = project;

  // Stage segments with intelligent fallbacks
  const cea = stageSeg(r.cea_created_date, r.cea_approved_date);
  const pr = stageSeg(r.pr_created_date, r.pr_approved_date);
  const po = stageSeg(r.po_created_date, r.po_approved_date);
  const manufacturing = stageSeg(
    r.manufacturing_start_date || r.po_approved_date,
    r.manufacturing_end_date || r.dispatch_date || r.delivery_date
  );
  const dispatch = stageSeg(r.dispatch_date || r.ordered_date, r.delivery_date);
  const installation = stageSeg(r.delivery_date, r.installation_date);
  const commissioning = stageSeg(r.installation_date, r.commissioning_date);
  const closure = stageSeg(r.commissioning_date, r.closure_date || r.actual_completion_date);

  // Format dates for tooltip
  const fmt = (d) => d ? d.toISOString().split("T")[0] : "-";
  const tip = (seg) => seg ? `${fmt(seg.start)} → ${fmt(seg.end)}` : "Not started";

  const now = new Date();
  const todayPct = toPct(now, viewStart, viewEnd);

  // Planned vs actual completion line (target)
  const plannedEnd = safeDate(r.planned_completion_date);
  const plannedEndPct = plannedEnd ? toPct(plannedEnd, viewStart, viewEnd) : null;
  const plannedStart = safeDate(r.planned_start_date || r.created_at);
  const plannedStartPct = plannedStart ? toPct(plannedStart, viewStart, viewEnd) : null;

  return (
    <div className="relative h-7 bg-slate-50/40 rounded border border-slate-100 overflow-hidden">
      {/* Planned range bracket (light grey) */}
      {plannedStartPct !== null && plannedEndPct !== null && plannedEndPct > 0 && plannedStartPct < 100 && (
        <div
          className="absolute top-0 bottom-0 border-y-2 border-dashed border-slate-300/70"
          style={{
            left: `${Math.max(0, plannedStartPct)}%`,
            width: `${Math.min(100, plannedEndPct) - Math.max(0, plannedStartPct)}%`,
            background: "rgba(148, 163, 184, 0.08)",
          }}
          title={`Planned: ${fmt(plannedStart)} → ${fmt(plannedEnd)}`}
        />
      )}

      {/* Today marker */}
      {todayPct !== null && todayPct >= 0 && todayPct <= 100 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-red-400 z-20"
          style={{ left: `${todayPct}%` }}
          title={`Today: ${fmt(now)}`}
        />
      )}

      {/* Stage bars */}
      {renderBar(cea, viewStart, viewEnd, STAGE_COLORS.cea, "CEA", tip(cea))}
      {renderBar(pr, viewStart, viewEnd, STAGE_COLORS.pr, "PR", tip(pr))}
      {renderBar(po, viewStart, viewEnd, STAGE_COLORS.po, "PO", tip(po))}
      {renderBar(manufacturing, viewStart, viewEnd, STAGE_COLORS.manufacturing, "MFG", tip(manufacturing))}
      {renderBar(dispatch, viewStart, viewEnd, STAGE_COLORS.dispatch, "DISP", tip(dispatch))}
      {renderBar(installation, viewStart, viewEnd, STAGE_COLORS.installation, "INST", tip(installation))}
      {renderBar(commissioning, viewStart, viewEnd, STAGE_COLORS.commissioning, "COMM", tip(commissioning))}
      {renderBar(closure, viewStart, viewEnd, STAGE_COLORS.closure, "CLS", tip(closure))}
    </div>
  );
};

export const TimelineHeader = ({ viewStart, viewEnd, view }) => {
  // Generate tick labels based on view
  const ticks = [];
  const totalMs = viewEnd.getTime() - viewStart.getTime();
  if (totalMs <= 0) return null;

  if (view === "weekly") {
    // weekly ticks
    let d = new Date(viewStart);
    d.setHours(0, 0, 0, 0);
    while (d <= viewEnd) {
      ticks.push({ date: new Date(d), label: `${d.getMonth() + 1}/${d.getDate()}` });
      d.setDate(d.getDate() + 7);
    }
  } else if (view === "monthly") {
    let d = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
    while (d <= viewEnd) {
      ticks.push({ date: new Date(d), label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
      d.setMonth(d.getMonth() + 1);
    }
  } else if (view === "quarterly") {
    let d = new Date(viewStart.getFullYear(), Math.floor(viewStart.getMonth() / 3) * 3, 1);
    while (d <= viewEnd) {
      const q = Math.floor(d.getMonth() / 3) + 1;
      ticks.push({ date: new Date(d), label: `Q${q} '${String(d.getFullYear()).slice(2)}` });
      d.setMonth(d.getMonth() + 3);
    }
  } else {
    let d = new Date(viewStart.getFullYear(), 0, 1);
    while (d <= viewEnd) {
      ticks.push({ date: new Date(d), label: `${d.getFullYear()}` });
      d.setFullYear(d.getFullYear() + 1);
    }
  }

  return (
    <div className="relative h-6 border-b border-slate-200 bg-slate-50/60">
      {ticks.map((t, i) => {
        const left = ((t.date.getTime() - viewStart.getTime()) / totalMs) * 100;
        if (left < 0 || left > 100) return null;
        return (
          <div key={i} className="absolute top-0 bottom-0 border-l border-slate-200/80 flex items-center" style={{ left: `${left}%` }}>
            <span className="text-[9px] text-slate-500 ml-1 font-medium whitespace-nowrap">{t.label}</span>
          </div>
        );
      })}
    </div>
  );
};
