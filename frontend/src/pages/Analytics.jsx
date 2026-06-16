import { useState, useEffect, useMemo } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

import { FiltersBar } from "@/components/analytics-new/FiltersBar";
import { KpiCards } from "@/components/analytics-new/KpiCards";
import { PlantSpendChart } from "@/components/analytics-new/PlantSpendChart";
import { DepartmentChart } from "@/components/analytics-new/DepartmentChart";
import { SupplierTable } from "@/components/analytics-new/SupplierTable";
import { AiInsightsBar } from "@/components/analytics-new/AiInsightsBar";

const FY_RANGES = {
  "2024-25": { start: new Date(2024, 3, 1), end: new Date(2025, 2, 31, 23, 59, 59) },
  "2025-26": { start: new Date(2025, 3, 1), end: new Date(2026, 2, 31, 23, 59, 59) },
  "2026-27": { start: new Date(2026, 3, 1), end: new Date(2027, 2, 31, 23, 59, 59) },
};

const PREV_FY = { "2024-25": null, "2025-26": "2024-25", "2026-27": "2025-26" };

const getSpend = (r) => {
  if (r.suppliers?.length > 0) {
    const s = r.suppliers.find(s => s.is_ordered) || r.suppliers.find(s => s.selected) || r.suppliers[0];
    return { initial: parseFloat(s?.initial_price || 0), final: parseFloat(s?.final_price || 0) };
  }
  return { initial: parseFloat(r.initial_price || 0), final: parseFloat(r.final_negotiated_price || 0) };
};

const formatCurrency = (v) => {
  if (!v) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
};

const calcDays = (a, b) => {
  if (!a || !b) return null;
  return Math.max(0, Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)));
};

