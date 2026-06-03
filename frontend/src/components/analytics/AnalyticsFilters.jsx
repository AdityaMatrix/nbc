import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Filter, Calendar, Building2, Users, Package, Search,
  RotateCcw, Download
} from "lucide-react";

export const AnalyticsFilters = ({
  selectedFY, setSelectedFY,
  timeGranularity, setTimeGranularity,
  plantFilter, setPlantFilter, uniquePlants,
  deptFilter, setDeptFilter, uniqueDepts,
  supplierFilter, setSupplierFilter, uniqueSuppliers,
  poSearch, setPoSearch,
  onReset, onExport
}) => {
  const hasActiveFilters = plantFilter !== "all" || deptFilter !== "all" || supplierFilter !== "all" || poSearch;

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm -mx-6 px-6 py-3" data-testid="analytics-filters">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">Filters</span>
        </div>

        <Select value={selectedFY} onValueChange={setSelectedFY}>
          <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200" data-testid="fy-filter">
            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024-25" className="text-xs">FY 2024-25</SelectItem>
            <SelectItem value="2025-26" className="text-xs">FY 2025-26</SelectItem>
            <SelectItem value="2026-27" className="text-xs">FY 2026-27</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={timeGranularity} onValueChange={setTimeGranularity}>
          <TabsList className="h-8 bg-slate-100 p-0.5">
            <TabsTrigger value="daily" className="text-[10px] h-7 px-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Daily</TabsTrigger>
            <TabsTrigger value="monthly" className="text-[10px] h-7 px-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly" className="text-[10px] h-7 px-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Quarterly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        <Select value={plantFilter} onValueChange={setPlantFilter}>
          <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200" data-testid="plant-filter">
            <Building2 className="w-3 h-3 mr-1 text-slate-400" />
            <SelectValue placeholder="All Plants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Plants</SelectItem>
            {uniquePlants.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-36 h-8 text-xs bg-white border-slate-200" data-testid="dept-filter">
            <Users className="w-3 h-3 mr-1 text-slate-400" />
            <SelectValue placeholder="All Depts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Departments</SelectItem>
            {uniqueDepts.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-36 h-8 text-xs bg-white border-slate-200" data-testid="supplier-filter">
            <Package className="w-3 h-3 mr-1 text-slate-400" />
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Suppliers</SelectItem>
            {uniqueSuppliers.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <Input
            placeholder="PO Number..."
            value={poSearch}
            onChange={(e) => setPoSearch(e.target.value)}
            className="w-32 h-8 pl-7 text-xs bg-white border-slate-200"
            data-testid="po-search"
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-700" onClick={onReset} data-testid="reset-filters-btn">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={onExport} data-testid="export-btn">
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Active filter tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {plantFilter !== "all" && <Badge className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer" onClick={() => setPlantFilter("all")}>{plantFilter} &times;</Badge>}
          {deptFilter !== "all" && <Badge className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 cursor-pointer" onClick={() => setDeptFilter("all")}>{deptFilter} &times;</Badge>}
          {supplierFilter !== "all" && <Badge className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer" onClick={() => setSupplierFilter("all")}>{supplierFilter} &times;</Badge>}
          {poSearch && <Badge className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer" onClick={() => setPoSearch("")}>PO: {poSearch} &times;</Badge>}
        </div>
      )}
    </div>
  );
};
