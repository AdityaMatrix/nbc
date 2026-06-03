import { useState, useRef, useEffect } from "react";
import { API, useAuth } from "@/App";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, CheckCircle, XCircle,
  AlertCircle, FileText, Loader2, ArrowRight, History, RotateCcw, Clock
} from "lucide-react";

export default function BulkUploadDialog({ open, onOpenChange, onUploadComplete }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [rollingBackId, setRollingBackId] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("capex_token");

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(`${API}/capex-requests/bulk-upload/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistoryLogs(response.data);
    } catch {
      toast.error("Failed to load upload history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === "history") {
      fetchHistory();
    }
  }, [open, activeTab]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/capex-requests/bulk-template`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Capex_Bulk_Upload_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded!");
    } catch {
      toast.error("Failed to download template");
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const validateAndSetFile = (f) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error("Only .xlsx, .xls, or .csv files are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setFile(f);
    setResults(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API}/capex-requests/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResults(response.data);
      const { summary } = response.data;

      if (summary.errors === 0) {
        toast.success(`Processed ${summary.total_processed} rows: ${summary.created} created, ${summary.updated} updated`);
      } else {
        toast.warning(`${summary.created} created, ${summary.updated} updated, ${summary.errors} failed`);
      }

      if (onUploadComplete && (summary.created > 0 || summary.updated > 0)) {
        onUploadComplete();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRollback = async (uploadId) => {
    if (!window.confirm("Are you sure you want to rollback this upload? Created requests will be deleted and updated requests will be reverted to their previous values.")) {
      return;
    }
    setRollingBackId(uploadId);
    try {
      const response = await axios.post(
        `${API}/capex-requests/bulk-upload/${uploadId}/rollback`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data;
      toast.success(`Rollback complete: ${data.deleted} deleted, ${data.reverted} reverted`);
      fetchHistory();
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Rollback failed");
    } finally {
      setRollingBackId(null);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onOpenChange(false);
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="bulk-upload-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
            Bulk Upload Capex Requests
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to create or update requests in bulk. View history and rollback past uploads.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="upload" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-upload">
              <Upload className="w-3.5 h-3.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-history">
              <History className="w-3.5 h-3.5" /> History
            </TabsTrigger>
          </TabsList>

          {/* === UPLOAD TAB === */}
          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* Step 1: Download Template */}
            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-900">Download the Template</p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  Pre-formatted Excel with "New Requests" and "Update Existing" sheets.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  onClick={handleDownloadTemplate}
                  data-testid="download-template-btn"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download Template
                </Button>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-900">Upload Your File</p>
                <p className="text-xs text-emerald-600 mt-0.5">Supports .xlsx, .xls, .csv (max 10MB)</p>

                <div
                  className={`mt-3 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-emerald-400 bg-emerald-100"
                      : file
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="file-drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="file-input"
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-emerald-800 truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-emerald-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-slate-500"
                        onClick={(e) => { e.stopPropagation(); setFile(null); setResults(null); }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">
                        <span className="text-emerald-600 font-medium">Click to browse</span> or drag & drop
                      </p>
                      <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv</p>
                    </div>
                  )}
                </div>

                {file && !results && (
                  <Button
                    className="mt-3 w-full h-10 text-sm font-medium text-white"
                    style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))" }}
                    onClick={handleUpload}
                    disabled={isUploading}
                    data-testid="upload-btn"
                  >
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Upload & Process</>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl" data-testid="upload-results">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <p className="text-sm font-semibold text-slate-800">Upload Results</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                    Total: {results.summary.total_processed}
                  </Badge>
                  {results.summary.created > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" /> Created: {results.summary.created}
                    </Badge>
                  )}
                  {results.summary.updated > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      <ArrowRight className="w-3 h-3 mr-1" /> Updated: {results.summary.updated}
                    </Badge>
                  )}
                  {results.summary.errors > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                      <XCircle className="w-3 h-3 mr-1" /> Failed: {results.summary.errors}
                    </Badge>
                  )}
                </div>

                {results.created.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 mb-1">Created:</p>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {results.created.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          <span className="font-mono font-medium">{r.request_id}</span>
                          <span className="text-emerald-500 truncate">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.updated.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-1">Updated:</p>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {results.updated.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          <ArrowRight className="w-3 h-3 flex-shrink-0" />
                          <span className="font-mono font-medium">{r.request_id}</span>
                          <span className="text-blue-500 truncate">{r.fields_updated?.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {results.errors.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Row {r.row}:</span>{" "}
                            {r.errors?.join("; ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs mt-2"
                  onClick={() => { setFile(null); setResults(null); }}
                  data-testid="upload-another-btn"
                >
                  Upload Another File
                </Button>
              </div>
            )}
          </TabsContent>

          {/* === HISTORY TAB === */}
          <TabsContent value="history" className="mt-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading history...
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No upload history yet</p>
                <p className="text-xs text-slate-400 mt-1">Your bulk uploads will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto" data-testid="history-list">
                {historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border transition-all ${
                      log.status === "rolled_back"
                        ? "bg-slate-50 border-slate-200 opacity-70"
                        : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                    }`}
                    data-testid={`history-item-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileSpreadsheet className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-slate-800 truncate">{log.filename}</span>
                          {log.status === "rolled_back" ? (
                            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 text-[10px]">
                              <RotateCcw className="w-2.5 h-2.5 mr-1" /> Rolled Back
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Active
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(log.uploaded_at)}
                          </span>
                          <span>by {log.user_name}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {log.summary?.created > 0 && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5">
                              {log.summary.created} created
                            </Badge>
                          )}
                          {log.summary?.updated > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-5">
                              {log.summary.updated} updated
                            </Badge>
                          )}
                          {log.summary?.errors > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] h-5">
                              {log.summary.errors} failed
                            </Badge>
                          )}
                        </div>

                        {log.status === "rolled_back" && log.rolled_back_at && (
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            Rolled back on {formatDate(log.rolled_back_at)} by {log.rolled_back_by}
                          </p>
                        )}
                      </div>

                      {log.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-shrink-0"
                          onClick={() => handleRollback(log.id)}
                          disabled={rollingBackId === log.id}
                          data-testid={`rollback-btn-${log.id}`}
                        >
                          {rollingBackId === log.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <><RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
