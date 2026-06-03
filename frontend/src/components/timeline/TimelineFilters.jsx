import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, CalendarRange, Filter } from "lucide-react";

export const TimelineFilters = ({
  search, setSearch,
  view, setView,
  plant, setPlant, uniquePlants,
  status, setStatus,
  priority, setPriority,
  fy, setFy,
  onReset,
}) => {
  return (
    <Card className="sticky top-0 z-30 shadow-sm border-slate-200 bg-white/90 backdrop-blur" data-testid="timeline-filters">
      <CardContent className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              data-testid="timeline-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO Number or Project Name..."
              className="h-8 pl-8 text-xs border-slate-200"
            />
          </div>

          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-32 h-8 text-xs border-slate-200" data-testid="timeline-view">
              <CalendarRange className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
              <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
              <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
              <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-28 h-8 text-xs border-slate-200" data-testid="timeline-fy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All FYs</SelectItem>
              <SelectItem value="2024-25" className="text-xs">FY 2024-25</SelectItem>
              <SelectItem value="2025-26" className="text-xs">FY 2025-26</SelectItem>
              <SelectItem value="2026-27" className="text-xs">FY 2026-27</SelectItem>
            </SelectContent>
          </Select>

          <Select value={plant} onValueChange={setPlant}>
            <SelectTrigger className="w-32 h-8 text-xs border-slate-200" data-testid="timeline-plant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Plants</SelectItem>
              {uniquePlants.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32 h-8 text-xs border-slate-200" data-testid="timeline-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="On Track" className="text-xs">On Track</SelectItem>
              <SelectItem value="At Risk" className="text-xs">At Risk</SelectItem>
              <SelectItem value="Delayed" className="text-xs">Delayed</SelectItem>
              <SelectItem value="Completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="Not Started" className="text-xs">Not Started</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-32 h-8 text-xs border-slate-200" data-testid="timeline-priority">
              <Filter className="w-3.5 h-3.5 mr-1 text-amber-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Priority</SelectItem>
              <SelectItem value="Critical" className="text-xs">Critical</SelectItem>
              <SelectItem value="High" className="text-xs">High</SelectItem>
              <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
              <SelectItem value="Low" className="text-xs">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={onReset} className="h-8 text-xs border-slate-200" data-testid="timeline-reset">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600">Legend:</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completed / On Track</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> At Risk</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Delayed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Not Started</span>
          <span className="ml-auto text-[10px] text-slate-400">Stages: CEA → PR → PO → Manufacturing → Dispatch → Installation → Commissioning → Closure</span>
        </div>
      </CardContent>
    </Card>
  );
};
