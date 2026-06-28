import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import { useAccessControl } from "@/hooks/useAccessControl";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, XCircle, FileText, Package,
  MessageSquare, Send, Loader2, AlertCircle, Upload,
  Truck, Building2, Download, File, ExternalLink, RefreshCw, Trash2, Clock, Check, TestTube2, Plus
} from "lucide-react";
import { RequestDetailDialogs } from "@/components/detail/RequestDetailDialogs";
import { RequestDetailSidebar } from "@/components/detail/RequestDetailSidebar";

const statusColors = {
  "Pending Approval": "bg-amber-100 text-amber-800",
  "Approved": "bg-emerald-100 text-emerald-800",
  "Rejected": "bg-rose-100 text-rose-800",
  "CEA Processing": "bg-blue-100 text-blue-800",
  "PR Processing": "bg-blue-100 text-blue-800",
  "PO Processing": "bg-indigo-100 text-indigo-800",
  "DAP Approval Pending": "bg-violet-100 text-violet-800",
  "Sample Requested": "bg-cyan-100 text-cyan-800",
  "Sample Ready for Dispatch": "bg-cyan-100 text-cyan-800",
  "PDI": "bg-purple-100 text-purple-800",
  "Under Dispatch": "bg-orange-100 text-orange-800",
  "Dispatched": "bg-orange-100 text-orange-800",
  "Delivery": "bg-teal-100 text-teal-800",
  "Installation in Progress": "bg-pink-100 text-pink-800",
  "Completed": "bg-slate-800 text-white",
};

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasAccess } = useAccessControl();
  const [request, setRequest] = useState(null);
  const [comments, setComments] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [dap, setDap] = useState(null);
  const [sampleRequests, setSampleRequests] = useState([]);
  const [selectedSampleForDetails, setSelectedSampleForDetails] = useState(null);
  const [newSampleDialogOpen, setNewSampleDialogOpen] = useState(false);
  const [newSampleItems, setNewSampleItems] = useState([{ material_description: "", number_of_samples: 1 }]);
  const [isCreatingSample, setIsCreatingSample] = useState(false);

  // Under Preparation dialog state
  const [underPrepDialog, setUnderPrepDialog] = useState({ open: false, sampleId: null });
  const [expectedReadinessDate, setExpectedReadinessDate] = useState("");

  // Ready for Dispatch dialog state
  const [dispatchDialog, setDispatchDialog] = useState({ open: false, sampleId: null, lineItems: [] });
  const [dispatchItems, setDispatchItems] = useState([]);
  const [gatePassAvailable, setGatePassAvailable] = useState(false);
  const [gatePassUploading, setGatePassUploading] = useState(false);
  const [gatePassUrl, setGatePassUrl] = useState("");
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);

  // Buyer decision dialog state
  const [buyerDecisionDialog, setBuyerDecisionDialog] = useState({ open: false, sampleId: null, gatePassAvailable: false });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prStages, setPrStages] = useState([]);
  const [poStages, setPoStages] = useState([]);
  const [ceaApprovalStages, setCeaApprovalStages] = useState([
    "Capex Head", "Department Head", "CTO", "Manufacturing Head", 
    "Operation Head", "Budget", "CFO", "Approved"
  ]);
  
  // DAP dialog states
  const [dapDialogOpen, setDapDialogOpen] = useState(false);
  const [dapApprovalDialogOpen, setDapApprovalDialogOpen] = useState(false);
  const [dapApprovalAction, setDapApprovalAction] = useState("");
  const [dapComment, setDapComment] = useState("");
  const [dapChangeType, setDapChangeType] = useState("");
  
  // Selected requirement for multi-PR dropdown (Buyer view)
  const [selectedRequirementIndex, setSelectedRequirementIndex] = useState(0);

  const isUserRole = user?.role === "user";
  const canProcess = user?.role === "buyer" || user?.role === "capex_head";
  const canUpdatePreparation = ["user", "department_head", "process_engineering"].includes(user?.role);
  const canApproveRequest = (user?.role === "department_head" || user?.role === "capex_head") && 
    (request?.status === "Pending Approval" || request?.status === "Pending DH Approval");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [requestRes, commentsRes, buyersRes, prRes, poRes, samplesRes] = await Promise.all([
        axios.get(`${API}/capex-requests/${id}`),
        axios.get(`${API}/comments?capex_request_id=${id}`),
        axios.get(`${API}/users/buyers`),
        axios.get(`${API}/reference/pr-stages`),
        axios.get(`${API}/reference/po-stages`),
        axios.get(`${API}/sample-requests?capex_request_id=${id}`)
      ]);
      setRequest(requestRes.data);
      setComments(commentsRes.data);
      setBuyers(buyersRes.data);
      setPrStages(prRes.data);
      setPoStages(poRes.data);
      setSampleRequests(samplesRes.data);

      if (requestRes.data.dap_id) {
        const dapRes = await axios.get(`${API}/dap/${requestRes.data.dap_id}`);
        setDap(dapRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load request details");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRequest = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.get(`${API}/capex-requests/${id}`);
      setRequest(response.data);
      if (response.data.dap_id) {
        const dapRes = await axios.get(`${API}/dap/${response.data.dap_id}`);
        setDap(dapRes.data);
      }
      const samplesRes = await axios.get(`${API}/sample-requests?capex_request_id=${id}`);
      setSampleRequests(samplesRes.data);
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/capex-requests/${id}/approve`);
      toast.success("Request approved successfully");
      refreshRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (reason) => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/capex-requests/${id}/reject?reason=${encodeURIComponent(reason)}`);
      toast.success("Request rejected");
      refreshRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (updateData) => {
    try {
      await axios.put(`${API}/capex-requests/${id}`, updateData);
      refreshRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update");
    }
  };

  // Update a specific requirement item (for multi-PR workflows)
  const handleUpdateRequirementItem = async (itemIndex, itemUpdateData) => {
    if (!request.requirement_items) return;
    
    const updatedItems = [...request.requirement_items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...itemUpdateData };
    
    try {
      await axios.put(`${API}/capex-requests/${id}`, { requirement_items: updatedItems });
      refreshRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update");
    }
  };

  // Check if we have multiple requirement items
  const hasMultipleItems = request?.requirement_items && request.requirement_items.length > 1;
  const selectedItem = hasMultipleItems ? request?.requirement_items?.[selectedRequirementIndex] : null;

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/comments`, { capex_request_id: id, content: newComment });
      setComments(prev => [...prev, response.data]);
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // DAP Functions
  const handleCreateDap = async () => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/dap`, { capex_request_id: id, documents: [] });
      toast.success("DAP created - awaiting approvals");
      setDapDialogOpen(false);
      refreshRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create DAP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDapApproval = async () => {
    if (dapApprovalAction === "request_changes" && !dapComment) {
      toast.error("Please provide a comment for changes required");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.put(`${API}/dap/${dap.id}/approve`, { action: dapApprovalAction, comment: dapComment, change_type: dapChangeType });
      toast.success(dapApprovalAction === "approve" ? "DAP approved" : "Changes requested");
      setDapApprovalDialogOpen(false);
      setDapComment("");
      setDapChangeType("");
      refreshRequest();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update DAP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    setIsSubmitting(true);
    try {
      await axios.delete(`${API}/capex-requests/${id}`);
      toast.success("Request deleted successfully");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sample pickup update (for buyers)
  const handleSamplePickupUpdate = async (sampleId, updateData) => {
    try {
      await axios.put(`${API}/sample-requests/${sampleId}/pickup`, updateData);
      toast.success("Sample pickup details updated");
      // Refresh sample requests
      const samplesRes = await axios.get(`${API}/sample-requests?capex_request_id=${id}`);
      setSampleRequests(samplesRes.data);
      // Update the selected sample for details dialog
      if (selectedSampleForDetails?.id === sampleId) {
        const updated = samplesRes.data.find(s => s.id === sampleId);
        if (updated) setSelectedSampleForDetails(updated);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update sample");
    }
  };

  // Handle new sample request creation
  const handleCreateSample = async () => {
    const validItems = newSampleItems.filter(i => i.material_description.trim());
    if (validItems.length === 0) { toast.error("Add at least one item with a description"); return; }
    setIsCreatingSample(true);
    try {
      await axios.post(`${API}/sample-requests`, {
        capex_request_id: id,
        line_items: validItems,
      });
      toast.success("Sample request created successfully");
      setNewSampleDialogOpen(false);
      setNewSampleItems([{ material_description: "", number_of_samples: 1 }]);
      const samplesRes = await axios.get(`${API}/sample-requests?capex_request_id=${id}`);
      setSampleRequests(samplesRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create sample request");
    } finally {
      setIsCreatingSample(false);
    }
  };

  // Handle "Under Preparation" submit with date
  const handleUnderPrepSubmit = async () => {
    if (!expectedReadinessDate) { toast.error("Please select expected readiness date"); return; }
    try {
      await axios.put(`${API}/sample-requests/${underPrepDialog.sampleId}/preparation`, {
        readiness_status: "Under Preparation",
        expected_readiness_date: expectedReadinessDate,
      });
      toast.success("Sample marked as Under Preparation");
      setUnderPrepDialog({ open: false, sampleId: null });
      setExpectedReadinessDate("");
      const samplesRes = await axios.get(`${API}/sample-requests?capex_request_id=${id}`);
      setSampleRequests(samplesRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update sample");
    }
  };

  // Handle "Ready for Dispatch" submit with full form
  const handleDispatchSubmit = async () => {
    const validItems = dispatchItems.filter(i => i.description.trim());
    if (validItems.length === 0) { toast.error("Fill at least one item description"); return; }
    setIsSubmittingDispatch(true);
    try {
      await axios.put(`${API}/sample-requests/${dispatchDialog.sampleId}/preparation`, {
        readiness_status: "Ready for Pickup",
        preparation_items: validItems.map(i => ({
          description: i.description,
          material_code: i.material_code,
          number_of_samples: i.number_of_samples,
          type_of_packing: i.type_of_packing,
        })),
        gate_pass_available: gatePassAvailable,
        gate_pass_document_url: gatePassUrl || null,
      });
      toast.success("Sample marked as Ready for Dispatch");
      setDispatchDialog({ open: false, sampleId: null, lineItems: [] });
      setDispatchItems([]);
      setGatePassAvailable(false);
      setGatePassUrl("");
      const samplesRes = await axios.get(`${API}/sample-requests?capex_request_id=${id}`);
      setSampleRequests(samplesRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update");
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Handle gate pass file upload
  const handleGatePassUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGatePassUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", "gate_pass");
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGatePassUrl(res.data.url || res.data.file_id);
      toast.success("Gate pass uploaded");
    } catch {
      toast.error("Failed to upload gate pass");
    } finally {
      setGatePassUploading(false);
    }
  };

  // Buyer decision handler (Job Work Challan / Gate Pass)
  const handleBuyerDecision = async (decision) => {
    try {
      await axios.put(`${API}/sample-requests/${buyerDecisionDialog.sampleId}/pickup`, {
        buyer_decision: decision,
      });
      toast.success(`Selected: ${decision}`);
      setBuyerDecisionDialog({ open: false, sampleId: null, gatePassAvailable: false });
      const samplesRes = await axios.get(`${API}/sample-requests?capex_request_id=${id}`);
      setSampleRequests(samplesRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="request-detail-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium">Request not found</h3>
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" data-testid="request-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-['Outfit']">{request.id}</h1>
              <Badge className={statusColors[request.status] || "bg-slate-100 text-slate-800"}>
                {request.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">by {request.user_name} • {formatDate(request.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshRequest}
            disabled={isRefreshing}
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Delete Button - Available to all roles */}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={isSubmitting} data-testid="delete-btn">
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Request</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this request? This action cannot be undone and will also delete all related comments, sample requests, and DAP documents.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteRequest} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Delete Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {canApproveRequest && (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="approve-btn">
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={isSubmitting} data-testid="reject-btn">
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Request</DialogTitle>
                  </DialogHeader>
                  <Textarea id="reject-reason" placeholder="Rejection reason..." className="min-h-[80px]" />
                  <DialogFooter>
                    <Button variant="destructive" onClick={() => handleReject(document.getElementById("reject-reason").value)}>
                      Confirm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Single Unified View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Request Details */}
          <Card className="border-2 border-slate-200 shadow-md">
            <CardHeader className="py-3 bg-gradient-to-r from-slate-50 to-white border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-600 flex items-center justify-center">
                  <FileText className="w-3 h-3 text-white" />
                </div>
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-2 bg-slate-50 rounded">
                  <Label className="text-[10px] text-slate-500 uppercase">Plant</Label>
                  <p className="font-medium">{request.plant}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <Label className="text-[10px] text-slate-500 uppercase">Department</Label>
                  <p className="font-medium">{request.department}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <Label className="text-[10px] text-slate-500 uppercase">Type</Label>
                  <p className="font-medium">{request.requirement_type || "—"}</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded">
                  <Label className="text-[10px] text-indigo-600 uppercase">Asset Category</Label>
                  <p className="font-medium text-indigo-700">
                    {request.asset_category === "plant_machinery" ? "Plant & Machinery" : 
                     request.asset_category === "building" ? "Building" : "—"}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <Label className="text-[10px] text-slate-500 uppercase">CEA Required</Label>
                  <p className={`font-medium ${request.cea_required ? "text-emerald-600" : "text-slate-500"}`}>
                    {request.cea_required ? "Yes" : "No"}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <Label className="text-[10px] text-slate-500 uppercase">DAP Required</Label>
                  <p className={`font-medium ${request.dap_required ? "text-emerald-600" : "text-slate-500"}`}>
                    {request.dap_required ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* DH Approval Status */}
              {hasAccess('capex_request', 'dh_approval') && request.status === "Pending DH Approval" && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200" data-testid="dh-pending-banner">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-xs text-amber-800">Pending Department Head Approval</span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1">This request needs to be approved by the Department Head before it can be processed by buyers.</p>
                </div>
              )}
              {hasAccess('capex_request', 'dh_approval') && request.status === "Rejected by DH" && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200" data-testid="dh-rejected-banner">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span className="font-semibold text-xs text-rose-800">Rejected by Department Head</span>
                  </div>
                  {request.dh_rejection_reason && (
                    <p className="text-[10px] text-rose-600 mt-1">Reason: {request.dh_rejection_reason}</p>
                  )}
                </div>
              )}
              {request.dh_approval_status === "Approved" && (
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2" data-testid="dh-approved-badge">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] text-emerald-700 font-medium">DH Approved {request.dh_approved_at ? `on ${new Date(request.dh_approved_at).toLocaleDateString()}` : ''}</span>
                </div>
              )}
              
              {/* PR Status Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-blue-50 rounded">
                  <Label className="text-[10px] text-blue-600 uppercase">PR Available</Label>
                  <p className={`font-medium ${request.pr_available ? "text-blue-700" : "text-slate-500"}`}>
                    {request.pr_available ? `Yes (${request.pr_number || "No Number"})` : "No"}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <Label className="text-[10px] text-purple-600 uppercase">Vendor</Label>
                  <p className="font-medium text-purple-700">
                    {request.vendor_name ? `${request.vendor_name} ${request.vendor_code ? `(${request.vendor_code})` : ''}` : "—"}
                  </p>
                </div>
              </div>
              
              <Separator />
              {/* Requirement Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-slate-500">Requirements</Label>
                  {/* Dropdown for viewing multiple items - available to all roles */}
                  {request.requirement_items && request.requirement_items.length > 1 && (
                    <Select 
                      value={String(selectedRequirementIndex)} 
                      onValueChange={(v) => setSelectedRequirementIndex(parseInt(v))}
                    >
                      <SelectTrigger className="w-56 h-7 text-[10px]" data-testid="pr-requirement-dropdown">
                        <SelectValue placeholder="Select Requirement" />
                      </SelectTrigger>
                      <SelectContent>
                        {request.requirement_items.map((item, idx) => (
                          <SelectItem key={idx} value={String(idx)} className="text-[10px]">
                            {item.description?.substring(0, 25)}{item.description?.length > 25 ? '...' : ''} 
                            {item.pr_number ? ` (PR: ${item.pr_number})` : ' (No PR)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {request.requirement_items && request.requirement_items.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {request.requirement_items.map((item, index) => {
                      const hasMultipleItems = request.requirement_items.length > 1;
                      const isSelected = hasMultipleItems && index === selectedRequirementIndex;
                      const itemCeaStatus = item.cea_status || request.cea_status;
                      const itemPrStatus = item.pr_status || request.pr_approval_status;
                      const itemPoStatus = item.po_status || request.po_approval_status;
                      
                      return (
                        <div 
                          key={index} 
                          className={`rounded-lg border transition-all cursor-pointer overflow-hidden ${
                            isSelected 
                              ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200' 
                              : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                          }`}
                          onClick={() => hasMultipleItems && setSelectedRequirementIndex(index)}
                          data-testid={`item-card-${index}`}
                        >
                          {/* Item Header */}
                          <div className={`px-3 py-2 flex items-center justify-between ${
                            isSelected ? 'bg-indigo-50' : 'bg-slate-50/50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>{index + 1}</span>
                              <span className={`font-medium text-xs ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {item.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] font-mono">Qty: {item.quantity}</Badge>
                              {isSelected && hasMultipleItems && (
                                <Badge className="bg-indigo-500 text-white text-[8px]">Selected</Badge>
                              )}
                            </div>
                          </div>
                          {/* Per-item Progress Pipeline */}
                          <div className="px-3 py-2 flex items-center gap-1">
                            {/* CEA */}
                            {request.cea_required ? (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-medium ${
                                itemCeaStatus === "Approved" ? 'bg-emerald-100 text-emerald-700' :
                                itemCeaStatus ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {itemCeaStatus === "Approved" ? <Check className="w-2.5 h-2.5" /> : null}
                                CEA {item.cea_number ? `(${item.cea_number})` : ''}
                              </div>
                            ) : null}
                            <span className="text-slate-300 text-[8px]">{request.cea_required ? '→' : ''}</span>
                            {/* PR */}
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-medium ${
                              itemPrStatus === "Approved" ? 'bg-emerald-100 text-emerald-700' :
                              itemPrStatus ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {itemPrStatus === "Approved" ? <Check className="w-2.5 h-2.5" /> : null}
                              PR {item.pr_number ? `(${item.pr_number})` : ''}
                            </div>
                            <span className="text-slate-300 text-[8px]">→</span>
                            {/* PO */}
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-medium ${
                              itemPoStatus === "Approved" ? 'bg-emerald-100 text-emerald-700' :
                              itemPoStatus ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {itemPoStatus === "Approved" ? <Check className="w-2.5 h-2.5" /> : null}
                              PO {item.po_number ? `(${item.po_number})` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 text-slate-700">{request.requirement_description}</p>
                )}
                
                {/* Show selected requirement details - available to all roles when multiple items */}
                {request.requirement_items && request.requirement_items.length > 1 && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                      Selected Requirement Details (Item {selectedRequirementIndex + 1} of {request.requirement_items.length})
                    </div>
                    {(() => {
                      const si = request.requirement_items[selectedRequirementIndex];
                      if (!si) return null;
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-slate-500 block">Description</span>
                              <span className="font-medium text-slate-800">{si.description}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Quantity</span>
                              <span className="font-medium text-slate-800">{si.quantity}</span>
                            </div>
                            {si.cea_number && (
                              <div>
                                <span className="text-slate-500 block">CEA No.</span>
                                <span className="font-mono font-medium text-blue-700">{si.cea_number}</span>
                              </div>
                            )}
                            {si.cea_status && (
                              <div>
                                <span className="text-slate-500 block">CEA Status</span>
                                <Badge className={`text-[10px] ${si.cea_status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{si.cea_status}</Badge>
                              </div>
                            )}
                          </div>
                          {/* Date fields row */}
                          {(si.cea_created_date || si.cea_approved_date || si.pr_number || si.po_number) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 border-t border-indigo-100">
                              {si.pr_number && (
                                <div>
                                  <span className="text-slate-500 block">PR Number</span>
                                  <span className="font-mono font-medium text-violet-700">{si.pr_number}</span>
                                </div>
                              )}
                              {si.pr_status && (
                                <div>
                                  <span className="text-slate-500 block">PR Status</span>
                                  <Badge className={`text-[10px] ${si.pr_status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{si.pr_status}</Badge>
                                </div>
                              )}
                              {si.po_number && (
                                <div>
                                  <span className="text-slate-500 block">PO Number</span>
                                  <span className="font-mono font-medium text-purple-700">{si.po_number}</span>
                                </div>
                              )}
                              {si.po_status && (
                                <div>
                                  <span className="text-slate-500 block">PO Status</span>
                                  <Badge className={`text-[10px] ${si.po_status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{si.po_status}</Badge>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Dates summary */}
                          {(si.cea_created_date || si.pr_created_date || si.po_created_date) && (
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[10px] pt-1 border-t border-indigo-100">
                              {si.cea_created_date && <div><span className="text-slate-400 block">CEA Created</span><span className="font-medium">{si.cea_created_date?.split("T")[0]}</span></div>}
                              {si.cea_approved_date && <div><span className="text-slate-400 block">CEA Approved</span><span className="font-medium text-emerald-600">{si.cea_approved_date?.split("T")[0]}</span></div>}
                              {si.pr_created_date && <div><span className="text-slate-400 block">PR Created</span><span className="font-medium">{si.pr_created_date?.split("T")[0]}</span></div>}
                              {si.pr_approved_date && <div><span className="text-slate-400 block">PR Approved</span><span className="font-medium text-emerald-600">{si.pr_approved_date?.split("T")[0]}</span></div>}
                              {si.po_created_date && <div><span className="text-slate-400 block">PO Created</span><span className="font-medium">{si.po_created_date?.split("T")[0]}</span></div>}
                              {si.po_approved_date && <div><span className="text-slate-400 block">PO Approved</span><span className="font-medium text-emerald-600">{si.po_approved_date?.split("T")[0]}</span></div>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              {request.justification && (
                <div>
                  <Label className="text-xs text-slate-500">Justification</Label>
                  <p className="mt-1 text-slate-700">{request.justification}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Section - Visible to ALL ROLES */}
          {hasAccess('capex_request', 'attachments') && request.attachments && request.attachments.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Attachments (Request Documents)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Business Case */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 font-medium">Business Case</Label>
                    {request.attachments.filter(a => a.type === "business_case").length > 0 ? (
                      request.attachments.filter(a => a.type === "business_case").map((att) => (
                        <a
                          key={att.id}
                          href={`${API}/files/${att.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs transition-colors"
                        >
                          <File className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="flex-1 truncate text-slate-700" title={att.filename}>{att.filename}</span>
                          <Download className="w-3 h-3 text-slate-400" />
                        </a>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 p-2">No documents</p>
                    )}
                  </div>
                  
                  {/* Justification */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 font-medium">Justification</Label>
                    {request.attachments.filter(a => a.type === "justification").length > 0 ? (
                      request.attachments.filter(a => a.type === "justification").map((att) => (
                        <a
                          key={att.id}
                          href={`${API}/files/${att.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs transition-colors"
                        >
                          <File className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="flex-1 truncate text-slate-700" title={att.filename}>{att.filename}</span>
                          <Download className="w-3 h-3 text-slate-400" />
                        </a>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 p-2">No documents</p>
                    )}
                  </div>
                  
                  {/* Quotations */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 font-medium">Quotations</Label>
                    {request.attachments.filter(a => a.type === "quotation").length > 0 ? (
                      request.attachments.filter(a => a.type === "quotation").map((att) => (
                        <a
                          key={att.id}
                          href={`${API}/files/${att.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded text-xs transition-colors"
                        >
                          <File className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="flex-1 truncate text-slate-700" title={att.filename}>{att.filename}</span>
                          <Download className="w-3 h-3 text-slate-400" />
                        </a>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 p-2">No documents</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Section - VISIBLE TO ALL (Read-only for Users) */}
          {hasAccess('capex_request', 'buyer_module') && (
          <Card className="border-2 border-indigo-100 shadow-md">
            <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-slate-50 border-b">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <Package className="w-3 h-3 text-white" />
                  </div>
                  Processing Status
                </span>
                {hasMultipleItems && (
                  <Badge className="text-[9px] bg-indigo-100 text-indigo-700">
                    Showing for: {selectedItem?.description?.substring(0, 20)}{selectedItem?.description?.length > 20 ? '...' : ''} (PR: {selectedItem?.pr_number || 'N/A'})
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm">
              <div className="space-y-4">
                {/* Helper: Get current item's data or fall back to request level */}
                {(() => {
                  // For multi-PR, use selected item data; otherwise use request-level data
                  const itemData = hasMultipleItems ? (selectedItem || {}) : {};
                  // For multi-item requests, ONLY use item data (no fallback to request)
                  // For single-item requests, use request data
                  const ceaNumber = hasMultipleItems ? itemData.cea_number : request.cea_number;
                  const ceaStatus = hasMultipleItems ? itemData.cea_status : request.cea_status;
                  const wbsNumber = hasMultipleItems ? itemData.wbs_number : request.wbs_number;
                  const prNumber = hasMultipleItems ? itemData.pr_number : request.pr_number;
                  const prStatus = hasMultipleItems ? itemData.pr_status : request.pr_approval_status;
                  const poNumber = hasMultipleItems ? itemData.po_number : request.po_number;
                  const poStatus = hasMultipleItems ? itemData.po_status : request.po_approval_status;
                  const deliveryStatus = hasMultipleItems ? itemData.delivery_status : request.delivery_status;
                  const installationStatus = hasMultipleItems ? itemData.installation_status : request.commissioning_status;
                  const prAvailable = hasMultipleItems ? itemData.pr_available : request.pr_available;
                  const poAvailable = hasMultipleItems ? itemData.po_available : request.po_available;
                  
                  // Update handler for multi-PR items
                  const handleItemUpdate = (updateData) => {
                    // Filter out __none__ values (used as placeholder in Select)
                    const cleanedData = {};
                    for (const [key, value] of Object.entries(updateData)) {
                      cleanedData[key] = value === "__none__" ? null : value;
                    }
                    
                    if (hasMultipleItems) {
                      handleUpdateRequirementItem(selectedRequirementIndex, cleanedData);
                    } else {
                      // Map item fields to request fields
                      const requestUpdate = {};
                      if (cleanedData.cea_number !== undefined) requestUpdate.cea_number = cleanedData.cea_number;
                      if (cleanedData.cea_status !== undefined) requestUpdate.cea_status = cleanedData.cea_status;
                      if (cleanedData.wbs_number !== undefined) requestUpdate.wbs_number = cleanedData.wbs_number;
                      if (cleanedData.pr_number !== undefined) requestUpdate.pr_number = cleanedData.pr_number;
                      if (cleanedData.pr_status !== undefined) requestUpdate.pr_approval_status = cleanedData.pr_status;
                      if (cleanedData.po_number !== undefined) requestUpdate.po_number = cleanedData.po_number;
                      if (cleanedData.po_status !== undefined) requestUpdate.po_approval_status = cleanedData.po_status;
                      if (cleanedData.delivery_status !== undefined) requestUpdate.delivery_status = cleanedData.delivery_status;
                      if (cleanedData.installation_status !== undefined) requestUpdate.commissioning_status = cleanedData.installation_status;
                      // Map date fields for single-item requests
                      if (cleanedData.cea_created_date !== undefined) requestUpdate.cea_created_date = cleanedData.cea_created_date;
                      if (cleanedData.cea_approved_date !== undefined) requestUpdate.cea_approved_date = cleanedData.cea_approved_date;
                      if (cleanedData.pr_created_date !== undefined) requestUpdate.pr_created_date = cleanedData.pr_created_date;
                      if (cleanedData.pr_approved_date !== undefined) requestUpdate.pr_approved_date = cleanedData.pr_approved_date;
                      if (cleanedData.po_created_date !== undefined) requestUpdate.po_created_date = cleanedData.po_created_date;
                      if (cleanedData.po_approved_date !== undefined) requestUpdate.po_approved_date = cleanedData.po_approved_date;
                      if (cleanedData.ordered_date !== undefined) requestUpdate.ordered_date = cleanedData.ordered_date;
                      handleUpdate(requestUpdate);
                    }
                  };

                  const ceaApprovedOrNA = !request.cea_required || ceaStatus === "Approved";
                  const prIsApproved = prStatus === "Approved";
                  const userProvidedPR = hasMultipleItems 
                    ? (selectedItem?.pr_available && selectedItem?.pr_number) 
                    : (request.pr_provided_by === "user" && prNumber);

                  return (
                    <>
                      {/* CEA Section - Sequential Step 1 */}
                      {request.cea_required && (
                        <div className={`p-3 rounded-lg border-2 ${
                          ceaStatus === "Approved" 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-amber-50 border-amber-200"
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${
                                ceaStatus === "Approved" ? 'bg-emerald-500' : 'bg-amber-500'
                              }`} />
                              <span className="font-semibold text-xs uppercase tracking-wide text-slate-700">
                                CEA {request.cea_type === "new" ? "(New)" : request.cea_type === "existing" ? "(Existing)" : ""}
                              </span>
                              {request.cea_type === "existing" && wbsNumber && (
                                <Badge className="text-[9px] bg-slate-100 text-slate-600">User Provided WBS</Badge>
                              )}
                            </div>
                            {ceaStatus && (
                              <Badge className={`text-[9px] ${
                                ceaStatus === "Approved" 
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              }`}>
                                {ceaStatus}
                              </Badge>
                            )}
                          </div>
                          
                          {canProcess ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">
                                    {request.cea_type === "existing" ? "WBS No" : "CEA Number"}
                                  </Label>
                                  {request.cea_type === "existing" && wbsNumber && !hasMultipleItems ? (
                                    <div className="h-9 flex items-center px-3 bg-slate-100 rounded-md border">
                                      <span className="font-mono font-semibold text-emerald-600">{wbsNumber}</span>
                                    </div>
                                  ) : (
                                    <Input 
                                      size="sm" 
                                      placeholder={request.cea_type === "existing" ? "Enter WBS Number" : "Enter CEA Number"}
                                      defaultValue={request.cea_type === "existing" ? (wbsNumber || "") : (ceaNumber || "")} 
                                      key={`cea-${selectedRequirementIndex}-${request.cea_type === "existing" ? wbsNumber : ceaNumber}`}
                                      onBlur={(e) => {
                                        if (request.cea_type === "existing") {
                                          handleItemUpdate({ wbs_number: e.target.value });
                                        } else {
                                          handleItemUpdate({ cea_number: e.target.value });
                                        }
                                      }}
                                      data-testid="cea-number-input"
                                    />
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">CEA Status</Label>
                                  <Select 
                                    value={ceaStatus || ""} 
                                    onValueChange={(v) => handleItemUpdate({ cea_status: v })}
                                  >
                                    <SelectTrigger className="h-9" data-testid="cea-status-select">
                                      <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Select...</SelectItem>
                                      {ceaApprovalStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* CEA Date Fields */}
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">CEA Created Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.cea_created_date : request.cea_created_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ cea_created_date: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">CEA Approved Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.cea_approved_date : request.cea_approved_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ cea_approved_date: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-slate-600">{request.cea_type === "existing" ? "WBS No" : "CEA Number"}: </span>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {request.cea_type === "existing" ? (wbsNumber || "Pending") : (ceaNumber || "Pending")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* PR Section */}
                      <div className={`p-3 rounded-lg border-2 transition-all ${
                        !ceaApprovedOrNA && request.cea_required
                          ? "bg-slate-100 border-slate-200 opacity-60"
                          : prIsApproved
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-blue-50 border-blue-200"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              prIsApproved ? 'bg-emerald-500' : 
                              prNumber ? 'bg-blue-500' : 'bg-slate-300'
                            }`} />
                            <span className="font-semibold text-xs uppercase tracking-wide text-slate-700">PR</span>
                            {userProvidedPR && (
                              <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200">User Provided</Badge>
                            )}
                            {!ceaApprovedOrNA && request.cea_required && (
                              <Badge className="text-[9px] bg-slate-200 text-slate-500">Locked - CEA Pending</Badge>
                            )}
                          </div>
                          {prStatus && (
                            <Badge className={`text-[9px] ${
                              prIsApproved 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            }`}>
                              {prStatus}
                            </Badge>
                          )}
                        </div>
                        
                        {canProcess && ceaApprovedOrNA ? (
                          <div className="space-y-2">
                            {/* PR Available Toggle */}
                            {!userProvidedPR && (
                              <div className="flex items-center gap-3 p-2 bg-white/50 rounded">
                                <Label className="text-[10px] text-slate-600">PR Available</Label>
                                <Switch
                                  checked={hasMultipleItems ? (selectedItem?.pr_available || false) : (request.pr_available || false)}
                                  onCheckedChange={(c) => {
                                    if (hasMultipleItems) {
                                      handleUpdateRequirementItem(selectedRequirementIndex, { pr_available: c });
                                    } else {
                                      handleUpdate({ pr_available: c });
                                    }
                                  }}
                                  data-testid="pr-toggle-buyer"
                                  className="scale-90 data-[state=checked]:bg-blue-500"
                                />
                                <span className="text-[10px] text-slate-500">
                                  {(hasMultipleItems ? selectedItem?.pr_available : request.pr_available) ? "Yes" : "No"}
                                </span>
                              </div>
                            )}
                            
                            {/* PR Number and Status fields - only show if PR is available or user provided */}
                            {(userProvidedPR || (hasMultipleItems ? selectedItem?.pr_available : request.pr_available)) && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PR Number</Label>
                                  {userProvidedPR && !hasMultipleItems ? (
                                    <div className="h-9 flex items-center px-3 bg-slate-100 rounded-md border">
                                      <span className="font-mono font-semibold text-emerald-600">{prNumber}</span>
                                    </div>
                                  ) : (
                                    <Input 
                                      size="sm" 
                                      placeholder="Enter PR Number"
                                      defaultValue={prNumber || ""} 
                                      key={`pr-${selectedRequirementIndex}-${prNumber}`}
                                      onBlur={(e) => handleItemUpdate({ pr_number: e.target.value })}
                                      data-testid="pr-number-input"
                                    />
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PR Status</Label>
                                  <Select 
                                    value={prStatus || ""} 
                                    onValueChange={(v) => handleItemUpdate({ pr_status: v })}
                                  >
                                    <SelectTrigger className="h-9" data-testid="pr-status-select">
                                      <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Select...</SelectItem>
                                      {prStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            {/* PR Date Fields */}
                            {(userProvidedPR || (hasMultipleItems ? selectedItem?.pr_available : request.pr_available)) && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PR Created Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.pr_created_date : request.pr_created_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ pr_created_date: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PR Approved Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.pr_approved_date : request.pr_approved_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ pr_approved_date: e.target.value })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="text-slate-600">PR Number: </span>
                              <span className="font-mono font-semibold text-slate-800">{prNumber || "Pending"}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PO Section */}
                      <div className={`p-3 rounded-lg border-2 transition-all ${
                        !prIsApproved
                          ? "bg-slate-100 border-slate-200 opacity-60"
                          : poStatus === "Approved"
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-purple-50 border-purple-200"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              poStatus === "Approved" ? 'bg-emerald-500' : 
                              poNumber ? 'bg-purple-500' : 'bg-slate-300'
                            }`} />
                            <span className="font-semibold text-xs uppercase tracking-wide text-slate-700">PO</span>
                            {!prIsApproved && (
                              <Badge className="text-[9px] bg-slate-200 text-slate-500">Locked - PR Pending</Badge>
                            )}
                          </div>
                          {poStatus && (
                            <Badge className={`text-[9px] ${
                              poStatus === "Approved" 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : "bg-purple-100 text-purple-700 border-purple-200"
                            }`}>
                              {poStatus}
                            </Badge>
                          )}
                        </div>
                        
                        {canProcess && prIsApproved ? (
                          <div className="space-y-2">
                            {/* PO Created Toggle */}
                            <div className="flex items-center gap-3 p-2 bg-white/50 rounded">
                              <Label className="text-[10px] text-slate-600">PO Created</Label>
                              <Switch
                                checked={hasMultipleItems ? (selectedItem?.po_available !== false) : (request.po_available !== false)}
                                onCheckedChange={(c) => {
                                  if (hasMultipleItems) {
                                    handleUpdateRequirementItem(selectedRequirementIndex, { po_available: c });
                                  } else {
                                    handleUpdate({ po_available: c });
                                  }
                                }}
                                data-testid="po-toggle-buyer"
                                className="scale-90 data-[state=checked]:bg-purple-500"
                              />
                              <span className="text-[10px] text-slate-500">
                                {(hasMultipleItems ? selectedItem?.po_available !== false : request.po_available !== false) ? "Yes" : "No"}
                              </span>
                            </div>
                            
                            {/* PO Number and Status fields - only show if PO is created */}
                            {(hasMultipleItems ? selectedItem?.po_available !== false : request.po_available !== false) && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PO Number</Label>
                                  <Input 
                                    size="sm" 
                                    placeholder="Enter PO Number"
                                    defaultValue={poNumber || ""} 
                                    key={`po-${selectedRequirementIndex}-${poNumber}`}
                                    onBlur={(e) => handleItemUpdate({ po_number: e.target.value })}
                                    data-testid="po-number-input"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PO Status</Label>
                                  <Select 
                                    value={poStatus || ""} 
                                    onValueChange={(v) => handleItemUpdate({ po_status: v })}
                                  >
                                    <SelectTrigger className="h-9" data-testid="po-status-select">
                                      <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Select...</SelectItem>
                                      {poStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            {/* PO Date Fields and Ordered Date */}
                            {(hasMultipleItems ? selectedItem?.po_available !== false : request.po_available !== false) && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PO Created Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.po_created_date : request.po_created_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ po_created_date: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">PO Approved Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.po_approved_date : request.po_approved_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ po_approved_date: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-slate-500 mb-1 block">Ordered Date</Label>
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    value={(hasMultipleItems ? itemData.ordered_date : request.ordered_date)?.split("T")[0] || ""} 
                                    onChange={(e) => handleItemUpdate({ ordered_date: e.target.value })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="text-slate-600">PO Number: </span>
                              <span className="font-mono font-semibold text-slate-800">{poNumber || "Pending"}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Workflow Status Section - Auto-calculated, Read-only */}
                      <div className="p-3 rounded-lg border-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                            <span className="font-semibold text-xs uppercase tracking-wide text-slate-700">Workflow Status</span>
                          </div>
                          <div className="h-9 flex items-center px-3 bg-white rounded-md border border-indigo-200">
                            <span className={`font-medium text-sm ${
                              request.workflow_status === "Completed" ? "text-emerald-700" :
                              request.workflow_status?.includes("Approved") ? "text-emerald-600" :
                              request.workflow_status?.includes("Under") || request.workflow_status?.includes("Processing") ? "text-amber-600" :
                              "text-slate-700"
                            }`}>
                              {request.workflow_status || "—"}
                            </span>
                          </div>
                        </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Supplier & Additional Details Card */}
          {hasAccess('capex_request', 'supplier_details') && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold">Supplier & Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Supplier Section */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${request.vendor_name ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Supplier</span>
                  </div>
                  {canProcess ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-500 mb-1 block">Vendor Name</Label>
                        <Input size="sm" placeholder="Enter Vendor Name" defaultValue={request.vendor_name || ""} 
                          onBlur={(e) => handleUpdate({ vendor_name: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 mb-1 block">Vendor Code</Label>
                        <Input size="sm" placeholder="Enter Vendor Code" defaultValue={request.vendor_code || ""} 
                          onBlur={(e) => handleUpdate({ vendor_code: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>Name: <span className="font-medium">{request.vendor_name || "Pending"}</span></span>
                      <span>Code: <span className="font-medium">{request.vendor_code || "-"}</span></span>
                    </div>
                  )}
                </div>

                {/* Price Section - Only visible to Buyer and Capex Head */}
                {canProcess && (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${(request.suppliers && request.suppliers.length > 0) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Price (Multiple Suppliers)</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const newSuppliers = [...(request.suppliers || []), { name: '', code: '', initial_price: '', final_price: '', quote_reference: '', quote_date: '' }];
                          handleUpdate({ suppliers: newSuppliers });
                        }}
                      >
                        + Add Supplier
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        // Check if any supplier has been ordered
                        const hasOrderedSupplier = (request.suppliers || []).some(s => s.is_ordered);
                        
                        return (request.suppliers || []).map((supplier, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border-2 space-y-2 transition-all ${
                            supplier.is_ordered 
                              ? 'bg-emerald-50 border-emerald-400' 
                              : hasOrderedSupplier 
                                ? 'bg-slate-50 border-slate-200 opacity-60' 
                                : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-slate-600">Supplier {idx + 1}</span>
                                {supplier.is_ordered && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">ORDERED ✓</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Place Order Button - Show on every supplier with name */}
                                {supplier.name && !supplier.is_ordered && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[9px] bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => {
                                      // Mark this supplier as ordered (unmark others) and copy details to vendor fields + prices
                                      const newSuppliers = request.suppliers.map((s, i) => ({
                                        ...s,
                                        is_ordered: i === idx,
                                        ordered_date: i === idx ? new Date().toISOString().split('T')[0] : null
                                      }));
                                      handleUpdate({ 
                                        suppliers: newSuppliers,
                                        vendor_name: supplier.name,
                                        vendor_code: supplier.code || '',
                                        // Copy prices for analytics calculations
                                        initial_price: parseFloat(supplier.initial_price) || 0,
                                        final_negotiated_price: parseFloat(supplier.final_price) || 0
                                      });
                                      toast.success(`Order placed with ${supplier.name}`);
                                    }}
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Place Order
                                  </Button>
                                )}
                                {/* Cancel Order Button - Only for the ordered supplier */}
                                {supplier.is_ordered && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[9px] bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                                    onClick={() => {
                                      // Remove order from this supplier and clear prices
                                      const newSuppliers = request.suppliers.map((s, i) => ({
                                        ...s,
                                        is_ordered: false,
                                        ordered_date: null
                                      }));
                                      handleUpdate({ 
                                        suppliers: newSuppliers,
                                        vendor_name: null,
                                        vendor_code: null,
                                        initial_price: null,
                                        final_negotiated_price: null
                                      });
                                      toast.info('Order cancelled');
                                    }}
                                  >
                                    Cancel Order
                                  </Button>
                                )}
                                {/* Delete Button - Only if not ordered */}
                                {!supplier.is_ordered && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-red-500"
                                    onClick={() => {
                                      const newSuppliers = request.suppliers.filter((_, i) => i !== idx);
                                      handleUpdate({ suppliers: newSuppliers });
                                    }}
                                  >
                                    ×
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                size="sm"
                                placeholder="Supplier Name"
                                defaultValue={supplier.name || ''}
                                disabled={hasOrderedSupplier}
                                onBlur={(e) => {
                                  const newSuppliers = [...request.suppliers];
                                  newSuppliers[idx] = { ...newSuppliers[idx], name: e.target.value };
                                  handleUpdate({ suppliers: newSuppliers });
                                }}
                              />
                              <Input
                                size="sm"
                                placeholder="Supplier Code"
                                defaultValue={supplier.code || ''}
                                disabled={hasOrderedSupplier}
                                onBlur={(e) => {
                                  const newSuppliers = [...request.suppliers];
                                  newSuppliers[idx] = { ...newSuppliers[idx], code: e.target.value };
                                  handleUpdate({ suppliers: newSuppliers });
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[9px] text-slate-500">Initial Price (₹)</Label>
                                <Input
                                  size="sm"
                                  type="number"
                                  placeholder="Initial Price"
                                  defaultValue={supplier.initial_price || ''}
                                  disabled={hasOrderedSupplier}
                                  onBlur={(e) => {
                                    const newSuppliers = [...request.suppliers];
                                    newSuppliers[idx] = { ...newSuppliers[idx], initial_price: parseFloat(e.target.value) || 0 };
                                    handleUpdate({ suppliers: newSuppliers });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-[9px] text-slate-500">Final Price (₹)</Label>
                                <Input
                                  size="sm"
                                  type="number"
                                  placeholder="Final Price"
                                  defaultValue={supplier.final_price || ''}
                                  disabled={hasOrderedSupplier}
                                  onBlur={(e) => {
                                    const newSuppliers = [...request.suppliers];
                                    newSuppliers[idx] = { ...newSuppliers[idx], final_price: parseFloat(e.target.value) || 0 };
                                    handleUpdate({ suppliers: newSuppliers });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                size="sm"
                                placeholder="Quote Reference"
                                defaultValue={supplier.quote_reference || ''}
                                disabled={hasOrderedSupplier}
                                onBlur={(e) => {
                                  const newSuppliers = [...request.suppliers];
                                  newSuppliers[idx] = { ...newSuppliers[idx], quote_reference: e.target.value };
                                  handleUpdate({ suppliers: newSuppliers });
                                }}
                              />
                              <Input
                                size="sm"
                                type="date"
                                placeholder="Quote Date"
                                defaultValue={supplier.quote_date || ''}
                                disabled={hasOrderedSupplier}
                                onBlur={(e) => {
                                  const newSuppliers = [...request.suppliers];
                                  newSuppliers[idx] = { ...newSuppliers[idx], quote_date: e.target.value };
                                  handleUpdate({ suppliers: newSuppliers });
                                }}
                              />
                            </div>
                            {/* Quotation Upload */}
                            <div className="pt-2 border-t border-slate-200">
                              <Label className="text-[9px] text-slate-500 mb-1 block">Quotation Document</Label>
                              <div className="flex items-center gap-2">
                                {supplier.quotation_url ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <a 
                                      href={supplier.quotation_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-indigo-600 hover:underline truncate flex-1"
                                    >
                                      📄 {supplier.quotation_name || 'Quotation'}
                                    </a>
                                    {!hasOrderedSupplier && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 px-1 text-red-500 text-[9px]"
                                        onClick={() => {
                                          const newSuppliers = [...request.suppliers];
                                          newSuppliers[idx] = { ...newSuppliers[idx], quotation_url: null, quotation_name: null };
                                          handleUpdate({ suppliers: newSuppliers });
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-1">
                                    <Input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                      className="h-7 text-[9px]"
                                      disabled={hasOrderedSupplier}
                                      onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const formData = new FormData();
                                          formData.append('file', file);
                                          formData.append('capex_request_id', request.id);
                                          formData.append('document_type', 'quotation');
                                          try {
                                            const response = await axios.post(
                                              `${process.env.REACT_APP_BACKEND_URL}/api/files/upload`,
                                              formData,
                                              { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } }
                                            );
                                            const newSuppliers = [...request.suppliers];
                                            newSuppliers[idx] = { 
                                              ...newSuppliers[idx], 
                                              quotation_url: response.data.url,
                                              quotation_name: file.name
                                            };
                                            handleUpdate({ suppliers: newSuppliers });
                                          } catch (err) {
                                            console.error('Upload failed:', err);
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            {supplier.is_ordered && supplier.ordered_date && (
                              <div className="text-[9px] text-emerald-600 mt-1 font-medium">
                                ✓ Order placed on: {supplier.ordered_date}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                      {(!request.suppliers || request.suppliers.length === 0) && (
                        <p className="text-[10px] text-slate-400 text-center py-2">No suppliers added yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Section - Only visible to Buyer and Capex Head */}
                {canProcess && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${(request.payment_terms && request.payment_terms.length > 0) ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Payment Terms</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const newTerms = [...(request.payment_terms || []), { description: '', percentage: '', condition: '', abg_required: false, pbg_required: false }];
                          handleUpdate({ payment_terms: newTerms });
                        }}
                      >
                        + Add Term
                      </Button>
                    </div>
                    
                    {/* GST Section */}
                    <div className="flex items-center gap-4 p-2 bg-white rounded border border-slate-200 mb-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-slate-600">GST Applicable</Label>
                        <Switch
                          checked={request.gst_applicable || false}
                          onCheckedChange={(c) => handleUpdate({ gst_applicable: c })}
                          className="scale-75"
                        />
                      </div>
                      {request.gst_applicable && (
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-slate-600">GST %</Label>
                          <Input
                            size="sm"
                            type="number"
                            className="w-20 h-7"
                            placeholder="%"
                            defaultValue={request.gst_percentage || ''}
                            onBlur={(e) => handleUpdate({ gst_percentage: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(request.payment_terms || []).map((term, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-slate-600">Term {idx + 1}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-red-500"
                              onClick={() => {
                                const newTerms = request.payment_terms.filter((_, i) => i !== idx);
                                handleUpdate({ payment_terms: newTerms });
                              }}
                            >
                              ×
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              size="sm"
                              type="number"
                              placeholder="%"
                              className="w-16"
                              defaultValue={term.percentage || ''}
                              onBlur={(e) => {
                                const newTerms = [...request.payment_terms];
                                newTerms[idx] = { ...newTerms[idx], percentage: parseFloat(e.target.value) || 0 };
                                handleUpdate({ payment_terms: newTerms });
                              }}
                            />
                            <Select
                              defaultValue={term.condition || ''}
                              onValueChange={(v) => {
                                const newTerms = [...request.payment_terms];
                                newTerms[idx] = { ...newTerms[idx], condition: v };
                                handleUpdate({ payment_terms: newTerms });
                              }}
                            >
                              <SelectTrigger className="h-8 text-[10px]">
                                <SelectValue placeholder="Condition" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Advance with PO">Advance with PO</SelectItem>
                                <SelectItem value="Before Dispatch">Before Dispatch</SelectItem>
                                <SelectItem value="After Dispatch">After Dispatch</SelectItem>
                                <SelectItem value="After Receiving">After Receiving Material</SelectItem>
                                <SelectItem value="After Installation">After Installation</SelectItem>
                                <SelectItem value="After Commissioning">After Commissioning</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              size="sm"
                              placeholder="Description"
                              defaultValue={term.description || ''}
                              onBlur={(e) => {
                                const newTerms = [...request.payment_terms];
                                newTerms[idx] = { ...newTerms[idx], description: e.target.value };
                                handleUpdate({ payment_terms: newTerms });
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-4 text-[10px]">
                            <div className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={term.abg_required || false}
                                onChange={(e) => {
                                  const newTerms = [...request.payment_terms];
                                  newTerms[idx] = { ...newTerms[idx], abg_required: e.target.checked };
                                  handleUpdate({ payment_terms: newTerms });
                                }}
                              />
                              <Label className="text-[10px]">ABG Required</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={term.pbg_required || false}
                                onChange={(e) => {
                                  const newTerms = [...request.payment_terms];
                                  newTerms[idx] = { ...newTerms[idx], pbg_required: e.target.checked };
                                  handleUpdate({ payment_terms: newTerms });
                                }}
                              />
                              <Label className="text-[10px]">PBG Required</Label>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!request.payment_terms || request.payment_terms.length === 0) && (
                        <p className="text-[10px] text-slate-400 text-center py-2">No payment terms added yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* DAP Status - Only show if DAP is required */}
                {request.dap_required && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dap?.status === "Approved" ? 'bg-emerald-500' : dap ? 'bg-amber-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">DAP</span>
                      </div>
                      {dap && <Badge className={dap.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{dap.status}</Badge>}
                    </div>
                    {dap ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>User: <Badge variant="secondary" className="ml-1">{dap.user_approval_status}</Badge></span>
                          <span>Dept Head: <Badge variant="secondary" className="ml-1">{dap.dept_head_approval_status}</Badge></span>
                        </div>
                        
                        {/* DAP Documents - Visible to User, Dept Head, and Capex Head */}
                        {dap.documents && dap.documents.length > 0 && (
                          <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                            <Label className="text-[10px] text-slate-500 font-medium mb-1 block">DAP Documents</Label>
                            <div className="space-y-1">
                              {dap.documents.map((docUrl, idx) => (
                                <a
                                  key={idx}
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded text-xs transition-colors"
                                >
                                  <File className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                                  <span className="flex-1 truncate text-slate-700">Document {idx + 1}</span>
                                  <Download className="w-3 h-3 text-slate-400" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* DAP Approval buttons for User/Dept Head */}
                        {((user?.role === "user" && dap.user_approval_status === "Pending") ||
                          (user?.role === "department_head" && dap.dept_head_approval_status === "Pending")) && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600" onClick={() => { setDapApprovalAction("approve"); setDapApprovalDialogOpen(true); }}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setDapApprovalAction("request_changes"); setDapApprovalDialogOpen(true); }}>
                              Request Changes
                            </Button>
                          </div>
                        )}
                        
                        {/* DAP Dates - Multiple dates allowed */}
                        {canProcess && (
                          <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-[10px] text-slate-500 font-medium">DAP Dates</Label>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-5 px-1 text-[10px]"
                                onClick={() => {
                                  const currentDates = request.dap_dates || [];
                                  handleUpdate({ dap_dates: [...currentDates, new Date().toISOString().split('T')[0]] });
                                }}
                              >
                                + Add Date
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {(request.dap_dates || []).map((date, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Input 
                                    type="date" 
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    value={date?.split("T")[0] || ""} 
                                    onChange={(e) => {
                                      const newDates = [...(request.dap_dates || [])];
                                      newDates[idx] = e.target.value;
                                      handleUpdate({ dap_dates: newDates });
                                    }}
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      const newDates = (request.dap_dates || []).filter((_, i) => i !== idx);
                                      handleUpdate({ dap_dates: newDates });
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                              {(!request.dap_dates || request.dap_dates.length === 0) && (
                                <p className="text-[10px] text-slate-400">No DAP dates added</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* DAP Change Request History / Re-correction History */}
                        {dap.change_requests && dap.change_requests.length > 0 && (
                          <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                            <Label className="text-[10px] text-amber-700 font-medium mb-2 block">
                              Re-correction History ({dap.change_requests.length})
                            </Label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {dap.change_requests.map((changeReq, idx) => (
                                <div key={idx} className="p-2 bg-white rounded border border-amber-100 text-[10px]">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-amber-800">{changeReq.role}</span>
                                    <span className="text-slate-500">{changeReq.timestamp?.split('T')[0]}</span>
                                  </div>
                                  <p className="text-slate-600">{changeReq.comment}</p>
                                  {changeReq.change_type && (
                                    <Badge className="mt-1 bg-amber-100 text-amber-700 text-[8px]">{changeReq.change_type}</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* DAP Version Info */}
                        {dap.version > 1 && (
                          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            <span>Version {dap.version} - Revised {dap.version - 1} time(s)</span>
                          </div>
                        )}
                      </div>
                    ) : canProcess ? (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setDapDialogOpen(true)}>
                        <Upload className="w-3 h-3 mr-1" />
                        Create DAP
                      </Button>
                    ) : (
                      <p className="text-slate-500">Awaiting DAP creation</p>
                    )}
                  </div>
                )}

                {/* Invoice Section - Only visible to Buyer and Capex Head */}
                {canProcess && (
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${(request.invoices && request.invoices.length > 0) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Invoices</span>
                        {request.invoices && request.invoices.length > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">{request.invoices.length}</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const newInvoices = [...(request.invoices || []), { 
                            invoice_number: '', 
                            invoice_date: new Date().toISOString().split('T')[0], 
                            amount: '', 
                            gst_number: '',
                            supplier_name: '',
                            file_url: null, 
                            file_name: null,
                            uploaded_at: new Date().toISOString()
                          }];
                          handleUpdate({ invoices: newInvoices });
                        }}
                      >
                        + Add Invoice
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {(request.invoices || []).map((invoice, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-slate-600">Invoice {idx + 1}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-red-500"
                              onClick={() => {
                                const newInvoices = request.invoices.filter((_, i) => i !== idx);
                                handleUpdate({ invoices: newInvoices });
                              }}
                            >
                              ×
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[9px] text-slate-500">Supplier Name</Label>
                              <Input
                                size="sm"
                                placeholder="Supplier Name"
                                defaultValue={invoice.supplier_name || ''}
                                onBlur={(e) => {
                                  const newInvoices = [...request.invoices];
                                  newInvoices[idx] = { ...newInvoices[idx], supplier_name: e.target.value };
                                  handleUpdate({ invoices: newInvoices });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-[9px] text-slate-500">GST Number</Label>
                              <Input
                                size="sm"
                                placeholder="GST123456789"
                                defaultValue={invoice.gst_number || ''}
                                onBlur={(e) => {
                                  const newInvoices = [...request.invoices];
                                  newInvoices[idx] = { ...newInvoices[idx], gst_number: e.target.value };
                                  handleUpdate({ invoices: newInvoices });
                                }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[9px] text-slate-500">Invoice Number</Label>
                              <Input
                                size="sm"
                                placeholder="INV-001"
                                defaultValue={invoice.invoice_number || ''}
                                onBlur={(e) => {
                                  const newInvoices = [...request.invoices];
                                  newInvoices[idx] = { ...newInvoices[idx], invoice_number: e.target.value };
                                  handleUpdate({ invoices: newInvoices });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-[9px] text-slate-500">Invoice Date</Label>
                              <Input
                                size="sm"
                                type="date"
                                defaultValue={invoice.invoice_date || ''}
                                onBlur={(e) => {
                                  const newInvoices = [...request.invoices];
                                  newInvoices[idx] = { ...newInvoices[idx], invoice_date: e.target.value };
                                  handleUpdate({ invoices: newInvoices });
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-[9px] text-slate-500">Amount (₹)</Label>
                              <Input
                                size="sm"
                                type="number"
                                placeholder="0.00"
                                defaultValue={invoice.amount || ''}
                                onBlur={(e) => {
                                  const newInvoices = [...request.invoices];
                                  newInvoices[idx] = { ...newInvoices[idx], amount: parseFloat(e.target.value) || 0 };
                                  handleUpdate({ invoices: newInvoices });
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-[9px] text-slate-500">Invoice Document</Label>
                            {invoice.file_url ? (
                              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                <a 
                                  href={invoice.file_url.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${invoice.file_url}` : invoice.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-indigo-600 hover:underline truncate flex-1"
                                >
                                  📄 {invoice.file_name || 'Invoice Document'}
                                </a>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1 text-red-500 text-[9px]"
                                  onClick={() => {
                                    const newInvoices = [...request.invoices];
                                    newInvoices[idx] = { ...newInvoices[idx], file_url: null, file_name: null };
                                    handleUpdate({ invoices: newInvoices });
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="h-7 text-[9px]"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('document_type', 'invoice');
                                    try {
                                      const response = await axios.post(
                                        `${process.env.REACT_APP_BACKEND_URL}/api/files/upload`,
                                        formData,
                                        { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } }
                                      );
                                      const newInvoices = [...request.invoices];
                                      newInvoices[idx] = { 
                                        ...newInvoices[idx], 
                                        file_url: response.data.url,
                                        file_name: file.name
                                      };
                                      handleUpdate({ invoices: newInvoices });
                                      toast.success('Invoice uploaded');
                                    } catch (err) {
                                      console.error('Upload failed:', err);
                                      toast.error('Failed to upload invoice');
                                    }
                                  }
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                      {(!request.invoices || request.invoices.length === 0) && (
                        <p className="text-[10px] text-slate-400 text-center py-2">No invoices added yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sample Details Dialog */}
                {selectedSampleForDetails && (
                  <Dialog open={!!selectedSampleForDetails} onOpenChange={() => setSelectedSampleForDetails(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-cyan-600" />
                          Sample Details - {selectedSampleForDetails.id}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Status & Dates */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Status</p>
                            <Badge className={
                              selectedSampleForDetails.status === "Delivered" ? "bg-green-100 text-green-800" :
                              selectedSampleForDetails.status === "Dispatched" ? "bg-purple-100 text-purple-800" :
                              selectedSampleForDetails.status === "Picked Up" ? "bg-indigo-100 text-indigo-800" :
                              selectedSampleForDetails.status === "Ready for Pickup" ? "bg-blue-100 text-blue-800" :
                              "bg-slate-100 text-slate-800"
                            }>{selectedSampleForDetails.status}</Badge>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Requested</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.sample_requested_date?.split('T')[0] || selectedSampleForDetails.created_at?.split('T')[0]}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Pickup</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.pickup_date || '—'}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Dispatch</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.dispatch_date || '—'}</p>
                          </div>
                        </div>

                        {/* Buyer Editable Section - Pickup/Dispatch/Delivery Details */}
                        {canProcess && (
                          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <h4 className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              Update Pickup & Dispatch Details
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-[10px] text-slate-600">Pickup Date</Label>
                                <Input
                                  type="date"
                                  size="sm"
                                  className="h-8"
                                  defaultValue={selectedSampleForDetails.pickup_date || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (selectedSampleForDetails.pickup_date || '')) {
                                      handleSamplePickupUpdate(selectedSampleForDetails.id, { pickup_date: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-600">Dispatch Date</Label>
                                <Input
                                  type="date"
                                  size="sm"
                                  className="h-8"
                                  defaultValue={selectedSampleForDetails.dispatch_date || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (selectedSampleForDetails.dispatch_date || '')) {
                                      handleSamplePickupUpdate(selectedSampleForDetails.id, { dispatch_date: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-600">Reference No.</Label>
                                <Input
                                  type="text"
                                  size="sm"
                                  className="h-8"
                                  placeholder="e.g., AWB-12345"
                                  defaultValue={selectedSampleForDetails.dispatch_reference || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (selectedSampleForDetails.dispatch_reference || '')) {
                                      handleSamplePickupUpdate(selectedSampleForDetails.id, { dispatch_reference: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] text-slate-600">Delivery Date</Label>
                                <Input
                                  type="date"
                                  size="sm"
                                  className="h-8"
                                  defaultValue={selectedSampleForDetails.delivery_date || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (selectedSampleForDetails.delivery_date || '')) {
                                      handleSamplePickupUpdate(selectedSampleForDetails.id, { delivery_date: e.target.value });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Dispatch Details - Read-only display */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-indigo-50 rounded-lg">
                            <p className="text-[10px] text-indigo-600 uppercase">Reference No.</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.dispatch_reference || '—'}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-[10px] text-green-600 uppercase">Delivery Date</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.delivery_date || '—'}</p>
                          </div>
                        </div>

                        {/* Requested Items */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Requested Items ({selectedSampleForDetails.line_items?.length || 0})</h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="px-3 py-2 text-left">Material Description</th>
                                  <th className="px-3 py-2 text-left">No. of Samples</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSampleForDetails.line_items?.map((item, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="px-3 py-2">{item.material_description}</td>
                                    <td className="px-3 py-2">{item.number_of_samples}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Preparation Details */}
                        {selectedSampleForDetails.preparation_items?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Preparation Details (by User)</h4>
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-emerald-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Material Code</th>
                                    <th className="px-3 py-2 text-left">Description</th>
                                    <th className="px-3 py-2 text-left">Samples</th>
                                    <th className="px-3 py-2 text-left">Box Type</th>
                                    <th className="px-3 py-2 text-left">Weight</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedSampleForDetails.preparation_items?.map((item, idx) => (
                                    <tr key={idx} className="border-t">
                                      <td className="px-3 py-2 font-mono">{item.material_code || '—'}</td>
                                      <td className="px-3 py-2">{item.description}</td>
                                      <td className="px-3 py-2">{item.number_of_samples}</td>
                                      <td className="px-3 py-2">{item.box_type}</td>
                                      <td className="px-3 py-2">{item.weight || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Tentative Pickup</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.tentative_pickup_date || '—'}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Gate Pass</p>
                            <p className="font-medium text-sm">{selectedSampleForDetails.gate_pass_available ? 'Available' : 'Not Available'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSampleForDetails(null)}>Close</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* PDI, Delivery, Installation - Buyer editable (Removed Dispatch) */}
                {canProcess && (
                  <>
                    {/* Project Planning & Timeline (for Project Timeline Gantt) */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200" data-testid="project-planning-section">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Project Planning & Timeline</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Priority Level <span className="text-red-500">*</span></Label>
                          <Select defaultValue={request.priority_level || "Medium"} onValueChange={(v) => handleUpdate({ priority_level: v })}>
                            <SelectTrigger className="h-9" data-testid="priority-level"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Critical">Critical</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Planned Start <span className="text-red-500">*</span></Label>
                          <Input type="date" size="sm" data-testid="planned-start-date"
                            defaultValue={request.planned_start_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ planned_start_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Planned Completion <span className="text-red-500">*</span></Label>
                          <Input type="date" size="sm" data-testid="planned-completion-date"
                            defaultValue={request.planned_completion_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ planned_completion_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Actual Completion</Label>
                          <Input type="date" size="sm" data-testid="actual-completion-date"
                            defaultValue={request.actual_completion_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ actual_completion_date: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Manufacturing Start</Label>
                          <Input type="date" size="sm" data-testid="manufacturing-start-date"
                            defaultValue={request.manufacturing_start_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ manufacturing_start_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Manufacturing End</Label>
                          <Input type="date" size="sm" data-testid="manufacturing-end-date"
                            defaultValue={request.manufacturing_end_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ manufacturing_end_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Dispatch Date</Label>
                          <Input type="date" size="sm" data-testid="dispatch-date"
                            defaultValue={request.dispatch_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ dispatch_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Closure Date</Label>
                          <Input type="date" size="sm" data-testid="closure-date"
                            defaultValue={request.closure_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ closure_date: e.target.value })} />
                        </div>
                      </div>
                      {request.planned_completion_date && (request.actual_completion_date || request.commissioning_date || request.closure_date) && (
                        <div className="mt-2 text-[10px]">
                          {(() => {
                            const actual = new Date(request.actual_completion_date || request.commissioning_date || request.closure_date);
                            const planned = new Date(request.planned_completion_date);
                            const delta = Math.floor((actual - planned) / (1000 * 60 * 60 * 24));
                            if (delta <= 0) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Completed on time {delta < 0 ? `(${Math.abs(delta)}d early)` : ''}</span>;
                            return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Project completed {delta} day(s) late</span>;
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${request.pdi_status ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">PDI</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" size="sm" defaultValue={request.pdi_date?.split("T")[0] || ""} 
                          onBlur={(e) => handleUpdate({ pdi_date: e.target.value })} />
                        <Select defaultValue={request.pdi_status || ""} onValueChange={(v) => handleUpdate({ pdi_status: v === "blank" ? null : v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="PDI Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="blank">-- Blank --</SelectItem>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Issues Found">Issues Found</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Delivery Section */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${request.delivery_status ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Delivery</span>
                        {request.po_number && !request.expected_delivery_date && (
                          <span className="text-[9px] text-red-600 font-medium ml-1">* Expected date required</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">
                            Expected Delivery <span className="text-red-500">*</span>
                          </Label>
                          <Input type="date" size="sm" data-testid="expected-delivery-date"
                            defaultValue={request.expected_delivery_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ expected_delivery_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Actual Delivery</Label>
                          <Input type="date" size="sm" data-testid="actual-delivery-date"
                            defaultValue={request.delivery_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ delivery_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Status</Label>
                          <Select defaultValue={request.delivery_status || ""} onValueChange={(v) => handleUpdate({ delivery_status: v === "blank" ? null : v })}>
                            <SelectTrigger className="h-9" data-testid="delivery-status"><SelectValue placeholder="Delivery Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blank">-- Blank --</SelectItem>
                              <SelectItem value="Yet to Dispatch">Yet to Dispatch</SelectItem>
                              <SelectItem value="Dispatched">Dispatched</SelectItem>
                              <SelectItem value="Delivery Schedule">Delivery Schedule</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {request.expected_delivery_date && request.delivery_date && (
                        <div className="mt-2 text-[10px]">
                          {new Date(request.delivery_date) <= new Date(request.expected_delivery_date) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              On-Time Delivery
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                              Delayed by {Math.floor((new Date(request.delivery_date) - new Date(request.expected_delivery_date)) / (1000 * 60 * 60 * 24))} day(s)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Installation & Commissioning Section (Combined: Dates + Documents) */}
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${request.commissioning_status === "Completed" ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-medium text-xs uppercase tracking-wide text-slate-600">Installation & Commissioning</span>
                      </div>
                      {/* Expected Dates Row */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">
                            Expected Installation <span className="text-red-500">*</span>
                          </Label>
                          <Input type="date" size="sm" data-testid="expected-installation-date"
                            defaultValue={request.expected_installation_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ expected_installation_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">
                            Expected Commissioning <span className="text-red-500">*</span>
                          </Label>
                          <Input type="date" size="sm" data-testid="expected-commissioning-date"
                            defaultValue={request.expected_commissioning_date?.split("T")[0] || ""}
                            onBlur={(e) => handleUpdate({ expected_commissioning_date: e.target.value })} />
                        </div>
                      </div>
                      {/* Actual Date & Status Row */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Installation Date</Label>
                          <Input type="date" size="sm" defaultValue={request.installation_date?.split("T")[0] || ""} 
                            onBlur={(e) => handleUpdate({ installation_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Commissioning Date</Label>
                          <Input type="date" size="sm" defaultValue={request.commissioning_date?.split("T")[0] || ""} 
                            onBlur={(e) => handleUpdate({ commissioning_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-500 mb-0.5 block">Status</Label>
                          <Select defaultValue={request.commissioning_status || ""} onValueChange={(v) => handleUpdate({ commissioning_status: v === "blank" ? null : v, status: v === "Completed" ? "Completed" : request.status })}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blank">-- Blank --</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/* Documents Row */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200/50">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[9px] text-slate-600 font-medium">Installation Docs</Label>
                            <Button size="sm" variant="ghost" className="h-4 px-1 text-[8px]"
                              onClick={() => handleUpdate({ installation_documents: [...(request.installation_documents || []), { title: '', file_url: null, file_name: null, uploaded_at: new Date().toISOString() }] })}>
                              + Add
                            </Button>
                          </div>
                          {(request.installation_documents || []).map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-1 p-1.5 bg-white rounded border border-slate-200 mb-1">
                              <Input size="sm" placeholder="Title" className="flex-1 h-6 text-[9px]" defaultValue={doc.title || ''}
                                onBlur={(e) => { const d = [...request.installation_documents]; d[idx] = { ...d[idx], title: e.target.value }; handleUpdate({ installation_documents: d }); }} />
                              {doc.file_url ? (
                                <a href={doc.file_url.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${doc.file_url}` : doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[8px] text-indigo-600">View</a>
                              ) : (
                                <Input type="file" className="w-24 h-5 text-[7px]" onChange={async (e) => {
                                  const file = e.target.files[0]; if (!file) return;
                                  const fd = new FormData(); fd.append('file', file); fd.append('document_type', 'installation');
                                  try { const r = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/files/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } }); const d = [...request.installation_documents]; d[idx] = { ...d[idx], file_url: r.data.url, file_name: file.name }; handleUpdate({ installation_documents: d }); } catch { toast.error('Upload failed'); }
                                }} />
                              )}
                              <Button size="sm" variant="ghost" className="h-4 w-4 p-0 text-red-400 text-[9px]" onClick={() => handleUpdate({ installation_documents: request.installation_documents.filter((_, i) => i !== idx) })}>×</Button>
                            </div>
                          ))}
                          {(!request.installation_documents || request.installation_documents.length === 0) && <p className="text-[8px] text-slate-400">No docs</p>}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[9px] text-slate-600 font-medium">Commissioning Docs</Label>
                            <Button size="sm" variant="ghost" className="h-4 px-1 text-[8px]"
                              onClick={() => handleUpdate({ commissioning_documents: [...(request.commissioning_documents || []), { title: '', file_url: null, file_name: null, uploaded_at: new Date().toISOString() }] })}>
                              + Add
                            </Button>
                          </div>
                          {(request.commissioning_documents || []).map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-1 p-1.5 bg-white rounded border border-slate-200 mb-1">
                              <Input size="sm" placeholder="Title" className="flex-1 h-6 text-[9px]" defaultValue={doc.title || ''}
                                onBlur={(e) => { const d = [...request.commissioning_documents]; d[idx] = { ...d[idx], title: e.target.value }; handleUpdate({ commissioning_documents: d }); }} />
                              {doc.file_url ? (
                                <a href={doc.file_url.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${doc.file_url}` : doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[8px] text-indigo-600">View</a>
                              ) : (
                                <Input type="file" className="w-24 h-5 text-[7px]" onChange={async (e) => {
                                  const file = e.target.files[0]; if (!file) return;
                                  const fd = new FormData(); fd.append('file', file); fd.append('document_type', 'commissioning');
                                  try { const r = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/files/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } }); const d = [...request.commissioning_documents]; d[idx] = { ...d[idx], file_url: r.data.url, file_name: file.name }; handleUpdate({ commissioning_documents: d }); } catch { toast.error('Upload failed'); }
                                }} />
                              )}
                              <Button size="sm" variant="ghost" className="h-4 w-4 p-0 text-red-400 text-[9px]" onClick={() => handleUpdate({ commissioning_documents: request.commissioning_documents.filter((_, i) => i !== idx) })}>×</Button>
                            </div>
                          ))}
                          {(!request.commissioning_documents || request.commissioning_documents.length === 0) && <p className="text-[8px] text-slate-400">No docs</p>}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Buyer Uploaded Documents - At Bottom */}
                {canProcess && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-emerald-700 font-semibold flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Uploaded by Buyer
                      </Label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('type', 'buyer_document');
                            try {
                              const res = await axios.post(`${API}/files/upload`, formData);
                              const newAttachment = {
                                file_id: res.data.file_id,
                                filename: file.name,
                                type: 'buyer_document',
                                uploaded_at: new Date().toISOString()
                              };
                              const currentAttachments = request.buyer_attachments || [];
                              await axios.put(`${API}/capex-requests/${id}`, {
                                buyer_attachments: [...currentAttachments, newAttachment]
                              });
                              refreshRequest();
                            } catch (error) {
                              toast.error("Failed to upload document");
                            }
                          }}
                          data-testid="buyer-upload-input"
                        />
                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] hover:bg-emerald-200 transition-colors">
                          <Upload className="w-3 h-3" />
                          Upload
                        </span>
                      </label>
                    </div>
                    {request.buyer_attachments && request.buyer_attachments.length > 0 ? (
                      <div className="space-y-1">
                        {request.buyer_attachments.map((att, idx) => (
                          <button
                            key={att.file_id || idx}
                            onClick={async () => {
                              try {
                                const response = await axios.get(`${API}/files/${att.file_id}/download`, {
                                  responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', att.filename);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                              } catch (error) {
                                toast.error("Failed to download file");
                              }
                            }}
                            className="flex items-center gap-2 p-1.5 bg-white hover:bg-emerald-100 rounded text-xs transition-colors text-left w-full"
                          >
                            <File className="w-3 h-3 text-emerald-500" />
                            <span className="truncate flex-1 text-slate-700">{att.filename}</span>
                            <Download className="w-3 h-3 text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-emerald-600">No documents uploaded</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* DAP Status & Documents - Visible to Buyer, User, DH, PE */}
          {dap && (
          <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50" data-testid="dap-documents-card">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-violet-800">
                  <FileText className="w-4 h-4" />
                  DAP Status
                </CardTitle>
                <Badge className={dap.status === "Approved" ? "bg-emerald-100 text-emerald-800" : dap.status === "Changes Required" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
                  {dap.status} (v{dap.version})
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Approval Progress */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-violet-500 uppercase font-bold">Approval Progress</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Process Eng.", status: dap.process_engineer_approval_status },
                    { label: "Dept Head", status: dap.dept_head_approval_status },
                    { label: "User", status: dap.user_approval_status },
                  ].map((step, i) => (
                    <div key={i} className="p-1.5 bg-white rounded border text-center">
                      <p className="text-[9px] text-slate-500">{step.label}</p>
                      <Badge variant="secondary" className={`text-[9px] mt-0.5 ${
                        step.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                        step.status === "Changes Required" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{step.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* DAP Documents */}
              {dap.documents && dap.documents.length > 0 && (
                <div>
                  <Label className="text-[10px] text-violet-500 uppercase font-bold mb-1.5 block">DAP Documents</Label>
                  <div className="space-y-1">
                    {dap.documents.map((docUrl, idx) => (
                      <a key={idx} href={docUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-white hover:bg-violet-50 rounded border border-violet-100 text-xs transition-colors"
                        data-testid={`dap-doc-${idx}`}>
                        <File className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        <span className="flex-1 truncate text-slate-700">Document {idx + 1}</span>
                        <Download className="w-3.5 h-3.5 text-violet-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* DAP Dates */}
              {request.dap_dates && request.dap_dates.length > 0 && (
                <div>
                  <Label className="text-[10px] text-violet-500 uppercase font-bold mb-1 block">DAP Dates</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {request.dap_dates.map((date, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] border-violet-200">
                        {new Date(date).toLocaleDateString()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Change Requests Log */}
              {dap.change_requests && dap.change_requests.length > 0 && (
                <div>
                  <Label className="text-[10px] text-violet-500 uppercase font-bold mb-1.5 block">Change Requests</Label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {dap.change_requests.map((cr, idx) => (
                      <div key={idx} className="p-1.5 bg-white rounded border text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">{cr.requested_by} ({cr.role})</span>
                          <span className="text-slate-400">{new Date(cr.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{cr.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DAP Approval Buttons - Role-specific */}
              {((user?.role === "process_engineering" && dap.process_engineer_approval_status === "Pending") ||
                (user?.role === "user" && dap.dept_head_approval_status === "Approved" && dap.user_approval_status === "Pending") ||
                (user?.role === "department_head" && dap.process_engineer_approval_status === "Approved" && dap.dept_head_approval_status === "Pending")) && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                    onClick={() => { setDapApprovalAction("approve"); setDapApprovalDialogOpen(true); }}
                    data-testid="dap-approve-btn">
                    <CheckCircle className="w-3 h-3" /> Approve DAP
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => { setDapApprovalAction("request_changes"); setDapApprovalDialogOpen(true); }}
                    data-testid="dap-request-changes-btn">
                    Request Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Sidebar */}
        <RequestDetailSidebar
          request={request} sampleRequests={sampleRequests} comments={comments}
          dap={dap} buyers={buyers} user={user}
          canProcess={canProcess} canUpdatePreparation={canUpdatePreparation}
          hasMultipleItems={hasMultipleItems} selectedItem={selectedItem} hasAccess={hasAccess}
          selectedSampleForDetails={selectedSampleForDetails}
          setSelectedSampleForDetails={setSelectedSampleForDetails}
          setNewSampleDialogOpen={setNewSampleDialogOpen}
          handleUpdate={handleUpdate} handleSamplePickup={handleSamplePickupUpdate}
          setUnderPrepDialog={setUnderPrepDialog} setBuyerDecisionDialog={setBuyerDecisionDialog}
          setDispatchDialog={setDispatchDialog} setDispatchItems={setDispatchItems}
          newComment={newComment} setNewComment={setNewComment}
          handleCommentSubmit={handleCommentSubmit} isSubmitting={isSubmitting}
          formatDate={formatDate} formatDateTime={formatDateTime}
        />
      </div>

      <RequestDetailDialogs
        id={id} isSubmitting={isSubmitting}
        dapDialogOpen={dapDialogOpen} setDapDialogOpen={setDapDialogOpen} handleCreateDap={handleCreateDap}
        dapApprovalDialogOpen={dapApprovalDialogOpen} setDapApprovalDialogOpen={setDapApprovalDialogOpen}
        dapApprovalAction={dapApprovalAction}
        dapChangeType={dapChangeType} setDapChangeType={setDapChangeType}
        dapComment={dapComment} setDapComment={setDapComment} handleDapApproval={handleDapApproval}
        newSampleDialogOpen={newSampleDialogOpen} setNewSampleDialogOpen={setNewSampleDialogOpen}
        newSampleItems={newSampleItems} setNewSampleItems={setNewSampleItems}
        handleCreateSample={handleCreateSample} isCreatingSample={isCreatingSample}
        underPrepDialog={underPrepDialog} setUnderPrepDialog={setUnderPrepDialog}
        expectedReadinessDate={expectedReadinessDate} setExpectedReadinessDate={setExpectedReadinessDate}
        handleUnderPrepSubmit={handleUnderPrepSubmit}
        dispatchDialog={dispatchDialog} setDispatchDialog={setDispatchDialog}
        dispatchItems={dispatchItems} setDispatchItems={setDispatchItems}
        gatePassAvailable={gatePassAvailable} setGatePassAvailable={setGatePassAvailable}
        gatePassUploading={gatePassUploading} gatePassUrl={gatePassUrl}
        handleGatePassUpload={handleGatePassUpload} handleDispatchSubmit={handleDispatchSubmit}
        isSubmittingDispatch={isSubmittingDispatch}
        buyerDecisionDialog={buyerDecisionDialog} setBuyerDecisionDialog={setBuyerDecisionDialog}
        handleBuyerDecision={handleBuyerDecision}
      />
    </div>
  );
}
