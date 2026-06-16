import { useState, useEffect, useMemo } from "react";
import { API } from "@/App";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Table2, GanttChartSquare, GitCompareArrows } from "lucide-react";

import { TimelineFiltersBar } from "@/components/timeline-new/TimelineFiltersBar";
import { TimelineKpiCards } from "@/components/timeline-new/TimelineKpiCards";
import { TimelineLegend } from "@/components/timeline-new/TimelineLegend";
import { TimelineTable } from "@/components/timeline-new/TimelineTable";
import { GanttChart } from "@/components/timeline-new/GanttChart";
import { ProjectDetailDrawer } from "@/components/timeline-new/ProjectDetailDrawer";
import { CompareDrawer } from "@/components/timeline-new/CompareDrawer";
import { STAGES, addDays } from "@/lib/capexHelpers";

const FY_RANGES = {
  "2024-25": { start: new Date(2024, 3, 1), end: new Date(2025, 2, 31, 23, 59, 59) },
  "2025-26": { start: new Date(2025, 3, 1), end: new Date(2026, 2, 31, 23, 59, 59) },
  "2026-27": { start: new Date(2026, 3, 1), end: new Date(2027, 2, 31, 23, 59, 59) },
};

// Stage check functions — same as the old implementation
const STAGE_CHECKS = [
  { key: "cea", label: "CEA", check: (r) => r.cea_status === "Approved" || r.cea_approved_date },
  { key: "pr", label: "PR", check: (r) => r.pr_approved_date || r.pr_approval_status === "Approved" },
  { key: "po", label: "PO", check: (r) => r.po_approved_date || r.po_approval_status === "Approved" || r.po_number },
  { key: "manufacturing", label: "Manufacturing", check: (r) => r.manufacturing_end_date },
  { key: "dispatch", label: "Dispatch", check: (r) => r.delivery_status === "Dispatched" || r.dispatch_date || r.delivery_status === "Delivered" || r.delivery_date },
  { key: "installation", label: "Installation", check: (r) => r.installation_date },
  { key: "commissioning", label: "Commissioning", check: (r) => r.commissioning_date || r.commissioning_status === "Completed" },
  { key: "closure", label: "Closure", check: (r) => r.closure_date || r.workflow_status === "Completed" },
];

const computeCompletion = (r) => {
  let done = 0;
  for (const s of STAGE_CHECKS) { if (s.check(r)) done += 1; }
  return Math.round((done / STAGE_CHECKS.length) * 100);
};

const getCurrentStage = (r) => {
  let last = "Not Started";
  for (const s of STAGE_CHECKS) {
    if (s.check(r)) last = s.label;
    else return last;
  }
  return last;
};

