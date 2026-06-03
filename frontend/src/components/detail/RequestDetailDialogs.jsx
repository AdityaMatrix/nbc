import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload, Loader2, XCircle, Check, Plus
} from "lucide-react";

export const RequestDetailDialogs = ({
  id, isSubmitting,
  dapDialogOpen, setDapDialogOpen, handleCreateDap,
  dapApprovalDialogOpen, setDapApprovalDialogOpen, dapApprovalAction,
  dapChangeType, setDapChangeType, dapComment, setDapComment, handleDapApproval,
  newSampleDialogOpen, setNewSampleDialogOpen, newSampleItems, setNewSampleItems,
  handleCreateSample, isCreatingSample,
  underPrepDialog, setUnderPrepDialog, expectedReadinessDate, setExpectedReadinessDate,
  handleUnderPrepSubmit,
  dispatchDialog, setDispatchDialog, dispatchItems, setDispatchItems,
  gatePassAvailable, setGatePassAvailable, gatePassUploading, gatePassUrl,
  handleGatePassUpload, handleDispatchSubmit, isSubmittingDispatch,
  buyerDecisionDialog, setBuyerDecisionDialog, handleBuyerDecision
}) => {
  return (
    <>
      {/* DAP Create Dialog */}
      <Dialog open={dapDialogOpen} onOpenChange={setDapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create DAP Document</DialogTitle>
            <DialogDescription>Upload drawings/specifications for approval</DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <Input type="file" className="mt-2" accept=".pdf,.doc,.docx,.dwg" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDapDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDap} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create DAP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DAP Approval Dialog */}
      <Dialog open={dapApprovalDialogOpen} onOpenChange={setDapApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dapApprovalAction === "approve" ? "Approve DAP" : "Request Changes"}</DialogTitle>
          </DialogHeader>
          {dapApprovalAction === "request_changes" && (
            <div className="space-y-3">
              <Select value={dapChangeType} onValueChange={setDapChangeType}>
                <SelectTrigger><SelectValue placeholder="Change type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Minor Revision Required">Minor Revision</SelectItem>
                  <SelectItem value="Major Revision Required">Major Revision</SelectItem>
                  <SelectItem value="Re-submit DAP">Re-submit DAP</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={dapComment} onChange={(e) => setDapComment(e.target.value)} placeholder="Describe changes..." className="min-h-[80px]" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDapApprovalDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDapApproval} disabled={isSubmitting} className={dapApprovalAction === "approve" ? "bg-emerald-600" : ""}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {dapApprovalAction === "approve" ? "Approve" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Sample Request Dialog */}
      <Dialog open={newSampleDialogOpen} onOpenChange={setNewSampleDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="new-sample-dialog">
          <DialogHeader>
            <DialogTitle>New Sample Request</DialogTitle>
            <DialogDescription>Request samples for {id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            <Label className="text-sm font-semibold">Sample Line Items</Label>
            {newSampleItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-600">Item {idx + 1}</span>
                  {newSampleItems.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => setNewSampleItems(prev => prev.filter((_, i) => i !== idx))}>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  )}
                </div>
                <Input placeholder="Material description *" value={item.material_description}
                  onChange={(e) => setNewSampleItems(prev => prev.map((it, i) => i === idx ? { ...it, material_description: e.target.value } : it))}
                  data-testid={`sample-item-desc-${idx}`} />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500 whitespace-nowrap">Qty:</Label>
                  <Input type="number" min="1" value={item.number_of_samples} className="w-20"
                    onChange={(e) => setNewSampleItems(prev => prev.map((it, i) => i === idx ? { ...it, number_of_samples: parseInt(e.target.value) || 1 } : it))}
                    data-testid={`sample-item-qty-${idx}`} />
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-xs" onClick={() => setNewSampleItems(prev => [...prev, { material_description: "", number_of_samples: 1 }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Another Item
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSampleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSample} disabled={isCreatingSample} data-testid="submit-new-sample-btn">
              {isCreatingSample ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create Sample Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Under Preparation Dialog */}
      <Dialog open={underPrepDialog.open} onOpenChange={(v) => setUnderPrepDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-sm" data-testid="under-prep-dialog">
          <DialogHeader>
            <DialogTitle>Under Preparation</DialogTitle>
            <DialogDescription>Enter expected material readiness date</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Expected Readiness Date *</Label>
              <Input
                type="date"
                value={expectedReadinessDate}
                onChange={(e) => setExpectedReadinessDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                data-testid="readiness-date-input"
              />
              <p className="text-[10px] text-slate-500 mt-1">Buyer will be notified with this date</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnderPrepDialog({ open: false, sampleId: null })}>Cancel</Button>
            <Button onClick={handleUnderPrepSubmit} className="bg-blue-600 hover:bg-blue-700" data-testid="submit-under-prep-btn">
              Mark Under Preparation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ready for Dispatch Dialog */}
      <Dialog open={dispatchDialog.open} onOpenChange={(v) => setDispatchDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dispatch-dialog">
          <DialogHeader>
            <DialogTitle>Ready for Dispatch - Dispatch Details</DialogTitle>
            <DialogDescription>Fill dispatch details for all sample items</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Items ({dispatchItems.length})</Label>
            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-3 pr-2">
                {dispatchItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border space-y-2" data-testid={`dispatch-item-${idx}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">Item {idx + 1}</span>
                      {dispatchItems.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => setDispatchItems(prev => prev.filter((_, i) => i !== idx))}>
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-500">Material Description *</Label>
                        <Input placeholder="Material description" value={item.description}
                          onChange={(e) => setDispatchItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                          data-testid={`dispatch-desc-${idx}`} />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500">Material Code</Label>
                        <Input placeholder="Material code" value={item.material_code}
                          onChange={(e) => setDispatchItems(prev => prev.map((it, i) => i === idx ? { ...it, material_code: e.target.value } : it))}
                          data-testid={`dispatch-code-${idx}`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-slate-500">Number of Samples</Label>
                        <Input type="number" min="1" value={item.number_of_samples}
                          onChange={(e) => setDispatchItems(prev => prev.map((it, i) => i === idx ? { ...it, number_of_samples: parseInt(e.target.value) || 1 } : it))}
                          data-testid={`dispatch-qty-${idx}`} />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500">Type of Packing</Label>
                        <select value={item.type_of_packing}
                          onChange={(e) => setDispatchItems(prev => prev.map((it, i) => i === idx ? { ...it, type_of_packing: e.target.value } : it))}
                          className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                          data-testid={`dispatch-packing-${idx}`}>
                          <option value="Wooden">Wooden</option>
                          <option value="Corrugated Box">Corrugated Box</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button variant="outline" size="sm" className="w-full text-xs"
              onClick={() => setDispatchItems(prev => [...prev, { description: "", material_code: "", number_of_samples: 1, type_of_packing: "Wooden" }])}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Another Item
            </Button>

            <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Gate Pass Available?</Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={gatePassAvailable}
                    onChange={(e) => setGatePassAvailable(e.target.checked)}
                    className="sr-only peer" data-testid="gate-pass-toggle" />
                  <div className="w-9 h-5 bg-slate-300 peer-checked:bg-green-500 rounded-full
                    after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white
                    after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
              {gatePassAvailable && (
                <div className="space-y-2">
                  <Label className="text-[10px] text-slate-500">Upload Gate Pass Document</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleGatePassUpload} disabled={gatePassUploading}
                      className="text-xs" data-testid="gate-pass-upload" />
                    {gatePassUploading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  </div>
                  {gatePassUrl && (
                    <div className="flex items-center gap-1 text-[10px] text-green-600">
                      <Check className="w-3 h-3" /> Gate pass uploaded successfully
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchDialog({ open: false, sampleId: null, lineItems: [] })}>Cancel</Button>
            <Button onClick={handleDispatchSubmit} disabled={isSubmittingDispatch}
              className="bg-green-600 hover:bg-green-700" data-testid="submit-dispatch-btn">
              {isSubmittingDispatch ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Submit Dispatch Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buyer Decision Dialog */}
      <Dialog open={buyerDecisionDialog.open} onOpenChange={(v) => setBuyerDecisionDialog(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-sm" data-testid="buyer-decision-dialog">
          <DialogHeader>
            <DialogTitle>Select Document Type</DialogTitle>
            <DialogDescription>
              {buyerDecisionDialog.gatePassAvailable
                ? "Gate pass is available. Automatically tagged as Gate Pass."
                : "No gate pass uploaded. Choose the document type."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {buyerDecisionDialog.gatePassAvailable ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">Gate Pass</p>
                <p className="text-[10px] text-green-600 mt-1">User uploaded gate pass - automatically selected</p>
                <Button className="mt-3 bg-green-600 hover:bg-green-700 w-full" size="sm"
                  onClick={() => handleBuyerDecision("Gate Pass")}
                  data-testid="confirm-gate-pass-btn">
                  Confirm Gate Pass
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleBuyerDecision("Job Work Challan")}
                  className="p-4 border-2 rounded-lg text-left hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                  data-testid="select-jwc-btn">
                  <p className="text-sm font-semibold text-slate-800">Job Work Challan</p>
                  <p className="text-[10px] text-slate-500 mt-1">Material sent for job work processing</p>
                </button>
                <button
                  onClick={() => handleBuyerDecision("Gate Pass")}
                  className="p-4 border-2 rounded-lg text-left hover:border-green-400 hover:bg-green-50 transition-all"
                  data-testid="select-gatepass-btn">
                  <p className="text-sm font-semibold text-slate-800">Gate Pass</p>
                  <p className="text-[10px] text-slate-500 mt-1">Standard gate pass for material dispatch</p>
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
