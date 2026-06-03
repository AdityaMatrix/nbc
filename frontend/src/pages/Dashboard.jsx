import { useState, useEffect, useMemo } from "react";
import { useAuth, API } from "@/App";
import { Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Zap, RefreshCw, Plus, FileSpreadsheet, Upload, Check
} from "lucide-react";
import * as XLSX from 'xlsx';
import BulkUploadDialog from "@/components/BulkUploadDialog";
import { useAccessControl } from "@/hooks/useAccessControl";

// Dashboard sub-components
import {
  statusConfig, formatCurrency, getGreeting, getDisplayDescription,
  hasAllNumbers, isFieldApproved, isAllApproved,
  isCeaPending, isPrPending, isPoPending
} from "@/components/dashboard/dashboardConfig";
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import { DashboardPendingTasks } from "@/components/dashboard/DashboardPendingTasks";
import { DashboardRequestsTable } from "@/components/dashboard/DashboardRequestsTable";
import { DashboardExportDialog } from "@/components/dashboard/DashboardExportDialog";

export default function Dashboard() {
  const { user } = useAuth();
  const { hasAccess, loading: accessLoading, previewRole } = useAccessControl();
  const [analytics, setAnalytics] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statuses, setStatuses] = useState([]);

  const [plantFilter, setPlantFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [ceaFilter, setCeaFilter] = useState("all");
  const [prFilter, setPrFilter] = useState("all");
  const [poFilter, setPoFilter] = useState("all");

  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [buyersList, setBuyersList] = useState([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    fy: "2025-26",
    includeSuppliers: true,
    includeInvoices: true,
    includeTimeline: true,
    includeSummary: true,
    plantFilter: "all",
    statusFilter: "all"
  });

  const widgetConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem('dashboardWidgets');
      if (saved) {
        const widgets = JSON.parse(saved);
        const map = {};
        widgets.forEach(w => { map[w.id] = w.visible; });
        return map;
      }
    } catch (e) { /* ignore */ }
    return { stats_cards: true, analytics: true, pending_tasks: true, recent_requests: true };
  }, []);
  const isWidgetVisible = (id) => widgetConfig[id] !== false && hasAccess('dashboard', id);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [prPoSearch, setPrPoSearch] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("all");
  const [pendingTaskFilter, setPendingTaskFilter] = useState(null);
  const [buyerMetricFilter, setBuyerMetricFilter] = useState(null);

  const effectiveRole = previewRole || user?.role;
  const isUserRole = effectiveRole === "user" || effectiveRole === "process_engineering";
  const isBuyer = effectiveRole === "buyer" || effectiveRole === "capex_head";
  const isDeptHead = effectiveRole === "department_head";

  useEffect(() => {
    if (isDeptHead) setActiveTab("pending_dh");
    else if (isBuyer) setActiveTab("assigned");
    else setActiveTab("all");
  }, [isBuyer, isDeptHead]);

  // --- Export functions ---
  const exportToExcel = () => {
    const dataToExport = filteredRequests.map(r => ({
      "Request ID": r.id,
      "Plant": r.plant,
      "Department": r.department,
      "Description": r._itemDescription || r.requirement_items?.[0]?.description || r.requirement_description,
      "Status": r.status,
      "CEA No.": r._ceaNumber || r.cea_number || r.wbs_number || (r.cea_required ? "Pending" : "Not Available"),
      "PR Number": r._prNumber || r.pr_number || "",
      "PR Status": r.pr_approval_status || "",
      "PO Number": r.po_number || "",
      "PO Status": r.po_approval_status || "",
      "Workflow Status": r.workflow_status || "",
      "Created Date": r.created_at?.split("T")[0] || "",
      "Assigned Buyer": r.assigned_buyer_name || ""
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Capex Requests");
    XLSX.writeFile(wb, `Capex_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Report exported successfully");
  };

  const exportFYReport = () => {
    const { fy, includeSuppliers, includeInvoices, includeTimeline, includeSummary, plantFilter: expPlant, statusFilter: expStatus } = exportOptions;
    const [startYear] = fy.split("-").map(y => parseInt(y.length === 2 ? `20${y}` : y));
    const fyStart = new Date(startYear, 3, 1);
    const fyEnd = new Date(startYear + 1, 2, 31, 23, 59, 59);

    let fyRequests = allRequests.filter(r => {
      const createdDate = new Date(r.created_at);
      return createdDate >= fyStart && createdDate <= fyEnd;
    });
    if (expPlant !== "all") fyRequests = fyRequests.filter(r => r.plant === expPlant);
    if (expStatus !== "all") fyRequests = fyRequests.filter(r => r.status === expStatus || r.workflow_status === expStatus);

    if (fyRequests.length === 0) { toast.error("No requests found for the selected criteria"); return; }

    const wb = XLSX.utils.book_new();

    if (includeSummary) {
      const totalPurchase = fyRequests.reduce((sum, r) => sum + (r.final_negotiated_price || 0), 0);
      const totalInitial = fyRequests.reduce((sum, r) => sum + (r.initial_price || 0), 0);
      const savings = totalInitial - totalPurchase;
      const statusCounts = fyRequests.reduce((acc, r) => { const s = r.workflow_status || r.status || "Unknown"; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
      const plantCounts = fyRequests.reduce((acc, r) => { acc[r.plant] = (acc[r.plant] || 0) + 1; return acc; }, {});
      const deptCounts = fyRequests.reduce((acc, r) => { acc[r.department] = (acc[r.department] || 0) + 1; return acc; }, {});
      const summaryData = [
        { "Metric": "Financial Year", "Value": `FY ${fy}` },
        { "Metric": "Total Requests", "Value": fyRequests.length },
        { "Metric": "Completed Requests", "Value": fyRequests.filter(r => r.workflow_status === "Completed").length },
        { "Metric": "In Progress", "Value": fyRequests.filter(r => r.dh_approval_status === "Approved" && r.workflow_status !== "Completed").length },
        { "Metric": "Total Purchase Value (\u20B9)", "Value": totalPurchase.toLocaleString("en-IN") },
        { "Metric": "Initial Quoted Value (\u20B9)", "Value": totalInitial.toLocaleString("en-IN") },
        { "Metric": "Cost Savings (\u20B9)", "Value": savings.toLocaleString("en-IN") },
        { "Metric": "Savings %", "Value": totalInitial > 0 ? ((savings / totalInitial) * 100).toFixed(2) + "%" : "N/A" },
        { "Metric": "", "Value": "" },
        { "Metric": "--- Status Breakdown ---", "Value": "" },
        ...Object.entries(statusCounts).map(([status, count]) => ({ "Metric": status, "Value": count })),
        { "Metric": "", "Value": "" },
        { "Metric": "--- Plant-wise Count ---", "Value": "" },
        ...Object.entries(plantCounts).map(([plant, count]) => ({ "Metric": plant, "Value": count })),
        { "Metric": "", "Value": "" },
        { "Metric": "--- Department-wise Count ---", "Value": "" },
        ...Object.entries(deptCounts).map(([dept, count]) => ({ "Metric": dept, "Value": count })),
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    }

    const requestsData = fyRequests.map(r => ({
      "Request ID": r.id, "Plant": r.plant, "Department": r.department,
      "Asset Category": r.asset_category, "Requirement Type": r.requirement_type,
      "Description": r.requirement_items?.[0]?.description || r.requirement_description,
      "Quantity": r.requirement_items?.[0]?.quantity || 1, "Status": r.status,
      "Workflow Status": r.workflow_status || "", "CEA Required": r.cea_required ? "Yes" : "No",
      "CEA Number": r.cea_number || "", "CEA Status": r.cea_status || "",
      "PR Number": r.pr_number || "", "PR Status": r.pr_approval_status || "",
      "PO Number": r.po_number || "", "PO Status": r.po_approval_status || "",
      "Vendor Name": r.vendor_name || "", "Initial Price (\u20B9)": r.initial_price || "",
      "Negotiated Price (\u20B9)": r.final_negotiated_price || "",
      "Assigned Buyer": r.assigned_buyer_name || "",
      "Created Date": r.created_at?.split("T")[0] || "",
    }));
    const wsRequests = XLSX.utils.json_to_sheet(requestsData);
    wsRequests["!cols"] = new Array(22).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, wsRequests, "All Requests");

    if (includeSuppliers) {
      const suppliersData = [];
      fyRequests.forEach(r => {
        if (r.suppliers && r.suppliers.length > 0) {
          r.suppliers.forEach((s, idx) => {
            suppliersData.push({
              "Request ID": r.id, "Supplier #": idx + 1, "Supplier Name": s.name,
              "Initial Price (\u20B9)": s.initial_price || "", "Final Price (\u20B9)": s.final_price || "",
              "Is Ordered": s.is_ordered ? "Yes" : "No",
            });
          });
        }
      });
      if (suppliersData.length > 0) {
        const wsSuppliers = XLSX.utils.json_to_sheet(suppliersData);
        XLSX.utils.book_append_sheet(wb, wsSuppliers, "Suppliers");
      }
    }

    if (includeInvoices) {
      const invoicesData = [];
      fyRequests.forEach(r => {
        if (r.invoices && r.invoices.length > 0) {
          r.invoices.forEach((inv, idx) => {
            invoicesData.push({
              "Request ID": r.id, "Invoice #": idx + 1,
              "Invoice Number": inv.invoice_number || "", "Amount (\u20B9)": inv.amount || "",
            });
          });
        }
      });
      if (invoicesData.length > 0) {
        const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
        XLSX.utils.book_append_sheet(wb, wsInvoices, "Invoices");
      }
    }

    if (includeTimeline) {
      const timelineData = fyRequests.map(r => ({
        "Request ID": r.id, "Created": r.created_at?.split("T")[0] || "",
        "PR Created": r.pr_created_date || "", "PO Created": r.po_created_date || "",
        "Current Status": r.workflow_status || r.status,
      }));
      const wsTimeline = XLSX.utils.json_to_sheet(timelineData);
      XLSX.utils.book_append_sheet(wb, wsTimeline, "Timeline");
    }

    const plantSummary = [];
    const plants = [...new Set(fyRequests.map(r => r.plant))];
    plants.forEach(plant => {
      const plantReqs = fyRequests.filter(r => r.plant === plant);
      const totalValue = plantReqs.reduce((sum, r) => sum + (r.final_negotiated_price || 0), 0);
      plantSummary.push({
        "Plant": plant, "Total Requests": plantReqs.length,
        "Completed": plantReqs.filter(r => r.workflow_status === "Completed").length,
        "Total Value (\u20B9)": totalValue.toLocaleString("en-IN"),
      });
    });
    const wsPlantSummary = XLSX.utils.json_to_sheet(plantSummary);
    XLSX.utils.book_append_sheet(wb, wsPlantSummary, "Plant Summary");

    const fileName = `Capex_FY_${fy}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`FY ${fy} Report exported with ${fyRequests.length} requests`);
    setExportDialogOpen(false);
  };

  // --- Data fetching ---
  const fetchData = async (showRefreshState = false) => {
    if (showRefreshState) setIsRefreshing(true);
    try {
      const [analyticsRes, requestsRes, statusesRes, buyersRes] = await Promise.all([
        axios.get(`${API}/analytics/dashboard`),
        axios.get(`${API}/capex-requests`),
        axios.get(`${API}/reference/statuses`),
        isBuyer ? axios.get(`${API}/users/buyers`) : Promise.resolve({ data: [] })
      ]);
      setAnalytics(analyticsRes.data);
      setAllRequests(requestsRes.data);
      setStatuses(statusesRes.data);
      setBuyersList(buyersRes.data || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAssignBuyer = async (requestId, buyerId) => {
    try {
      await axios.put(`${API}/capex-requests/${requestId}`, { assigned_buyer_id: buyerId });
      toast.success("Buyer assigned successfully");
      fetchData(true);
    } catch (error) {
      toast.error("Failed to assign buyer");
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const interval = setInterval(() => { fetchData(false); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => { fetchData(true); };

  // --- Multi-select handlers ---
  const toggleSelectRequest = (requestId) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) newSelected.delete(requestId);
    else newSelected.add(requestId);
    setSelectedRequests(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRequests.size === filteredRequests.length) setSelectedRequests(new Set());
    else setSelectedRequests(new Set(filteredRequests.map(r => r.id)));
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedRequests).map(id => axios.delete(`${API}/capex-requests/${id}`)));
      toast.success(`${selectedRequests.size} request(s) deleted successfully`);
      setSelectedRequests(new Set());
      setDeleteDialogOpen(false);
      fetchData(true);
    } catch (error) {
      toast.error("Failed to delete some requests");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Computed data ---
  const expandedRequests = allRequests.flatMap((request) => {
    const items = request.requirement_items || [];
    if (items.length > 1) {
      return items.map((item, idx) => ({
        ...request, _rowId: `${request.id}-${idx}`, _itemIndex: idx,
        _itemDescription: item.description, _itemQuantity: item.quantity,
        _prNumber: item.pr_number || null, _prStatus: item.pr_status || request.pr_approval_status,
        _poNumber: item.po_number || request.po_number, _poStatus: item.po_status || request.po_approval_status,
        _deliveryStatus: item.delivery_status || request.delivery_status,
        _ceaStatus: item.cea_status || request.cea_status, _ceaNumber: item.cea_number || request.cea_number,
        _isExpanded: true
      }));
    }
    const firstItem = items[0];
    return [{
      ...request, _rowId: request.id, _itemIndex: 0,
      _itemDescription: firstItem?.description || null, _itemQuantity: firstItem?.quantity || null,
      _prNumber: request.pr_number || firstItem?.pr_number || null,
      _prStatus: request.pr_approval_status || firstItem?.pr_status,
      _poNumber: request.po_number || firstItem?.po_number,
      _poStatus: request.po_approval_status || firstItem?.po_status,
      _deliveryStatus: request.delivery_status,
      _ceaStatus: request.cea_status || firstItem?.cea_status,
      _ceaNumber: request.cea_number || firstItem?.cea_number,
      _isExpanded: false
    }];
  });

  const uniquePlants = [...new Set(allRequests.map(r => r.plant).filter(Boolean))];
  const uniqueDepts = [...new Set(allRequests.map(r => r.department).filter(Boolean))];

  const filteredRequests = useMemo(() => {
    return expandedRequests.filter((request) => {
      const descriptionText = request._itemDescription || request.justification ||
        (request.requirement_items && request.requirement_items.length > 0
          ? request.requirement_items[0]?.description || "" : request.requirement_description || "");

      const matchesSearch = request.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        descriptionText?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || request.status === statusFilter || request.workflow_status === statusFilter;
      const matchesPlant = plantFilter === "all" || request.plant === plantFilter;
      const matchesDept = deptFilter === "all" || request.department === deptFilter;
      const matchesCea = ceaFilter === "all" ||
        (ceaFilter === "required" && request.cea_required) ||
        (ceaFilter === "not_required" && !request.cea_required) ||
        (ceaFilter === "approved" && request.cea_status === "Approved");
      const matchesPr = prFilter === "all" ||
        (prFilter === "available" && request.pr_available) ||
        (prFilter === "approved" && request.pr_approval_status === "Approved");
      const matchesPo = poFilter === "all" ||
        (poFilter === "available" && request.po_available) ||
        (poFilter === "approved" && request.po_approval_status === "Approved");

      const requestDate = new Date(request.created_at);
      const matchesDateFrom = !dateFrom || requestDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || requestDate <= new Date(dateTo + "T23:59:59");
      const matchesPrPoSearch = !prPoSearch ||
        (request.pr_number && request.pr_number.toLowerCase().includes(prPoSearch.toLowerCase())) ||
        (request.po_number && request.po_number.toLowerCase().includes(prPoSearch.toLowerCase())) ||
        (request._prNumber && request._prNumber.toLowerCase().includes(prPoSearch.toLowerCase()));
      const matchesBuyerFilter = buyerFilter === "all" || request.assigned_buyer_id === buyerFilter;

      let matchesTab = true;
      if (isDeptHead && activeTab === "pending_dh") matchesTab = request.status === "Pending DH Approval";
      else if (isBuyer && activeTab === "new") matchesTab = !request.assigned_buyer_id;
      else if (isBuyer && activeTab === "assigned") matchesTab = request.assigned_buyer_id === user?.id;

      let matchesPendingTask = true;
      if (pendingTaskFilter && effectiveRole === "buyer") {
        const isMyRequest = request.assigned_buyer_id === user?.id;
        if (!isMyRequest) { matchesPendingTask = false; }
        else {
          switch (pendingTaskFilter) {
            case "pr": matchesPendingTask = isPrPending(request); break;
            case "po": matchesPendingTask = isPoPending(request); break;
            case "cea": matchesPendingTask = isCeaPending(request); break;
            case "dap": matchesPendingTask = (request.workflow_status || '').includes('DAP'); break;
            case "sample": matchesPendingTask = request.sample_required === true && !request.sample_received; break;
            case "pdi": matchesPendingTask = (request.workflow_status || '').includes('PDI'); break;
            default: matchesPendingTask = true;
          }
        }
      }

      let matchesBuyerMetric = true;
      if (buyerMetricFilter && effectiveRole === "buyer") {
        const isMyRequest = request.assigned_buyer_id === user?.id;
        switch (buyerMetricFilter) {
          case "assigned": matchesBuyerMetric = isMyRequest; break;
          case "completed": matchesBuyerMetric = isMyRequest && request.workflow_status === "Completed"; break;
          case "inprogress": matchesBuyerMetric = isMyRequest && request.dh_approval_status === "Approved" && request.workflow_status !== "Completed"; break;
          case "purchase": matchesBuyerMetric = isMyRequest && (request.final_negotiated_price > 0); break;
          case "savings":
            if (isMyRequest && request.suppliers && request.suppliers.length > 0) {
              const orderedSupplier = request.suppliers.find(s => s.is_ordered === true) || request.suppliers[0];
              if (orderedSupplier) {
                matchesBuyerMetric = parseFloat(orderedSupplier.initial_price || 0) > parseFloat(orderedSupplier.final_price || 0);
              } else { matchesBuyerMetric = false; }
            } else { matchesBuyerMetric = false; }
            break;
          default: matchesBuyerMetric = true;
        }
      }

      return matchesSearch && matchesStatus && matchesPlant && matchesDept && matchesCea && matchesPr && matchesPo && matchesDateFrom && matchesDateTo && matchesTab && matchesPrPoSearch && matchesBuyerFilter && matchesPendingTask && matchesBuyerMetric;
    });
  }, [expandedRequests, searchQuery, statusFilter, plantFilter, deptFilter, ceaFilter, prFilter, poFilter, dateFrom, dateTo, activeTab, isBuyer, isDeptHead, user?.id, prPoSearch, buyerFilter, pendingTaskFilter, effectiveRole, buyerMetricFilter]);

  // --- Render helpers ---
  const renderPRStatus = (request) => {
    if (request.pr_available && request.pr_number) {
      return <span className="flex items-center gap-1 text-emerald-600 font-medium"><Check className="w-3 h-3" />{request.pr_number}</span>;
    }
    if (request.pr_number && request.pr_approval_status === "Approved") {
      return <span className="flex items-center gap-1 text-emerald-600 font-medium"><Check className="w-3 h-3" />{request.pr_number}</span>;
    }
    if (request.pr_number) {
      return <span className="text-amber-600 text-[10px]">Under Approval {request.pr_approval_level ? `(${request.pr_approval_level})` : ""}</span>;
    }
    return <span className="text-slate-400 text-[10px]">-</span>;
  };

  const renderPOStatus = (request) => {
    const poNumber = request._poNumber || request.po_number;
    const poStatus = request._poStatus || request.po_approval_status;
    if (poNumber && poStatus === "Approved") {
      return <span className="flex items-center gap-1 text-emerald-600 font-medium"><Check className="w-3 h-3" />{poNumber}</span>;
    }
    if (poNumber) {
      return <span className="text-amber-600 text-[10px]">Under Approval {request.po_approval_level ? `(${request.po_approval_level})` : ""}</span>;
    }
    return <span className="text-slate-400 text-[10px]">-</span>;
  };

  const renderCEAStatus = (request) => {
    if (!request.cea_required) return <span className="text-slate-400 text-[10px]">Not Available</span>;
    const ceaNumber = request._ceaNumber || request.cea_number || request.wbs_number;
    const ceaStatus = request._ceaStatus || request.cea_status;
    if (ceaNumber) {
      return (
        <span className="flex items-center gap-1 text-[10px]">
          {ceaStatus === "Approved" && <Check className="w-3 h-3 text-emerald-500" />}
          <span className={`font-mono font-medium ${ceaStatus === "Approved" ? "text-emerald-600" : "text-blue-600"}`}>{ceaNumber}</span>
        </span>
      );
    }
    if (ceaStatus) return <span className="text-amber-600 text-[10px]">{ceaStatus}</span>;
    return <span className="text-slate-400 text-[10px]">-</span>;
  };

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="dashboard-loading">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="dashboard">
      {/* Premium Header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, var(--theme-sidebar) 0%, color-mix(in srgb, var(--theme-primary) 60%, var(--theme-sidebar)) 50%, color-mix(in srgb, var(--theme-secondary) 40%, var(--theme-sidebar)) 100%)` }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-transparent to-transparent" style={{ '--tw-gradient-from': 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-2xl transform -translate-x-1/4 translate-y-1/4" style={{ background: `radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 15%, transparent), transparent)` }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--theme-accent)' }}>Capex Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {`${getGreeting()}, ${user?.name?.split(' ')[0]}`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300/80">
                {effectiveRole === "capex_head"
                  ? "Complete oversight of capital expenditure across all departments"
                  : isUserRole
                    ? "Track and manage your capital expenditure requests"
                    : "Process and manage all capital expenditure requests"}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button size="sm" onClick={handleRefresh} disabled={isRefreshing}
                className="h-8 sm:h-9 px-3 sm:px-4 text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-200" data-testid="refresh-btn">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setExportDialogOpen(true)}
                className="h-8 sm:h-9 px-3 sm:px-4 text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-200" data-testid="export-btn">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> FY Report
              </Button>
              <Button size="sm" onClick={() => setBulkUploadOpen(true)}
                className="h-8 sm:h-9 px-3 sm:px-4 text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-sm transition-all duration-200" data-testid="bulk-upload-btn">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk Upload
              </Button>
              {(effectiveRole === "user" || effectiveRole === "department_head" || effectiveRole === "process_engineering") && (
                <Link to="/requests/new">
                  <Button size="sm" className="h-8 sm:h-9 px-4 text-xs font-medium text-white shadow-lg transition-all duration-200"
                    style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))` }} data-testid="new-request-btn">
                    <Plus className="w-4 h-4 mr-1.5" /> New Request
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {isWidgetVisible('stats_cards') && (
            <div className={`grid gap-3 sm:gap-4 mt-6 grid-cols-2 ${effectiveRole === "buyer" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              <DashboardStatsCards
                effectiveRole={effectiveRole} user={user} allRequests={allRequests}
                formatCurrency={formatCurrency} hasAccess={hasAccess}
                buyerMetricFilter={buyerMetricFilter} setBuyerMetricFilter={setBuyerMetricFilter}
                setActiveTab={setActiveTab}
              />
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      <DashboardAnalytics
        effectiveRole={effectiveRole} allRequests={allRequests}
        formatCurrency={formatCurrency} hasAccess={hasAccess}
      />

      {/* Pending Tasks */}
      {isWidgetVisible('pending_tasks') && effectiveRole === "buyer" && (
        <DashboardPendingTasks
          user={user} allRequests={allRequests}
          pendingTaskFilter={pendingTaskFilter} setPendingTaskFilter={setPendingTaskFilter}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Requests Table */}
      {isWidgetVisible('recent_requests') && (
        <DashboardRequestsTable
          filteredRequests={filteredRequests} allRequests={allRequests}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} statuses={statuses}
          plantFilter={plantFilter} setPlantFilter={setPlantFilter} uniquePlants={uniquePlants}
          deptFilter={deptFilter} setDeptFilter={setDeptFilter} uniqueDepts={uniqueDepts}
          ceaFilter={ceaFilter} setCeaFilter={setCeaFilter}
          prFilter={prFilter} setPrFilter={setPrFilter}
          poFilter={poFilter} setPoFilter={setPoFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
          prPoSearch={prPoSearch} setPrPoSearch={setPrPoSearch}
          buyerFilter={buyerFilter} setBuyerFilter={setBuyerFilter} buyersList={buyersList}
          activeTab={activeTab} setActiveTab={setActiveTab}
          pendingTaskFilter={pendingTaskFilter} setPendingTaskFilter={setPendingTaskFilter}
          buyerMetricFilter={buyerMetricFilter} setBuyerMetricFilter={setBuyerMetricFilter}
          selectedRequests={selectedRequests} toggleSelectRequest={toggleSelectRequest} toggleSelectAll={toggleSelectAll}
          deleteDialogOpen={deleteDialogOpen} setDeleteDialogOpen={setDeleteDialogOpen}
          handleBulkDelete={handleBulkDelete} isDeleting={isDeleting}
          handleAssignBuyer={handleAssignBuyer}
          renderCEAStatus={renderCEAStatus} renderPRStatus={renderPRStatus} renderPOStatus={renderPOStatus}
          getDisplayDescription={getDisplayDescription}
          isBuyer={isBuyer} isDeptHead={isDeptHead} isUserRole={isUserRole}
          effectiveRole={effectiveRole} user={user}
        />
      )}

      {/* Export Dialog */}
      <DashboardExportDialog
        open={exportDialogOpen} onOpenChange={setExportDialogOpen}
        exportOptions={exportOptions} setExportOptions={setExportOptions}
        onExportToExcel={exportToExcel} onExportFYReport={exportFYReport}
      />

      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onUploadComplete={() => { fetchData(); }}
      />
    </div>
  );
}
