import { useState, useEffect, useMemo } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { 
  Package, Plus, Loader2, CheckCircle, Clock, Truck, 
  Calendar, FileText, History, X, ArrowRight, LayoutGrid, List, ChevronRight, TestTube2, ChevronLeft
} from "lucide-react";

const statusConfig = {
  "Pending": { color: "bg-amber-100 text-amber-800", icon: Clock },
  "Under Preparation": { color: "bg-blue-100 text-blue-800", icon: Clock },
  "Ready for Pickup": { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  "Picked Up": { color: "bg-indigo-100 text-indigo-800", icon: Truck },
  "Dispatched": { color: "bg-purple-100 text-purple-800", icon: Truck },
  "Delivered": { color: "bg-green-100 text-green-800", icon: CheckCircle },
};

export default function SampleRequests() {
  const { user } = useAuth();
  const [samples, setSamples] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [prepareDialogOpen, setPrepareDialogOpen] = useState(false);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards"); // cards or table
  const [selectedCapexId, setSelectedCapexId] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid for cards
  
  // Role checks - defined early for use in fetchData
  const isBuyer = user?.role === "buyer";
  const isCapexHead = user?.role === "capex_head";
  const canFilterByBuyer = isCapexHead; // Only Capex Head can filter by buyer (Buyers see their own)
  
  // Create form data (Buyer)
  const [createFormData, setCreateFormData] = useState({
    capex_request_id: "",
    line_items: [{ material_description: "", number_of_samples: 1 }]
  });

  // Preparation form data (User)
  const [prepareFormData, setPrepareFormData] = useState({
    readiness_status: "",
    tentative_pickup_date: "",
    preparation_items: [{ material_code: "", description: "", number_of_samples: 1, box_type: "Wooden", weight: "" }],
    gate_pass_available: false,
    gate_pass_document_url: ""
  });

  // Pickup form data (Buyer)
  const [pickupFormData, setPickupFormData] = useState({
    pickup_date: "",
    dispatch_date: "",
    dispatch_reference: "",
    delivery_date: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const requests_to_fetch = [
        axios.get(`${API}/sample-requests`),
        axios.get(`${API}/capex-requests`)
      ];
      
      // Fetch buyers list if user is Capex Head
      if (canFilterByBuyer) {
        requests_to_fetch.push(axios.get(`${API}/users`));
      }
      
      const responses = await Promise.all(requests_to_fetch);
      
      // Filter samples to show only those created by the logged-in buyer
      const allSamples = responses[0].data;
      const filteredSamples = isBuyer 
        ? allSamples.filter(s => s.created_by === user?.id || s.created_by_name === user?.name)
        : allSamples;
      setSamples(filteredSamples);
      setRequests(responses[1].data.filter(r => r.status !== "Rejected" && r.status !== "Pending Approval"));
      
      if (canFilterByBuyer && responses[2]) {
        const buyersList = responses[2].data.filter(u => u.role === "buyer");
        setBuyers(buyersList);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add line item (Buyer create form)
  const addLineItem = () => {
    setCreateFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { material_description: "", number_of_samples: 1 }]
    }));
  };

  const removeLineItem = (index) => {
    if (createFormData.line_items.length > 1) {
      setCreateFormData(prev => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index)
      }));
    }
  };

  // Filter samples by selected buyer (for Capex Head)
  const filteredSamples = useMemo(() => {
    if (selectedBuyer === "all" || !canFilterByBuyer) return samples;
    const selectedBuyerData = buyers.find(b => b.id === selectedBuyer);
    if (!selectedBuyerData) return samples;
    return samples.filter(s => 
      s.created_by === selectedBuyer || 
      s.created_by_name === selectedBuyerData.name
    );
  }, [samples, selectedBuyer, buyers, canFilterByBuyer]);

  // Group samples by Capex Request ID
  const groupedByCapex = useMemo(() => {
    const groups = {};
    filteredSamples.forEach(sample => {
      const capexId = sample.capex_request_id;
      if (!groups[capexId]) {
        // Find the capex request to get PO number
        const capexReq = requests.find(r => r.id === capexId);
        groups[capexId] = {
          capexId,
          poNumber: capexReq?.po_number || "N/A",
          department: capexReq?.department || "N/A",
          plant: capexReq?.plant || "N/A",
          samples: [],
          totalItems: 0,
          pendingCount: 0,
          deliveredCount: 0
        };
      }
      groups[capexId].samples.push(sample);
      groups[capexId].totalItems += sample.line_items?.length || 0;
      if (sample.status === "Delivered") {
        groups[capexId].deliveredCount++;
      } else {
        groups[capexId].pendingCount++;
      }
    });
    return groups;
  }, [filteredSamples, requests]);

  // Filter samples by selected Capex ID (for card navigation)
  const displaySamples = selectedCapexId 
    ? filteredSamples.filter(s => s.capex_request_id === selectedCapexId)
    : filteredSamples;

  // Pagination logic
  const totalPages = Math.ceil(displaySamples.length / itemsPerPage);
  const paginatedSamples = displaySamples.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBuyer, selectedCapexId]);

  const updateLineItem = (index, field, value) => {
    setCreateFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Add preparation item (User preparation form)
  const addPrepItem = () => {
    setPrepareFormData(prev => ({
      ...prev,
      preparation_items: [...prev.preparation_items, { material_code: "", description: "", number_of_samples: 1, box_type: "Wooden", weight: "" }]
    }));
  };

  const removePrepItem = (index) => {
    if (prepareFormData.preparation_items.length > 1) {
      setPrepareFormData(prev => ({
        ...prev,
        preparation_items: prev.preparation_items.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePrepItem = (index, field, value) => {
    setPrepareFormData(prev => ({
      ...prev,
      preparation_items: prev.preparation_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Create sample request (Buyer)
  const handleCreate = async () => {
    if (!createFormData.capex_request_id) {
      toast.error("Please select a Capex request");
      return;
    }
    if (createFormData.line_items.some(item => !item.material_description || !item.number_of_samples)) {
      toast.error("Please fill in all line items");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API}/sample-requests`, createFormData);
      toast.success("Sample request created");
      setCreateDialogOpen(false);
      setCreateFormData({
        capex_request_id: "",
        line_items: [{ material_description: "", number_of_samples: 1 }]
      });
      fetchData();
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        toast.error(errorDetail.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error("Failed to create sample request");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update preparation status (User)
  const handlePrepare = async () => {
    if (!prepareFormData.readiness_status) {
      toast.error("Please select readiness status");
      return;
    }

    if (prepareFormData.readiness_status === "Under Preparation" && !prepareFormData.tentative_pickup_date) {
      toast.error("Please select tentative pickup date");
      return;
    }

    if (prepareFormData.readiness_status === "Ready for Pickup") {
      if (prepareFormData.preparation_items.some(item => !item.description || !item.number_of_samples || !item.box_type)) {
        toast.error("Please fill in all preparation item details");
        return;
      }
    }

    // Clean up preparation_items - convert empty weight to null
    const cleanedFormData = {
      ...prepareFormData,
      preparation_items: prepareFormData.preparation_items.map(item => ({
        ...item,
        weight: item.weight === "" || item.weight === null || item.weight === undefined ? null : parseFloat(item.weight)
      }))
    };

    setIsSubmitting(true);
    try {
      await axios.put(`${API}/sample-requests/${selectedSample.id}/preparation`, cleanedFormData);
      toast.success("Sample preparation updated");
      setPrepareDialogOpen(false);
      fetchData();
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        toast.error(errorDetail.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error("Failed to update preparation");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update pickup/dispatch (Buyer)
  const handlePickup = async () => {
    if (!pickupFormData.pickup_date && !pickupFormData.dispatch_date) {
      toast.error("Please enter pickup or dispatch date");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`${API}/sample-requests/${selectedSample.id}/pickup`, pickupFormData);
      toast.success("Pickup status updated");
      setPickupDialogOpen(false);
      fetchData();
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        toast.error(errorDetail.map(e => e.msg || String(e)).join(', '));
      } else {
        toast.error("Failed to update pickup");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // View activity log
  const viewActivityLog = async (sample) => {
    try {
      const response = await axios.get(`${API}/sample-requests/${sample.id}/activity-log`);
      setActivityLog(response.data.activity_log || []);
      setSelectedSample(sample);
      setActivityDialogOpen(true);
    } catch (error) {
      toast.error("Failed to load activity log");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const canCreate = user?.role === "buyer" || user?.role === "capex_head";
  const isUserRole = user?.role === "user" || user?.role === "department_head" || user?.role === "process_engineering";
  const isBuyerRole = user?.role === "buyer" || user?.role === "capex_head";

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="sample-requests-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sample-requests">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-['Outfit']">Sample Requests</h1>
          <p className="text-slate-500">
            {isBuyerRole ? "Request and track samples for Capex projects" : "Create and prepare sample requests for your Capex projects"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Buyer Filter - Only for Capex Head */}
          {canFilterByBuyer && buyers.length > 0 && (
            <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
              <SelectTrigger className="w-44" data-testid="buyer-filter">
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
            <TabsList className="h-9">
              <TabsTrigger value="cards" className="px-3">
                <LayoutGrid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="px-3">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {canCreate && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-sample-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  New Sample Request
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Sample Request</DialogTitle>
                <DialogDescription>Request samples from the user (multiple items allowed)</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Capex Request *</Label>
                  <Select
                    value={createFormData.capex_request_id}
                    onValueChange={(v) => setCreateFormData(prev => ({ ...prev, capex_request_id: v }))}
                  >
                    <SelectTrigger data-testid="capex-select">
                      <SelectValue placeholder="Select request" />
                    </SelectTrigger>
                    <SelectContent>
                      {requests.map((req) => (
                        <SelectItem key={req.id} value={req.id}>
                          {req.id} - {req.requirement_description?.substring(0, 30)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />
                <Label className="text-sm font-semibold">Sample Line Items</Label>
                
                {createFormData.line_items.map((item, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Item {index + 1}</span>
                      {createFormData.line_items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Material Description *</Label>
                      <Input
                        value={item.material_description}
                        onChange={(e) => updateLineItem(index, "material_description", e.target.value)}
                        placeholder="Describe the sample material"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Samples *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.number_of_samples}
                        onChange={(e) => updateLineItem(index, "number_of_samples", parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addLineItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Item
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isSubmitting} data-testid="submit-sample-btn">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>

      {/* Breadcrumb for card navigation */}
      {viewMode === "cards" && selectedCapexId && (
        <div className="flex items-center gap-2 text-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => setSelectedCapexId(null)}
          >
            All Capex Requests
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Badge className="bg-indigo-100 text-indigo-700">{selectedCapexId}</Badge>
        </div>
      )}

      {/* Card View - Grouped by Capex Request */}
      {viewMode === "cards" && !selectedCapexId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Summary Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-all border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50"
            onClick={() => setViewMode("table")}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <TestTube2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-cyan-600 font-medium uppercase tracking-wide">All Samples</p>
                  <p className="text-2xl font-bold text-cyan-800">{filteredSamples.length}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-white/70 rounded-lg p-2 border border-cyan-100">
                  <p className="text-slate-500">Pending</p>
                  <p className="font-bold text-amber-600">{filteredSamples.filter(s => s.status !== "Delivered").length}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-cyan-100">
                  <p className="text-slate-500">Delivered</p>
                  <p className="font-bold text-green-600">{filteredSamples.filter(s => s.status === "Delivered").length}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-cyan-100">
                <span className="text-xs text-cyan-600">View all in table</span>
                <ArrowRight className="w-4 h-4 text-cyan-500" />
              </div>
            </CardContent>
          </Card>

          {/* Capex Request Cards */}
          {Object.values(groupedByCapex).map((group) => (
            <Card 
              key={group.capexId}
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-200 bg-gradient-to-br from-white to-slate-50"
              onClick={() => setSelectedCapexId(group.capexId)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-indigo-700">{group.capexId}</p>
                      <p className="text-[10px] text-slate-500">{group.department}</p>
                    </div>
                  </div>
                  <Badge className="text-[9px] bg-slate-100 text-slate-600">{group.plant}</Badge>
                </div>
                
                {/* PO Number */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-violet-50 rounded-lg border border-violet-100">
                  <Package className="w-4 h-4 text-violet-500" />
                  <span className="text-xs text-violet-700 font-medium">PO: {group.poNumber}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-slate-500">Samples</p>
                    <p className="font-bold text-slate-800">{group.samples.length}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center">
                    <p className="text-amber-600">Pending</p>
                    <p className="font-bold text-amber-700">{group.pendingCount}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-green-600">Delivered</p>
                    <p className="font-bold text-green-700">{group.deliveredCount}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex gap-1">
                    {group.samples.slice(0, 2).map(s => (
                      <Badge key={s.id} variant="outline" className="text-[8px]">{s.id}</Badge>
                    ))}
                    {group.samples.length > 2 && (
                      <Badge variant="outline" className="text-[8px]">+{group.samples.length - 2}</Badge>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sample Cards for Selected Capex ID */}
      {viewMode === "cards" && selectedCapexId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSamples.map((sample) => {
            const config = statusConfig[sample.status] || statusConfig.Pending;
            const Icon = config.icon;
            return (
              <Card 
                key={sample.id}
                className="hover:shadow-lg transition-all border border-slate-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-indigo-600">{sample.id}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(sample.created_at)}</p>
                    </div>
                    <Badge className={config.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {sample.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Items:</span>
                      <span className="font-medium">{sample.line_items?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Requested by:</span>
                      <span className="font-medium">{sample.requested_by_name}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-7 text-[10px]"
                      onClick={() => { setSelectedSample(sample); setViewDetailsDialogOpen(true); }}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px]"
                      onClick={() => viewActivityLog(sample)}
                    >
                      <History className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Sample Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedSamples.length > 0 ? (
            <>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Capex Request</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSamples.map((sample) => {
                  const config = statusConfig[sample.status] || statusConfig.Pending;
                  const Icon = config.icon;
                  return (
                    <TableRow key={sample.id} data-testid={`sample-row-${sample.id}`}>
                      <TableCell className="font-medium text-indigo-600">{sample.id}</TableCell>
                      <TableCell>{sample.capex_request_id}</TableCell>
                      <TableCell>{sample.line_items?.length || 0} item(s)</TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <Icon className="w-3 h-3 mr-1" />
                          {sample.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sample.created_by_name}</TableCell>
                      <TableCell className="text-slate-500">{formatDate(sample.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* User/Requestor: Prepare button - for users who can prepare samples */}
                          {isUserRole && (sample.status === "Pending" || sample.status === "Under Preparation") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSample(sample);
                                setPrepareFormData({
                                  readiness_status: sample.readiness_status || "",
                                  tentative_pickup_date: sample.tentative_pickup_date || "",
                                  preparation_items: sample.preparation_items?.length > 0 
                                    ? sample.preparation_items 
                                    : [{ material_code: "", description: "", number_of_samples: 1, box_type: "Wooden", weight: "" }],
                                  gate_pass_available: sample.gate_pass_available || false,
                                  gate_pass_document_url: sample.gate_pass_document_url || ""
                                });
                                setPrepareDialogOpen(true);
                              }}
                              data-testid={`prepare-${sample.id}`}
                            >
                              Prepare
                            </Button>
                          )}

                          {/* Buyer: View Details button - when Ready for Pickup or later */}
                          {isBuyerRole && (sample.status === "Ready for Pickup" || sample.status === "Picked Up" || sample.status === "Dispatched") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-indigo-600 border-indigo-200"
                              onClick={() => {
                                setSelectedSample(sample);
                                setViewDetailsDialogOpen(true);
                              }}
                              data-testid={`view-details-${sample.id}`}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Details
                            </Button>
                          )}

                          {/* Buyer/Capex Head: Pickup button */}
                          {isBuyerRole && sample.status === "Ready for Pickup" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200"
                              onClick={() => {
                                setSelectedSample(sample);
                                setPickupFormData({
                                  pickup_date: sample.pickup_date || "",
                                  dispatch_date: sample.dispatch_date || "",
                                  dispatch_reference: sample.dispatch_reference || "",
                                  delivery_date: sample.delivery_date || ""
                                });
                                setPickupDialogOpen(true);
                              }}
                              data-testid={`pickup-${sample.id}`}
                            >
                              Pickup
                            </Button>
                          )}

                          {/* Buyer/Capex Head: Dispatch button */}
                          {isBuyerRole && sample.status === "Picked Up" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-200"
                              onClick={() => {
                                setSelectedSample(sample);
                                setPickupFormData({
                                  pickup_date: sample.pickup_date || "",
                                  dispatch_date: "",
                                  dispatch_reference: "",
                                  delivery_date: ""
                                });
                                setPickupDialogOpen(true);
                              }}
                              data-testid={`dispatch-${sample.id}`}
                            >
                              Dispatch
                            </Button>
                          )}

                          {/* Buyer/Capex Head: Update Delivery button */}
                          {isBuyerRole && sample.status === "Dispatched" && !sample.delivery_date && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-200"
                              onClick={() => {
                                setSelectedSample(sample);
                                setPickupFormData({
                                  pickup_date: sample.pickup_date || "",
                                  dispatch_date: sample.dispatch_date || "",
                                  dispatch_reference: sample.dispatch_reference || "",
                                  delivery_date: ""
                                });
                                setPickupDialogOpen(true);
                              }}
                              data-testid={`delivery-${sample.id}`}
                            >
                              Delivery
                            </Button>
                          )}

                          {/* Activity Log - visible to all */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewActivityLog(sample)}
                            data-testid={`activity-${sample.id}`}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-slate-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, displaySamples.length)} of {displaySamples.length} samples
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <Button
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-9 h-9"
                          >
                            {pageNum}
                          </Button>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
          ) : (
            <div className="empty-state py-16">
              <Package className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">No sample requests</h3>
              <p className="text-slate-500">
                {canCreate ? "Create your first sample request" : "No sample requests available"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* User Preparation Dialog */}
      <Dialog open={prepareDialogOpen} onOpenChange={setPrepareDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sample Preparation - {selectedSample?.id}</DialogTitle>
            <DialogDescription>Update sample readiness status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Readiness Status *</Label>
              <Select
                value={prepareFormData.readiness_status}
                onValueChange={(v) => setPrepareFormData(prev => ({ ...prev, readiness_status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Under Preparation">Under Preparation</SelectItem>
                  <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {prepareFormData.readiness_status === "Under Preparation" && (
              <div className="space-y-2">
                <Label>Tentative Pickup Date *</Label>
                <Input
                  type="date"
                  value={prepareFormData.tentative_pickup_date}
                  onChange={(e) => setPrepareFormData(prev => ({ ...prev, tentative_pickup_date: e.target.value }))}
                />
              </div>
            )}

            {prepareFormData.readiness_status === "Ready for Pickup" && (
              <>
                <Separator />
                <Label className="text-sm font-semibold">Sample Details (Multiple Items)</Label>
                
                {prepareFormData.preparation_items.map((item, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-600">Sample Item {index + 1}</span>
                      {prepareFormData.preparation_items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removePrepItem(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Material Code</Label>
                        <Input
                          value={item.material_code}
                          onChange={(e) => updatePrepItem(index, "material_code", e.target.value)}
                          placeholder="Enter code"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updatePrepItem(index, "description", e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Number of Samples *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.number_of_samples}
                          onChange={(e) => updatePrepItem(index, "number_of_samples", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Box Type *</Label>
                        <Select
                          value={item.box_type}
                          onValueChange={(v) => updatePrepItem(index, "box_type", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Wooden">Wooden</SelectItem>
                            <SelectItem value="Corrugated">Corrugated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Weight (kg) - Optional</Label>
                        <Input
                          type="number"
                          value={item.weight}
                          onChange={(e) => updatePrepItem(index, "weight", e.target.value)}
                          placeholder="Enter weight"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addPrepItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Sample Item
                </Button>

                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="gate_pass"
                      checked={prepareFormData.gate_pass_available}
                      onChange={(e) => setPrepareFormData(prev => ({ ...prev, gate_pass_available: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="gate_pass">Gate Pass Available</Label>
                  </div>
                  
                  {prepareFormData.gate_pass_available && (
                    <div className="space-y-2 pl-7">
                      <Label className="text-xs">Upload Gate Pass Document</Label>
                      <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" />
                      <p className="text-xs text-slate-500">Upload gate pass document (PDF, DOC, Image)</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrepareDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePrepare} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buyer Pickup/Dispatch/Delivery Dialog */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSample?.status === "Dispatched" ? "Update Delivery" : 
               selectedSample?.status === "Picked Up" ? "Dispatch Sample" : "Pickup Sample"} - {selectedSample?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedSample?.status === "Dispatched" ? "Update delivery date" :
               selectedSample?.status === "Picked Up" ? "Update dispatch details" : "Update pickup details"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSample?.status === "Ready for Pickup" && (
              <div className="space-y-2">
                <Label>Pickup Date *</Label>
                <Input
                  type="date"
                  value={pickupFormData.pickup_date}
                  onChange={(e) => setPickupFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
                />
              </div>
            )}
            
            {selectedSample?.status === "Picked Up" && (
              <>
                <div className="space-y-2">
                  <Label>Dispatch Date *</Label>
                  <Input
                    type="date"
                    value={pickupFormData.dispatch_date}
                    onChange={(e) => setPickupFormData(prev => ({ ...prev, dispatch_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dispatch Reference</Label>
                  <Input
                    value={pickupFormData.dispatch_reference}
                    onChange={(e) => setPickupFormData(prev => ({ ...prev, dispatch_reference: e.target.value }))}
                    placeholder="Enter dispatch reference number"
                  />
                </div>
              </>
            )}

            {selectedSample?.status === "Dispatched" && (
              <div className="space-y-2">
                <Label>Delivery Date *</Label>
                <Input
                  type="date"
                  value={pickupFormData.delivery_date}
                  onChange={(e) => setPickupFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePickup} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog - For Buyers to see User preparation details */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Sample Details - {selectedSample?.id}
            </DialogTitle>
            <DialogDescription>
              For Capex Request: {selectedSample?.capex_request_id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status and Dates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase">Status</p>
                <Badge className={statusConfig[selectedSample?.status]?.color || "bg-slate-100"}>
                  {selectedSample?.status}
                </Badge>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase">Requested Date</p>
                <p className="font-medium text-sm">{formatDate(selectedSample?.sample_requested_date || selectedSample?.created_at)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase">Tentative Pickup</p>
                <p className="font-medium text-sm">{selectedSample?.tentative_pickup_date || "—"}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-[10px] text-slate-500 uppercase">Gate Pass</p>
                <p className="font-medium text-sm">{selectedSample?.gate_pass_available ? "Available" : "Not Available"}</p>
              </div>
            </div>

            {/* Requested Items */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Requested Items ({selectedSample?.line_items?.length || 0})
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs">Material Description</TableHead>
                      <TableHead className="text-xs">No. of Samples</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSample?.line_items?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{item.material_description}</TableCell>
                        <TableCell className="text-sm">{item.number_of_samples}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Preparation Details (filled by User) */}
            {selectedSample?.preparation_items?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Preparation Details (by User)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-50">
                        <TableHead className="text-xs">Material Code</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs">Samples</TableHead>
                        <TableHead className="text-xs">Box Type</TableHead>
                        <TableHead className="text-xs">Weight (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSample?.preparation_items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm font-mono">{item.material_code || "—"}</TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-sm">{item.number_of_samples}</TableCell>
                          <TableCell className="text-sm">{item.box_type}</TableCell>
                          <TableCell className="text-sm">{item.weight || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Dispatch & Delivery Details */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Dispatch & Delivery Details
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-[10px] text-blue-600 uppercase">Pickup Date</p>
                  <p className="font-medium text-sm">{selectedSample?.pickup_date || "—"}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-[10px] text-purple-600 uppercase">Dispatch Date</p>
                  <p className="font-medium text-sm">{selectedSample?.dispatch_date || "—"}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-[10px] text-indigo-600 uppercase">Reference No.</p>
                  <p className="font-medium text-sm">{selectedSample?.dispatch_reference || "—"}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-[10px] text-green-600 uppercase">Delivery Date</p>
                  <p className="font-medium text-sm">{selectedSample?.delivery_date || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Sample Activity Log - {selectedSample?.id}
            </DialogTitle>
            <DialogDescription>Complete tracking history</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {activityLog.length > 0 ? (
              <div className="space-y-4">
                {activityLog.map((entry, index) => (
                  <div key={index} className="timeline-item">
                    <div className={`timeline-dot ${index === 0 ? "active" : ""}`} />
                    <div className="ml-2">
                      <p className="font-medium text-slate-900">{entry.action}</p>
                      {entry.details && (
                        <p className="text-sm text-slate-600">{entry.details}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        by {entry.by} • {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">No activity recorded</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
