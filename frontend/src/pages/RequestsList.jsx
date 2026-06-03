import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  LayoutGrid,
  List,
  ChevronRight,
  Package,
  IndianRupee,
  MapPin
} from "lucide-react";

const statusConfig = {
  "Pending Approval": { color: "bg-amber-100 text-amber-800", icon: Clock },
  "Approved": { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  "Rejected": { color: "bg-rose-100 text-rose-800", icon: XCircle },
  "PR Processing": { color: "bg-blue-100 text-blue-800", icon: FileText },
  "PO Processing": { color: "bg-indigo-100 text-indigo-800", icon: FileText },
  "Under Commissioning": { color: "bg-purple-100 text-purple-800", icon: Building2 },
  "Completed": { color: "bg-slate-100 text-slate-800", icon: CheckCircle },
};

export default function RequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statuses, setStatuses] = useState([]);
  const [viewMode, setViewMode] = useState("cards"); // cards or table
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState("all");

  const canFilterByBuyer = user?.role === "buyer" || user?.role === "capex_head";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requests_to_fetch = [
          axios.get(`${API}/capex-requests`),
          axios.get(`${API}/reference/statuses`)
        ];
        
        // Fetch buyers list if user can filter by buyer
        if (canFilterByBuyer) {
          requests_to_fetch.push(axios.get(`${API}/users`));
        }
        
        const responses = await Promise.all(requests_to_fetch);
        setRequests(responses[0].data);
        setStatuses(responses[1].data);
        
        if (canFilterByBuyer && responses[2]) {
          const buyersList = responses[2].data.filter(u => u.role === "buyer");
          setBuyers(buyersList);
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [canFilterByBuyer]);

  // Group requests by plant and department
  const groupedData = useMemo(() => {
    const plantGroups = {};
    requests.forEach(req => {
      const plant = req.plant || "Unknown Plant";
      const dept = req.department || "Unknown Dept";
      if (!plantGroups[plant]) plantGroups[plant] = { departments: {}, total: 0, value: 0 };
      if (!plantGroups[plant].departments[dept]) plantGroups[plant].departments[dept] = { requests: [], value: 0 };
      plantGroups[plant].departments[dept].requests.push(req);
      plantGroups[plant].departments[dept].value += req.final_negotiated_price || 0;
      plantGroups[plant].total++;
      plantGroups[plant].value += req.final_negotiated_price || 0;
    });
    return plantGroups;
  }, [requests]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = 
      request.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requirement_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesPlant = !selectedPlant || request.plant === selectedPlant;
    const matchesDept = !selectedDept || request.department === selectedDept;
    const matchesBuyer = selectedBuyer === "all" || request.assigned_buyer_id === selectedBuyer;
    return matchesSearch && matchesStatus && matchesPlant && matchesDept && matchesBuyer;
  });

  const formatCurrency = (value) => {
    if (!value) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="requests-list-loading">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="requests-list">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by ID, description, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Buyer Filter - Only for Buyers and Capex Head */}
          {canFilterByBuyer && buyers.length > 0 && (
            <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
              <SelectTrigger className="w-full sm:w-48" data-testid="buyer-filter">
                <SelectValue placeholder="Filter by buyer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buyers</SelectItem>
                {buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>{buyer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
            <TabsList className="h-10">
              <TabsTrigger value="cards" className="px-3">
                <LayoutGrid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="px-3">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {(user?.role === "user" || user?.role === "department_head" || user?.role === "process_engineering") && (
          <Link to="/requests/new">
            <Button className="w-full sm:w-auto" data-testid="new-request-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </Link>
        )}
      </div>

      {/* Breadcrumb for card navigation */}
      {viewMode === "cards" && (selectedPlant || selectedDept) && (
        <div className="flex items-center gap-2 text-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => { setSelectedPlant(null); setSelectedDept(null); }}
          >
            All Plants
          </Button>
          {selectedPlant && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-7 text-xs ${!selectedDept ? 'bg-indigo-100 text-indigo-700' : ''}`}
                onClick={() => setSelectedDept(null)}
              >
                {selectedPlant}
              </Button>
            </>
          )}
          {selectedDept && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <Badge className="bg-indigo-100 text-indigo-700">{selectedDept}</Badge>
            </>
          )}
        </div>
      )}

      {/* Card View */}
      {viewMode === "cards" && !selectedPlant && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All Requests Summary Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50"
            onClick={() => setViewMode("table")}
            data-testid="all-requests-summary-card"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-cyan-600 font-medium uppercase tracking-wide">All Requests</p>
                  <p className="text-2xl font-bold text-cyan-800">{requests.length}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-white/70 rounded-lg p-2 border border-cyan-100">
                  <p className="text-slate-500">Pending</p>
                  <p className="font-bold text-amber-600">{requests.filter(r => r.status === "Pending Approval" || r.status === "PR Processing" || r.status === "PO Processing").length}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-cyan-100">
                  <p className="text-slate-500">Completed</p>
                  <p className="font-bold text-green-600">{requests.filter(r => r.status === "Completed").length}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-cyan-100">
                <span className="text-sm font-bold text-cyan-700">{formatCurrency(requests.reduce((s, r) => s + (r.final_negotiated_price || 0), 0))}</span>
                <div className="flex items-center gap-1 text-xs text-cyan-600">
                  <span>View all in table</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plant Cards */}
          {Object.entries(groupedData).map(([plant, data]) => {
            const plantRequests = Object.values(data.departments).flatMap(d => d.requests);
            const pendingCount = plantRequests.filter(r => r.status !== "Completed" && r.status !== "Rejected").length;
            const completedCount = plantRequests.filter(r => r.status === "Completed").length;
            
            return (
              <Card 
                key={plant}
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-200 bg-gradient-to-br from-white to-slate-50"
                onClick={() => setSelectedPlant(plant)}
                data-testid={`plant-card-${plant}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{plant}</p>
                        <p className="text-[10px] text-slate-500">{Object.keys(data.departments).length} Departments</p>
                      </div>
                    </div>
                    <Badge className="text-[9px] bg-slate-100 text-slate-600">{data.total} Requests</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-slate-500">Total</p>
                      <p className="font-bold text-slate-800">{data.total}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 text-center">
                      <p className="text-amber-600">In Progress</p>
                      <p className="font-bold text-amber-700">{pendingCount}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-green-600">Completed</p>
                      <p className="font-bold text-green-700">{completedCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(data.value)}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Department Cards (after selecting plant) */}
      {viewMode === "cards" && selectedPlant && !selectedDept && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedData[selectedPlant]?.departments || {}).map(([dept, data]) => {
            const pendingCount = data.requests.filter(r => r.status !== "Completed" && r.status !== "Rejected").length;
            const completedCount = data.requests.filter(r => r.status === "Completed").length;
            
            return (
              <Card 
                key={dept}
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-200 bg-gradient-to-br from-white to-slate-50"
                onClick={() => setSelectedDept(dept)}
                data-testid={`dept-card-${dept}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-md">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{dept}</p>
                        <p className="text-[10px] text-slate-500">{selectedPlant}</p>
                      </div>
                    </div>
                    <Badge className="text-[9px] bg-violet-100 text-violet-700">{data.requests.length} Requests</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-slate-500">Total</p>
                      <p className="font-bold text-slate-800">{data.requests.length}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 text-center">
                      <p className="text-amber-600">In Progress</p>
                      <p className="font-bold text-amber-700">{pendingCount}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-green-600">Completed</p>
                      <p className="font-bold text-green-700">{completedCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-1">
                      {data.requests.slice(0, 2).map(r => (
                        <Badge key={r.id} variant="outline" className="text-[8px]">{r.id}</Badge>
                      ))}
                      {data.requests.length > 2 && <Badge variant="outline" className="text-[8px]">+{data.requests.length - 2}</Badge>}
                    </div>
                    <span className="text-sm font-bold text-violet-600">{formatCurrency(data.value)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Cards (after selecting department) */}
      {viewMode === "cards" && selectedPlant && selectedDept && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map(req => {
            const StatusIcon = statusConfig[req.status]?.icon || Clock;
            const statusColor = statusConfig[req.status]?.color || "bg-slate-100 text-slate-800";
            return (
              <Link key={req.id} to={`/requests/${req.id}`} data-testid={`request-card-${req.id}`}>
                <Card className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all h-full border border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono font-bold text-indigo-600">{req.id}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(req.created_at)}</p>
                      </div>
                      <Badge className={statusColor}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {req.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-700 line-clamp-2 mb-3 min-h-[40px]">{req.requirement_description}</p>
                    
                    {/* PO/CEA Info */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                      <Package className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs text-indigo-700 font-medium">
                        {req.po_number ? `PO: ${req.po_number}` : req.cea_number ? `CEA: ${req.cea_number}` : "No PO/CEA"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-500">Department</p>
                        <p className="font-medium text-slate-800 truncate">{req.department}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2">
                        <p className="text-emerald-600">Value</p>
                        <p className="font-bold text-emerald-700">{formatCurrency(req.final_negotiated_price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-slate-500">{req.created_by_name || "—"}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg font-semibold font-['Outfit']">
            Capex Requests ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Request ID</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Plant</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const config = statusConfig[request.status] || statusConfig["Pending Approval"];
                    return (
                      <TableRow 
                        key={request.id} 
                        className="table-row-hover cursor-pointer"
                        data-testid={`request-row-${request.id}`}
                      >
                        <TableCell className="font-medium text-indigo-600">
                          {request.id}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.requirement_description}
                        </TableCell>
                        <TableCell>{request.plant}</TableCell>
                        <TableCell>{request.department}</TableCell>
                        <TableCell>
                          <Badge className={config.color}>{request.status}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatDate(request.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/requests/${request.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`view-${request.id}`}>
                              View
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="empty-state py-16">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No requests found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start by creating your first Capex request"
                }
              </p>
              {(user?.role === "user" || user?.role === "department_head") && !searchQuery && statusFilter === "all" && (
                <Link to="/requests/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Request
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
