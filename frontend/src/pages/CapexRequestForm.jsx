import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, CheckCircle, FileText, Upload, File, X, Zap } from "lucide-react";

const ATTACHMENT_TYPES = [
  { id: "business_case", label: "Business Case", desc: "Upload business case" },
  { id: "justification", label: "Justification", desc: "Upload justification" },
  { id: "quotation", label: "Quotations", desc: "Upload quotations" },
];

export default function CapexRequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plants, setPlants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [uploadingType, setUploadingType] = useState(null);
  
  const fileInputRefs = {
    business_case: useRef(null),
    justification: useRef(null),
    quotation: useRef(null),
  };
  
  const [formData, setFormData] = useState({
    plant: user?.plant || "",
    department: user?.department || "",
    asset_category: "", // "plant_machinery" or "building"
    requirement_items: [{ description: "", quantity: 1, pr_available: false, pr_number: "" }],
    requirement_type: "",
    cea_required: false,
    cea_type: "", // "new" or "existing"
    existing_cea_number: "",
    dap_required: false,
    justification: "",
    attachments: [],
  });

  // When CEA type changes to "new", disable all PR toggles
  const isNewCEA = formData.cea_required && formData.cea_type === "new";

  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [plantsRes, deptsRes] = await Promise.all([
          axios.get(`${API}/reference/plants`),
          axios.get(`${API}/reference/departments`)
        ]);
        setPlants(plantsRes.data);
        setDepartments(deptsRes.data);
      } catch (error) {
        console.error("Failed to fetch reference data:", error);
      }
    };
    fetchReferenceData();
  }, []);

  const updateFormData = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If CEA required is turned off, reset CEA type and number
      if (field === "cea_required" && !value) {
        updated.cea_type = "";
        updated.existing_cea_number = "";
      }
      
      // If CEA type changes to "new", disable all PR toggles in requirement items
      if (field === "cea_type" && value === "new") {
        updated.requirement_items = prev.requirement_items.map(item => ({
          ...item,
          pr_available: false,
          pr_number: ""
        }));
      }
      
      return updated;
    });
  };

  const addRequirementItem = () => {
    setFormData(prev => ({
      ...prev,
      requirement_items: [...prev.requirement_items, { description: "", quantity: 1, pr_available: false, pr_number: "" }]
    }));
  };

  const removeRequirementItem = (index) => {
    if (formData.requirement_items.length > 1) {
      setFormData(prev => ({
        ...prev,
        requirement_items: prev.requirement_items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateRequirementItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      requirement_items: prev.requirement_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    setUploadingType(fileType);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("file_type", fileType);
      const response = await axios.post(`${API}/upload`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const newAttachment = {
        id: response.data.id || response.data.file_id,
        filename: response.data.filename,
        type: fileType,
        size: response.data.size,
        uploaded_at: response.data.uploaded_at
      };
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }));
      toast.success(`Uploaded: ${file.name}`);
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploadingType(null);
      if (fileInputRefs[fileType]?.current) fileInputRefs[fileType].current.value = "";
    }
  };

  const removeAttachment = (attachmentId) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }));
  };

  const getAttachmentsByType = (type) => formData.attachments.filter(att => att.type === type);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const validateForm = () => {
    // Use user's plant/department if assigned, otherwise use form data
    const plantToUse = user?.plant || formData.plant;
    const departmentToUse = user?.department || formData.department;
    
    if (!plantToUse || !departmentToUse) {
      toast.error("Select plant and department");
      return false;
    }
    if (!formData.requirement_type) {
      toast.error("Select requirement type");
      return false;
    }
    const hasValidItems = formData.requirement_items.some(item => item.description.trim() !== "");
    if (!hasValidItems) {
      toast.error("Add at least one requirement");
      return false;
    }
    // Check PR numbers if PR is available (and not new CEA)
    if (!isNewCEA) {
      for (let item of formData.requirement_items) {
        if (item.pr_available && !item.pr_number) {
          toast.error("Enter PR number for items with PR Available");
          return false;
        }
      }
    }
    // Validate CEA fields
    if (formData.cea_required) {
      if (!formData.cea_type) {
        toast.error("Select CEA type (New or Existing)");
        return false;
      }
      if (formData.cea_type === "existing" && !formData.existing_cea_number) {
        toast.error("Enter WBS number");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const validItems = formData.requirement_items.filter(item => item.description.trim() !== "");
    
    // Use user's plant/department if assigned, otherwise use form data
    const plantToUse = user?.plant || formData.plant;
    const departmentToUse = user?.department || formData.department;
    
    // Check if any item has PR available (only if not New CEA)
    const hasAnyPR = !isNewCEA && validItems.some(item => item.pr_available);
    const prNumber = hasAnyPR ? validItems.find(item => item.pr_available)?.pr_number || null : null;

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/capex-requests`, {
        plant: plantToUse,
        department: departmentToUse,
        asset_category: formData.asset_category,
        requirement_items: validItems,
        requirement_type: formData.requirement_type,
        cea_required: formData.cea_required,
        cea_type: formData.cea_type || null,
        existing_cea_number: formData.cea_type === "existing" ? formData.existing_cea_number : null,
        pr_available: hasAnyPR,
        pr_number: prNumber,
        dap_required: formData.dap_required,
        justification: formData.justification,
        attachments: formData.attachments
      });
      toast.success(`Request ${response.data.id} created!`);
      navigate(`/requests/${response.data.id}`);
    } catch (error) {
      const errorMessage = error.response?.data?.detail;
      if (typeof errorMessage === 'string') {
        toast.error(errorMessage);
      } else if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.map(e => e.msg || e.message || String(e)).join(', '));
      } else {
        toast.error("Failed to create request");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" data-testid="capex-request-form">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-white">
        {/* Header */}
        <CardHeader className="py-4 px-6 bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">New Capex Request</CardTitle>
              <p className="text-[11px] text-slate-300 mt-0.5">Submit capital expenditure request</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Requester Info */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 p-3 bg-slate-50/80 rounded-lg border border-slate-100">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Requester</span>
              <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Email</span>
              <p className="text-xs font-medium text-slate-600">{user?.email}</p>
            </div>
          </div>

          {/* Plant, Department, Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
                Plant <span className="text-rose-500">*</span>
              </Label>
              {user?.plant ? (
                // User has assigned plant - show as locked/readonly
                <div className="h-8 px-3 text-xs bg-slate-100 border border-slate-200 rounded-md flex items-center justify-between" data-testid="plant-readonly">
                  <span>{user.plant}</span>
                  <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">Auto-filled</span>
                </div>
              ) : (
                // No assigned plant - allow selection (for Buyer/Capex Head)
                <Select value={formData.plant} onValueChange={(v) => updateFormData("plant", v)}>
                  <SelectTrigger className="h-8 text-xs" data-testid="plant-select">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((plant) => <SelectItem key={plant} value={plant} className="text-xs">{plant}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
                Department <span className="text-rose-500">*</span>
              </Label>
              {user?.department ? (
                // User has assigned department - show as locked/readonly
                <div className="h-8 px-3 text-xs bg-slate-100 border border-slate-200 rounded-md flex items-center justify-between" data-testid="department-readonly">
                  <span>{user.department}</span>
                  <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">Auto-filled</span>
                </div>
              ) : (
                // No assigned department - allow selection (for Buyer/Capex Head)
                <Select value={formData.department} onValueChange={(v) => updateFormData("department", v)}>
                  <SelectTrigger className="h-8 text-xs" data-testid="department-select">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
                Type <span className="text-rose-500">*</span>
              </Label>
              <Select value={formData.requirement_type} onValueChange={(v) => updateFormData("requirement_type", v)}>
                <SelectTrigger className="h-8 text-xs" data-testid="type-select">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New" className="text-xs">New</SelectItem>
                  <SelectItem value="Retrofitment" className="text-xs">Retrofitment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Asset Category - Plant & Machinery or Building */}
          <div className="p-3 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg border border-indigo-100">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">
              Asset Category <span className="text-rose-500">*</span>
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateFormData("asset_category", "plant_machinery")}
                className={`flex-1 p-3 rounded-lg border-2 transition-all text-xs font-medium flex items-center justify-center gap-2 ${
                  formData.asset_category === "plant_machinery"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                data-testid="asset-plant-machinery"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Plant & Machinery
              </button>
              <button
                type="button"
                onClick={() => updateFormData("asset_category", "building")}
                className={`flex-1 p-3 rounded-lg border-2 transition-all text-xs font-medium flex items-center justify-center gap-2 ${
                  formData.asset_category === "building"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                data-testid="asset-building"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Building
              </button>
            </div>
          </div>

          {/* CEA Required - Right after Type */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
            <div>
              <span className="text-xs font-semibold text-slate-700">CEA Required</span>
              <p className="text-[10px] text-slate-500">Capital Expenditure Authorization</p>
            </div>
            <Switch
              checked={formData.cea_required}
              onCheckedChange={(c) => updateFormData("cea_required", c)}
              data-testid="cea-toggle"
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          {/* CEA Type - New or Existing (only shows when CEA is required) */}
          {formData.cea_required && (
            <div className="p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-lg border border-amber-100/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">
                  CEA Type <span className="text-rose-500">*</span>
                </Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => updateFormData("cea_type", "new")}
                    className={`flex-1 p-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                      formData.cea_type === "new"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    data-testid="cea-type-new"
                  >
                    New CEA
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData("cea_type", "existing")}
                    className={`flex-1 p-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                      formData.cea_type === "existing"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    data-testid="cea-type-existing"
                  >
                    Existing CEA
                  </button>
                </div>
              </div>

              {/* Existing CEA Number field - labeled as WBS No */}
              {formData.cea_type === "existing" && (
                <div className="animate-in slide-in-from-top-1 duration-200">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
                    WBS No <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter WBS number"
                    value={formData.existing_cea_number}
                    onChange={(e) => updateFormData("existing_cea_number", e.target.value)}
                    className="h-8 text-xs bg-white"
                    data-testid="wbs-number-input"
                  />
                </div>
              )}
            </div>
          )}

          {/* Requirements Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Requirements <span className="text-rose-500">*</span>
              </Label>
              <Button type="button" variant="ghost" size="sm" onClick={addRequirementItem} 
                className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2"
                data-testid="add-requirement-btn">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {formData.requirement_items.map((item, index) => (
                <div key={index} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors" 
                  data-testid={`requirement-item-${index}`}>
                  <div className="flex gap-3">
                    {/* Description */}
                    <div className="flex-1">
                      <Label className="text-[10px] text-slate-500 mb-1 block">Description</Label>
                      <Textarea
                        placeholder="Describe requirement..."
                        value={item.description}
                        onChange={(e) => updateRequirementItem(index, "description", e.target.value)}
                        className="min-h-[60px] text-xs bg-white resize-none"
                        data-testid={`requirement-desc-${index}`}
                      />
                    </div>
                    {/* Qty + PR Available in parallel */}
                    <div className="w-48 space-y-2">
                      <div className="flex gap-2">
                        <div className="w-16">
                          <Label className="text-[10px] text-slate-500 mb-1 block">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateRequirementItem(index, "quantity", parseInt(e.target.value) || 1)}
                            className="h-8 text-xs bg-white text-center"
                            data-testid={`requirement-qty-${index}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px] text-slate-500 mb-1 block">PR Available</Label>
                          <div className={`h-8 flex items-center justify-center rounded-md border px-2 ${
                            isNewCEA ? "bg-slate-100 cursor-not-allowed" : "bg-white"
                          }`}>
                            <Switch
                              checked={item.pr_available}
                              onCheckedChange={(c) => updateRequirementItem(index, "pr_available", c)}
                              data-testid={`pr-toggle-${index}`}
                              disabled={isNewCEA}
                              className={`scale-75 ${isNewCEA ? "opacity-50" : ""} data-[state=checked]:bg-emerald-500`}
                            />
                            <span className={`text-[10px] ml-1.5 ${isNewCEA ? "text-slate-400" : "text-slate-600"}`}>
                              {item.pr_available ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* PR Number - Only shows when PR Available */}
                      {item.pr_available && (
                        <div className="animate-in slide-in-from-top-1 duration-200">
                          <Label className="text-[10px] text-slate-500 mb-1 block">PR Number</Label>
                          <Input
                            placeholder="Enter PR No."
                            value={item.pr_number}
                            onChange={(e) => updateRequirementItem(index, "pr_number", e.target.value)}
                            className="h-8 text-xs bg-white"
                            data-testid={`pr-number-${index}`}
                          />
                        </div>
                      )}
                    </div>
                    {/* Delete button */}
                    {formData.requirement_items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-5 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        onClick={() => removeRequirementItem(index)}
                        data-testid={`remove-requirement-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DAP Required */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100">
            <div>
              <span className="text-xs font-semibold text-slate-700">DAP Required</span>
              <p className="text-[10px] text-slate-500">Drawing Approval Process</p>
            </div>
            <Switch
              checked={formData.dap_required}
              onCheckedChange={(c) => updateFormData("dap_required", c)}
              data-testid="dap-toggle"
              className="data-[state=checked]:bg-violet-500"
            />
          </div>

          {/* Attachments - Compact Grid */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Attachments <span className="text-slate-400 font-normal">(PDF, DOC, XLS - Max 10MB)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ATTACHMENT_TYPES.map((type) => {
                const attachments = getAttachmentsByType(type.id);
                const isUploading = uploadingType === type.id;
                return (
                  <div key={type.id} className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-600">{type.label}</span>
                      <input type="file" ref={fileInputRefs[type.id]} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => handleFileUpload(e, type.id)} data-testid={`file-input-${type.id}`} />
                      <Button type="button" variant="ghost" size="sm" 
                        className="h-5 px-1.5 text-[9px] text-indigo-600 hover:text-indigo-700"
                        onClick={() => fileInputRefs[type.id]?.current?.click()} disabled={isUploading}
                        data-testid={`upload-btn-${type.id}`}>
                        {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Upload className="w-2.5 h-2.5 mr-0.5" />Add</>}
                      </Button>
                    </div>
                    {attachments.length > 0 ? (
                      <div className="space-y-1">
                        {attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 p-1.5 bg-white rounded text-[10px] group">
                            <File className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                            <span className="flex-1 truncate text-slate-600" title={att.filename}>{att.filename}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100"
                              onClick={() => removeAttachment(att.id)}>
                              <X className="w-2.5 h-2.5 text-slate-400 hover:text-rose-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400 text-center py-1">No files</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Justification Notes */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
              Business Justification
            </Label>
            <Textarea
              placeholder="Additional notes or justification (optional)..."
              value={formData.justification}
              onChange={(e) => updateFormData("justification", e.target.value)}
              className="min-h-[70px] text-xs resize-none"
              data-testid="justification-input"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" className="h-8 px-4 text-xs" onClick={() => navigate("/dashboard")} data-testid="cancel-btn">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}
              className="h-8 px-5 text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25"
              data-testid="submit-request-btn">
              {isSubmitting ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Submitting...</> : <>Submit<CheckCircle className="w-3 h-3 ml-1.5" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