const computeRisk = (r) => {
  const now = new Date();
  if (r.workflow_status === "Completed" || r.closure_date || r.commissioning_status === "Completed") {
    if (r.planned_completion_date && (r.actual_completion_date || r.commissioning_date || r.closure_date)) {
      const actual = new Date(r.actual_completion_date || r.commissioning_date || r.closure_date);
      const planned = new Date(r.planned_completion_date);
      const days = Math.floor((actual - planned) / (1000 * 60 * 60 * 24));
      return { status: "Completed", delayDays: days > 0 ? days : 0 };
    }
    return { status: "Completed", delayDays: 0 };
  }
  const planned = r.planned_completion_date ? new Date(r.planned_completion_date)
    : r.expected_delivery_date ? new Date(r.expected_delivery_date) : null;
  if (planned) {
    if (now > planned) {
      const delayDays = Math.floor((now - planned) / (1000 * 60 * 60 * 24));
      return { status: "Delayed", delayDays };
    }
    const daysUntil = Math.floor((planned - now) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return { status: "At Risk", delayDays: 0 };
  }
  const hasAny = STAGE_CHECKS.some(s => s.check(r));
  if (!hasAny) return { status: "Not Started", delayDays: 0 };
  return { status: "In Progress", delayDays: 0 };
};

const getOrderValue = (r) => {
  if (r.suppliers?.length > 0) {
    const s = r.suppliers.find(s => s.is_ordered) || r.suppliers.find(s => s.selected) || r.suppliers[0];
    return parseFloat(s?.final_price || 0);
  }
  return parseFloat(r.final_negotiated_price || r.initial_price || 0);
};

const getSupplier = (r) =>
  r.suppliers?.find(s => s.is_ordered)?.name || r.suppliers?.[0]?.name || r.vendor_name || "—";

const getProjectName = (r) =>
  r.project_name || r.requirement_items?.[0]?.description || r.requirement_description || `Request ${r.id}`;

// Build Gantt step data from the real request dates
function buildSteps(r) {
  const createdDate = (r.created_at || "").split("T")[0] || new Date().toISOString().slice(0, 10);
  const dateFields = {
    CEA: { date: r.cea_approved_date, check: STAGE_CHECKS[0].check },
    PR: { date: r.pr_approved_date, check: STAGE_CHECKS[1].check },
    PO: { date: r.po_approved_date, check: STAGE_CHECKS[2].check },
    Manufacturing: { date: r.manufacturing_end_date, check: STAGE_CHECKS[3].check },
    Dispatch: { date: r.dispatch_date || r.delivery_date, check: STAGE_CHECKS[4].check },
    Installation: { date: r.installation_date, check: STAGE_CHECKS[5].check },
    Commissioning: { date: r.commissioning_date, check: STAGE_CHECKS[6].check },
    Closure: { date: r.closure_date || r.actual_completion_date, check: STAGE_CHECKS[7].check },
  };

  let cursor = createdDate;
  const currentStg = getCurrentStage(r);

  return STAGES.map((stage) => {
    const info = dateFields[stage];
    const isDone = info?.check?.(r);
    const stageIdx = STAGES.indexOf(stage);
    const currentIdx = STAGES.indexOf(currentStg);
    const stepStatus = isDone ? "done" : (stage === currentStg && currentStg !== "Not Started") ? "active" : "pending";

    const start = cursor;
    // If we have a real date, use it; otherwise estimate ~20 days per stage
    const actualDate = info?.date ? info.date.split("T")[0] : null;
    const end = actualDate || addDays(start, 15 + Math.floor(Math.random() * 15));
    cursor = end;

    return { stage, start, end, status: stepStatus, durationDays: Math.max(1, Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))) };
  });
}

