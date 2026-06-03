import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/App";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowRight, AlertTriangle, CheckCircle, Flame, Activity, Clock } from "lucide-react";

import { TimelineFilters } from "@/components/timeline/TimelineFilters";
import { TimelineGanttRow, TimelineHeader } from "@/components/timeline/TimelineGantt";

const FY_RANGES = {
  "2024-25": { start: new Date(2024, 3, 1), end: new Date(2025, 2, 31, 23, 59, 59) },
  "2025-26": { start: new Date(2025, 3, 1), end: new Date(2026, 2, 31, 23, 59, 59) },
  "2026-27": { start: new Date(2026, 3, 1), end: new Date(2027, 2, 31, 23, 59, 59) },
};

const PRIORITY_STYLE = {
  Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "text-red-500" },
  High: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: "text-orange-500" },
  Medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "text-amber-500" },
  Low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500" },
};

const STATUS_STYLE = {
  Completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "On Track": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "In Progress": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "At Risk": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Delayed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  "Not Started": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

// Compute current stage of project (CEA→PR→PO→MFG→Dispatch→Installation→Commissioning→Closure)
const STAGES = [
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
  for (const s of STAGES) { if (s.check(r)) done += 1; }
  return Math.round((done / STAGES.length) * 100);
};

const currentStage = (r) => {
  let last = "Not Started";
  for (const s of STAGES) {
    if (s.check(r)) last = s.label;
    else return last;
  }
  return last;
};

// Risk + delay computation using planned vs actual
const computeRisk = (r) => {
  const now = new Date();
  // Already completed
  if (r.workflow_status === "Completed" || r.closure_date || r.commissioning_status === "Completed") {
    if (r.planned_completion_date && (r.actual_completion_date || r.commissioning_date || r.closure_date)) {
      const actual = new Date(r.actual_completion_date || r.commissioning_date || r.closure_date);
      const planned = new Date(r.planned_completion_date);
      const days = Math.floor((actual - planned) / (1000 * 60 * 60 * 24));
      return { status: "Completed", delayDays: days > 0 ? days : 0 };
    }
    return { status: "Completed", delayDays: 0 };
  }

  // Use expected_delivery_date / planned_completion_date for delay detection
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

  // Not started or in progress?
  const hasAny = STAGES.some(s => s.check(r));
  if (!hasAny) return { status: "Not Started", delayDays: 0 };
  return { status: "In Progress", delayDays: 0 };
};

const formatCurrency = (v) => {
  if (!v) return "\u20B90";
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(0)} K`;
  return `\u20B9${v}`;
};

const getOrderValue = (r) => {
  if (r.suppliers?.length > 0) {
    const s = r.suppliers.find(s => s.is_ordered) || r.suppliers.find(s => s.selected) || r.suppliers[0];
    return parseFloat(s?.final_price || 0);
  }
  return parseFloat(r.final_negotiated_price || r.initial_price || 0);
};

const getSupplier = (r) =>
  r.suppliers?.find(s => s.is_ordered)?.name || r.suppliers?.[0]?.name || r.vendor_name || "-";

const getProjectName = (r) =>
  r.project_name || r.requirement_items?.[0]?.description || r.requirement_description || `Request ${r.id}`;

export default function ProjectTimeline() {
  const navigate = useNavigate();
  const [allRequests, setAllRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [view, setView] = useState("monthly");
  const [plant, setPlant] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [fy, setFy] = useState("2025-26");

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

  // Enrich requests with computed fields
  const enriched = useMemo(() => {
    return allRequests.map(r => {
      const risk = computeRisk(r);
      return {
        ...r,
        _projectName: getProjectName(r),
        _supplier: getSupplier(r),
        _orderValue: getOrderValue(r),
        _completion: computeCompletion(r),
        _currentStage: currentStage(r),
        _status: risk.status,
        _delayDays: risk.delayDays,
        _priority: r.priority_level || "Medium",
      };
    });
  }, [allRequests]);

  // Apply filters
  const filtered = useMemo(() => {
    return enriched.filter(r => {
      if (search) {
        const q = search.toLowerCase();
        if (!(r.po_number || "").toLowerCase().includes(q) &&
            !(r._projectName || "").toLowerCase().includes(q) &&
            !(r.id || "").toLowerCase().includes(q)) return false;
      }
      if (plant !== "all" && r.plant !== plant) return false;
      if (status !== "all" && r._status !== status) return false;
      if (priority !== "all" && r._priority !== priority) return false;
      if (fy !== "all") {
        const range = FY_RANGES[fy];
        if (range) {
          const d = new Date(r.created_at);
          if (d < range.start || d > range.end) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Delayed first, then At Risk, then In Progress, etc.
      const order = { Delayed: 0, "At Risk": 1, "In Progress": 2, "On Track": 3, "Not Started": 4, Completed: 5 };
      const so = (order[a._status] ?? 9) - (order[b._status] ?? 9);
      if (so !== 0) return so;
      return b._orderValue - a._orderValue;
    });
  }, [enriched, search, plant, status, priority, fy]);

  // View window based on view granularity & FY
  const { viewStart, viewEnd } = useMemo(() => {
    const fyRange = fy !== "all" ? FY_RANGES[fy] : null;
    if (fyRange) return { viewStart: fyRange.start, viewEnd: fyRange.end };
    // Default = 1 year window centered on today
    const now = new Date();
    if (view === "weekly") return { viewStart: new Date(now.getFullYear(), now.getMonth() - 1, 1), viewEnd: new Date(now.getFullYear(), now.getMonth() + 2, 0) };
    if (view === "quarterly") return { viewStart: new Date(now.getFullYear() - 1, 0, 1), viewEnd: new Date(now.getFullYear() + 1, 11, 31) };
    if (view === "yearly") return { viewStart: new Date(now.getFullYear() - 2, 0, 1), viewEnd: new Date(now.getFullYear() + 1, 11, 31) };
    return { viewStart: new Date(now.getFullYear(), 0, 1), viewEnd: new Date(now.getFullYear(), 11, 31) };
  }, [fy, view]);

  const resetFilters = () => {
    setSearch(""); setPlant("all"); setStatus("all"); setPriority("all"); setFy("2025-26"); setView("monthly");
  };

  // KPI strip
  const summary = useMemo(() => {
    const delayed = filtered.filter(r => r._status === "Delayed").length;
    const atRisk = filtered.filter(r => r._status === "At Risk").length;
    const inProgress = filtered.filter(r => r._status === "In Progress").length;
    const completed = filtered.filter(r => r._status === "Completed").length;
    return { total: filtered.length, delayed, atRisk, inProgress, completed };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="project-timeline-loading">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4" data-testid="project-timeline-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Project Timeline Tracker
            </h1>
            <p className="text-xs text-slate-500">Gantt-style view of the procurement & project lifecycle — CEA → PR → PO → Manufacturing → Dispatch → Installation → Commissioning → Closure</p>
          </div>
        </div>

        {/* Filters */}
        <TimelineFilters
          search={search} setSearch={setSearch}
          view={view} setView={setView}
          plant={plant} setPlant={setPlant} uniquePlants={uniquePlants}
          status={status} setStatus={setStatus}
          priority={priority} setPriority={setPriority}
          fy={fy} setFy={setFy}
          onReset={resetFilters}
        />

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Card className="border-slate-200"><CardContent className="p-2.5"><p className="text-[10px] text-slate-500 uppercase">Total</p><p className="text-lg font-bold text-slate-800">{summary.total}</p></CardContent></Card>
          <Card className="border-red-200 bg-red-50/30"><CardContent className="p-2.5"><p className="text-[10px] text-red-600 uppercase flex items-center gap-1"><Flame className="w-3 h-3" /> Delayed</p><p className="text-lg font-bold text-red-700">{summary.delayed}</p></CardContent></Card>
          <Card className="border-amber-200 bg-amber-50/30"><CardContent className="p-2.5"><p className="text-[10px] text-amber-600 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> At Risk</p><p className="text-lg font-bold text-amber-700">{summary.atRisk}</p></CardContent></Card>
          <Card className="border-blue-200 bg-blue-50/30"><CardContent className="p-2.5"><p className="text-[10px] text-blue-600 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</p><p className="text-lg font-bold text-blue-700">{summary.inProgress}</p></CardContent></Card>
          <Card className="border-emerald-200 bg-emerald-50/30"><CardContent className="p-2.5"><p className="text-[10px] text-emerald-600 uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</p><p className="text-lg font-bold text-emerald-700">{summary.completed}</p></CardContent></Card>
        </div>

        {/* Gantt Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden" data-testid="gantt-card">
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              {/* Header row */}
              <div className="grid grid-cols-[100px_180px_90px_90px_120px_90px_90px_110px_90px_80px_70px_80px_110px_1fr] gap-px bg-slate-200 border-b border-slate-300 text-[9px] uppercase font-semibold text-slate-600 sticky top-0 z-10">
                <div className="bg-slate-50 px-2 py-1.5">PO No.</div>
                <div className="bg-slate-50 px-2 py-1.5">Project Name</div>
                <div className="bg-slate-50 px-2 py-1.5">Plant</div>
                <div className="bg-slate-50 px-2 py-1.5">Dept</div>
                <div className="bg-slate-50 px-2 py-1.5">Supplier</div>
                <div className="bg-slate-50 px-2 py-1.5">PR No.</div>
                <div className="bg-slate-50 px-2 py-1.5">CEA No.</div>
                <div className="bg-slate-50 px-2 py-1.5">Owner</div>
                <div className="bg-slate-50 px-2 py-1.5 text-right">Value</div>
                <div className="bg-slate-50 px-2 py-1.5">Stage</div>
                <div className="bg-slate-50 px-2 py-1.5 text-center">%</div>
                <div className="bg-slate-50 px-2 py-1.5 text-center">Delay</div>
                <div className="bg-slate-50 px-2 py-1.5 text-center">Priority / Status</div>
                <div className="bg-slate-50 px-2 py-1.5">
                  <TimelineHeader viewStart={viewStart} viewEnd={viewEnd} view={view} />
                </div>
              </div>

              {/* Rows */}
              {filtered.length > 0 ? filtered.map((r) => {
                const priorityStyle = PRIORITY_STYLE[r._priority] || PRIORITY_STYLE.Medium;
                const statusStyle = STATUS_STYLE[r._status] || STATUS_STYLE["Not Started"];
                return (
                  <Tooltip key={r.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="grid grid-cols-[100px_180px_90px_90px_120px_90px_90px_110px_90px_80px_70px_80px_110px_1fr] gap-px bg-slate-100 border-b border-slate-200 text-[10px] hover:bg-indigo-50/40 cursor-pointer group"
                        onClick={() => navigate(`/requests/${r.id}`)}
                        data-testid={`timeline-row-${r.id}`}
                      >
                        <div className="bg-white px-2 py-2 truncate font-mono font-semibold text-slate-700">{r.po_number || "-"}</div>
                        <div className="bg-white px-2 py-2 truncate text-slate-700" title={r._projectName}>{r._projectName}</div>
                        <div className="bg-white px-2 py-2 truncate text-slate-600">{r.plant || "-"}</div>
                        <div className="bg-white px-2 py-2 truncate text-slate-600">{r.department || "-"}</div>
                        <div className="bg-white px-2 py-2 truncate text-slate-600" title={r._supplier}>{r._supplier}</div>
                        <div className="bg-white px-2 py-2 truncate font-mono text-slate-600">{r.pr_number || "-"}</div>
                        <div className="bg-white px-2 py-2 truncate font-mono text-slate-600">{r.cea_number || "-"}</div>
                        <div className="bg-white px-2 py-2 truncate text-slate-600" title={r.requester_name || r.project_owner_name}>{r.requester_name || r.project_owner_name || "-"}</div>
                        <div className="bg-white px-2 py-2 text-right font-mono font-semibold text-slate-700">{formatCurrency(r._orderValue)}</div>
                        <div className="bg-white px-2 py-2 truncate text-slate-600">{r._currentStage}</div>
                        <div className="bg-white px-2 py-2 text-center">
                          <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-400 to-emerald-500" style={{ width: `${r._completion}%` }} />
                          </div>
                          <span className="text-[8px] text-slate-500 font-mono">{r._completion}%</span>
                        </div>
                        <div className="bg-white px-2 py-2 text-center">
                          {r._delayDays > 0 ? (
                            <span className="text-red-600 font-bold text-[10px]">{r._delayDays}d</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        <div className="bg-white px-2 py-2 flex flex-col items-center gap-0.5">
                          <Badge className={`text-[8px] px-1 py-0 ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} border`}>
                            {r._priority}
                          </Badge>
                          <Badge className={`text-[8px] px-1 py-0 ${statusStyle.bg} ${statusStyle.text} border-0 mt-0.5`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} mr-0.5`} />
                            {r._status}
                          </Badge>
                        </div>
                        <div className="bg-white px-2 py-1.5 relative">
                          <TimelineGanttRow project={r} viewStart={viewStart} viewEnd={viewEnd} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-sm">
                      <div className="space-y-1 text-xs">
                        <p className="font-bold">{r._projectName}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                          <span className="text-slate-400">PO:</span><span className="font-mono">{r.po_number || "-"}</span>
                          <span className="text-slate-400">PR:</span><span className="font-mono">{r.pr_number || "-"}</span>
                          <span className="text-slate-400">CEA:</span><span className="font-mono">{r.cea_number || "-"}</span>
                          <span className="text-slate-400">Plant:</span><span>{r.plant}</span>
                          <span className="text-slate-400">Dept:</span><span>{r.department}</span>
                          <span className="text-slate-400">Supplier:</span><span>{r._supplier}</span>
                          <span className="text-slate-400">Order Value:</span><span className="font-mono">{formatCurrency(r._orderValue)}</span>
                          <span className="text-slate-400">Planned Start:</span><span>{r.planned_start_date?.split("T")[0] || "-"}</span>
                          <span className="text-slate-400">Planned End:</span><span>{r.planned_completion_date?.split("T")[0] || "-"}</span>
                          <span className="text-slate-400">Actual End:</span><span>{(r.actual_completion_date || r.commissioning_date || r.closure_date)?.split("T")[0] || "-"}</span>
                          <span className="text-slate-400">Current Stage:</span><span className="font-medium">{r._currentStage}</span>
                          <span className="text-slate-400">Completion:</span><span>{r._completion}%</span>
                          {r._delayDays > 0 && (<><span className="text-slate-400">Delay:</span><span className="text-red-500 font-bold">{r._delayDays} days</span></>)}
                        </div>
                        <div className="flex items-center justify-end pt-1 mt-1 border-t border-slate-100">
                          <span className="text-[9px] text-indigo-500 inline-flex items-center gap-0.5">Click to drill down <ArrowRight className="w-2.5 h-2.5" /></span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }) : (
                <div className="px-4 py-8 text-center text-slate-400 text-xs bg-white">
                  {search ? `No projects matching "${search}"` : "No projects to display"}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Empty / Help */}
        {filtered.length === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="p-6 text-center">
              <p className="text-xs text-slate-500">No projects match the current filters.</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={resetFilters} data-testid="empty-reset">
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