export default function Analytics() {
  const { user } = useAuth();
  const [allRequests, setAllRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedFY, setSelectedFY] = useState("2025-26");
  const [timeGranularity, setTimeGranularity] = useState("monthly");
  const [plantFilter, setPlantFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [poSearch, setPoSearch] = useState("");

  // AI
  const [aiInsight, setAiInsight] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // FY-filtered data
  const fyData = useMemo(() => {
    const range = FY_RANGES[selectedFY];
    if (!range) return allRequests;
    return allRequests.filter(r => { const d = new Date(r.created_at); return d >= range.start && d <= range.end; });
  }, [allRequests, selectedFY]);

  const prevFYData = useMemo(() => {
    const prevKey = PREV_FY[selectedFY];
    if (!prevKey) return [];
    const range = FY_RANGES[prevKey];
    return allRequests.filter(r => { const d = new Date(r.created_at); return d >= range.start && d <= range.end; });
  }, [allRequests, selectedFY]);

  // Apply all filters
  const filtered = useMemo(() => {
    return fyData.filter(r => {
      if (plantFilter !== "all" && r.plant !== plantFilter) return false;
      if (deptFilter !== "all" && r.department !== deptFilter) return false;
      if (supplierFilter !== "all") {
        const hasSupplier = r.suppliers?.some(s => s.name === supplierFilter) || r.vendor_name === supplierFilter;
        if (!hasSupplier) return false;
      }
      if (poSearch) {
        const q = poSearch.toLowerCase();
        if (!(r.po_number || "").toLowerCase().includes(q) && !(r.pr_number || "").toLowerCase().includes(q) && !(r.id || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [fyData, plantFilter, deptFilter, supplierFilter, poSearch]);

  // Unique values for filters
  const uniquePlants = useMemo(() => [...new Set(fyData.map(r => r.plant).filter(Boolean))], [fyData]);
  const uniqueDepts = useMemo(() => [...new Set(fyData.map(r => r.department).filter(Boolean))], [fyData]);
  const uniqueSuppliers = useMemo(() => {
    const names = new Set();
    fyData.forEach(r => {
      r.suppliers?.forEach(s => { if (s.name) names.add(s.name); });
      if (r.vendor_name) names.add(r.vendor_name);
    });
    return [...names].sort();
  }, [fyData]);

  // KPI computation
  const computeKPIs = (data) => {
    let totalSpend = 0;
    const suppliers = new Set();
    let poProcessingDays = [];
    data.forEach(r => {
      const s = getSpend(r);
      totalSpend += s.final;
      r.suppliers?.forEach(s => { if (s.name) suppliers.add(s.name); });
      if (r.vendor_name) suppliers.add(r.vendor_name);
      const days = calcDays(r.po_created_date, r.po_approved_date);
      if (days !== null) poProcessingDays.push(days);
    });
    const now = new Date();
    const delayed = data.filter(r => {
      if (r.workflow_status === "Completed") return false;
      if (!r.po_number) return false;
      if (r.delivery_date && r.expected_delivery_date) return new Date(r.delivery_date) > new Date(r.expected_delivery_date);
      if (!r.delivery_date && r.expected_delivery_date) return now > new Date(r.expected_delivery_date);
      if (!r.delivery_date && r.po_approved_date) return Math.floor((now - new Date(r.po_approved_date)) / (1000 * 60 * 60 * 24)) > 60;
      return false;
    }).length;
    const active = data.filter(r => r.workflow_status !== "Completed" && r.status !== "Rejected" && r.status !== "Rejected by DH").length;
    const completed = data.filter(r => r.workflow_status === "Completed").length;
    const avgPo = poProcessingDays.length > 0 ? Math.round(poProcessingDays.reduce((a, b) => a + b, 0) / poProcessingDays.length) : null;
    return { totalSpend, activeProjects: active, delayedProjects: delayed, completedProjects: completed, totalSuppliers: suppliers.size, avgPoProcessing: avgPo };
  };

  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const prevKpis = useMemo(() => computeKPIs(prevFYData), [prevFYData]);

  // Plant spend data
  const plantData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const plant = r.plant || "Unknown";
      const s = getSpend(r);
      if (!map[plant]) map[plant] = { name: plant, spend: 0, initial: 0, count: 0 };
      map[plant].spend += s.final;
      map[plant].initial += s.initial;
      map[plant].count += 1;
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [filtered]);

  // Department spend data
  const deptData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const dept = r.department || "Unknown";
      const s = getSpend(r);
      if (!map[dept]) map[dept] = { name: dept, spend: 0, initial: 0, count: 0 };
      map[dept].spend += s.final;
      map[dept].initial += s.initial;
      map[dept].count += 1;
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend);
  }, [filtered]);

  // Supplier data
  const supplierData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const isOnTime = (r.expected_delivery_date && r.delivery_date)
        ? new Date(r.delivery_date) <= new Date(r.expected_delivery_date) : null;
      if (r.suppliers?.length > 0) {
        r.suppliers.forEach(s => {
          const name = s.name || "Unknown";
          if (!map[name]) map[name] = { name, spend: 0, initial: 0, orders: 0, ontimeCount: 0, totalDeliveries: 0 };
          map[name].spend += parseFloat(s.final_price || 0);
          map[name].initial += parseFloat(s.initial_price || 0);
          if (s.is_ordered) map[name].orders += 1;
          if (s.is_ordered && isOnTime !== null) { map[name].totalDeliveries += 1; if (isOnTime) map[name].ontimeCount += 1; }
        });
      } else if (r.vendor_name) {
        const name = r.vendor_name;
        const s = getSpend(r);
        if (!map[name]) map[name] = { name, spend: 0, initial: 0, orders: 0, ontimeCount: 0, totalDeliveries: 0 };
        map[name].spend += s.final;
        map[name].initial += s.initial;
        map[name].orders += 1;
        if (isOnTime !== null) { map[name].totalDeliveries += 1; if (isOnTime) map[name].ontimeCount += 1; }
      }
    });
    return Object.values(map)
      .filter(s => s.spend > 0)
      .map(s => ({ ...s, ontimePercent: s.totalDeliveries > 0 ? Math.round((s.ontimeCount / s.totalDeliveries) * 100) : null }))
      .sort((a, b) => b.spend - a.spend);
  }, [filtered]);

  // Export
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const reqData = filtered.map(r => ({
      "Request ID": r.id, "Plant": r.plant, "Department": r.department,
      "Description": r.requirement_items?.[0]?.description || r.requirement_description || "",
      "Status": r.workflow_status || r.status, "PO Number": r.po_number || "",
      "PR Number": r.pr_number || "", "Total Spend": getSpend(r).final,
      "Created": r.created_at?.split("T")[0] || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reqData), "Requests");
    const suppData = supplierData.map(s => ({
      "Supplier": s.name, "Total Spend": s.spend, "Initial Quote": s.initial,
      "Savings": Math.max(0, s.initial - s.spend), "POs": s.orders,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suppData), "Suppliers");
    XLSX.writeFile(wb, `Analytics_${selectedFY}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Analytics exported successfully");
  };

  // AI
  const handleAiSubmit = async (query) => {
    setIsAiLoading(true);
    try {
      const res = await axios.post(`${API}/ai/insights`, { query });
      setAiInsight(res.data.insight);
    } catch (e) { toast.error("Failed to get AI insight"); }
    finally { setIsAiLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="analytics-loading">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-0" data-testid="analytics" style={{ margin: "-0.5rem -0.5rem 0 -0.5rem" }}>
      {/* Sticky Filters */}
      <FiltersBar
        selectedFY={selectedFY} setSelectedFY={setSelectedFY}
        timeGranularity={timeGranularity} setTimeGranularity={setTimeGranularity}
        plantFilter={plantFilter} setPlantFilter={setPlantFilter} uniquePlants={uniquePlants}
        deptFilter={deptFilter} setDeptFilter={setDeptFilter} uniqueDepts={uniqueDepts}
        supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter} uniqueSuppliers={uniqueSuppliers}
        poSearch={poSearch} setPoSearch={setPoSearch}
        onExport={handleExport}
      />

      <div className="px-4 md:px-6 py-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500">Financial performance & project insights</p>
        </div>

        {/* KPIs */}
        <KpiCards kpis={kpis} prevKpis={prevKpis} formatCurrency={formatCurrency} />

        {/* Spend: Plant + Department */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlantSpendChart data={plantData} />
          <DepartmentChart data={deptData} />
        </div>

        {/* Supplier Analytics */}
        <SupplierTable rows={supplierData} />

        {/* AI Insights */}
        <AiInsightsBar onSubmit={handleAiSubmit} isLoading={isAiLoading} insight={aiInsight} />
      </div>
    </div>
  );
}