export default function ProjectTimeline() {
  const [allRequests, setAllRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: "", plant: "all", status: "all", priority: "all",
  });
  const [fy, setFy] = useState("2025-26");

  // View mode & interactions
  const [viewMode, setViewMode] = useState("table");
  const [selected, setSelected] = useState(null);
  const [compareIds, setCompareIds] = useState(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  const onChange = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const resetFilters = () => setFilters({ search: "", plant: "all", status: "all", priority: "all" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/capex-requests`);
        setAllRequests(res.data);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const uniquePlants = useMemo(() => [...new Set(allRequests.map(r => r.plant).filter(Boolean))], [allRequests]);

  // Enrich with computed fields
  const enriched = useMemo(() => {
    return allRequests.map(r => {
      const risk = computeRisk(r);
      const steps = buildSteps(r);
      const startDate = steps[0]?.start || new Date().toISOString().slice(0, 10);
      const plannedEnd = steps[steps.length - 1]?.end || addDays(startDate, 200);

      return {
        ...r,
        _projectName: getProjectName(r),
        _supplier: getSupplier(r),
        _orderValue: getOrderValue(r),
        _completion: computeCompletion(r),
        _currentStage: getCurrentStage(r),
        _status: risk.status,
        _delayDays: risk.delayDays,
        _priority: r.priority_level || "Medium",
        _steps: steps,
        _startDate: startDate,
        _plannedEnd: plannedEnd,
      };
    });
  }, [allRequests]);

  // Apply filters
  const filtered = useMemo(() => {
    return enriched.filter(r => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!(r.po_number || "").toLowerCase().includes(q) &&
            !(r._projectName || "").toLowerCase().includes(q) &&
            !(r.id || "").toLowerCase().includes(q)) return false;
      }
      if (filters.plant !== "all" && r.plant !== filters.plant) return false;
      if (filters.status !== "all" && r._status !== filters.status) return false;
      if (filters.priority !== "all" && r._priority !== filters.priority) return false;
      if (fy !== "all") {
        const range = FY_RANGES[fy];
        if (range) {
          const d = new Date(r.created_at);
          if (d < range.start || d > range.end) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const order = { Delayed: 0, "At Risk": 1, "In Progress": 2, "On Track": 3, "Not Started": 4, Completed: 5 };
      const so = (order[a._status] ?? 9) - (order[b._status] ?? 9);
      if (so !== 0) return so;
      return b._orderValue - a._orderValue;
    });
  }, [enriched, filters, fy]);

  // KPI summary
  const kpis = useMemo(() => ({
    total: filtered.length,
    delayed: filtered.filter(r => r._status === "Delayed").length,
    atRisk: filtered.filter(r => r._status === "At Risk").length,
    inProgress: filtered.filter(r => r._status === "In Progress" || r._status === "On Track").length,
    completed: filtered.filter(r => r._status === "Completed").length,
  }), [filtered]);

  // Compare helpers
  const toggleCompare = (id) =>
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });

  const compareProjects = useMemo(
    () => enriched.filter((p) => compareIds.has(p.id)),
    [enriched, compareIds]
  );

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="project-timeline-loading">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-0" data-testid="project-timeline-page" style={{ margin: "-0.5rem -0.5rem 0 -0.5rem" }}>
      {/* Sticky Filters */}
      <TimelineFiltersBar
        filters={filters}
        onChange={onChange}
        onReset={resetFilters}
        uniquePlants={uniquePlants}
      />

      <div className="px-4 md:px-6 py-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Header + View Toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
              style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Project Timeline Tracker</h1>
              <p className="text-sm text-slate-500">Lifecycle view of the procurement & project pipeline</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={
                "h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-md transition " +
                (viewMode === "table"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700")
              }
            >
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("gantt")}
              className={
                "h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-md transition " +
                (viewMode === "gantt"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700")
              }
            >
              <GanttChartSquare className="w-3.5 h-3.5" /> Gantt
            </button>
          </div>
        </div>

        <TimelineLegend />
        <TimelineKpiCards kpis={kpis} />

        {/* Table or Gantt view */}
        {viewMode === "table" ? (
          <TimelineTable
            projects={filtered}
            onSelect={setSelected}
            selectedId={selected?.id}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
          />
        ) : (
          <GanttChart
            projects={filtered}
            onSelect={setSelected}
            selectedId={selected?.id}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
          />
        )}
      </div>

      {/* Project Detail Drawer */}
      <ProjectDetailDrawer project={selected} onClose={() => setSelected(null)} />

      {/* Compare Drawer */}
      {compareOpen && (
        <CompareDrawer
          projects={compareProjects}
          onClose={() => setCompareOpen(false)}
          onRemove={toggleCompare}
          onClear={() => { setCompareIds(new Set()); setCompareOpen(false); }}
        />
      )}

      {/* Floating compare bar */}
      {compareIds.size > 0 && !compareOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <div className="flex items-center gap-3 bg-white rounded-full border border-slate-200 shadow-2xl pl-5 pr-2 py-2">
            <span className="text-sm font-medium">{compareIds.size} selected</span>
            <button
              onClick={() => setCompareIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
            <button
              onClick={() => setCompareOpen(true)}
              disabled={compareIds.size < 2}
              className="h-9 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-full hover:opacity-90 disabled:opacity-50 transition active:scale-95"
              style={{ backgroundColor: "var(--brand)", color: "var(--brand-foreground)" }}
            >
              <GitCompareArrows className="w-4 h-4" />
              Compare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
