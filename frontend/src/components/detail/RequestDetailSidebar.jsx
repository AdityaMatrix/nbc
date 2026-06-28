import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare, Send, Loader2, Clock, Check, TestTube2, Plus,
  Package, Truck, FileText, ExternalLink
} from "lucide-react";

export const RequestDetailSidebar = ({
  request, sampleRequests, comments, dap, buyers, user,
  canProcess, canUpdatePreparation, hasMultipleItems, selectedItem, hasAccess,
  selectedSampleForDetails, setSelectedSampleForDetails, setNewSampleDialogOpen,
  handleUpdate, handleSamplePickup,
  setUnderPrepDialog, setBuyerDecisionDialog,
  setDispatchDialog, setDispatchItems,
  newComment, setNewComment, handleCommentSubmit, isSubmitting,
  formatDate, formatDateTime
}) => {
  return (
    <div className="space-y-4">
      {/* Sample Requests - Full View */}
      {hasAccess('capex_request', 'sample_section') && (
        <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-cyan-800">
                <TestTube2 className="w-4 h-4" />
                Sample Requests ({sampleRequests.length})
              </CardTitle>
              {canProcess && (
                <Button size="sm" className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => setNewSampleDialogOpen(true)}
                  data-testid="new-sample-from-detail-btn">
                  <Plus className="w-3 h-3" /> New Sample
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {sampleRequests.length > 0 ? (
              <ScrollArea className="max-h-[600px] pr-2">
                <div className="space-y-3">
                  {sampleRequests.map(sample => (
                    <div key={sample.id} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedSampleForDetails(sample)}
                          className="font-mono font-semibold text-indigo-600 hover:text-indigo-800 hover:underline text-sm"
                        >
                          {sample.id}
                        </button>
                        <Badge className={`text-[9px] ${sample.status === 'Dispatched' || sample.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            sample.status === 'Ready for Dispatch' ? 'bg-cyan-100 text-cyan-700' :
                              sample.status === 'Under Preparation' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                          }`}>
                          {sample.status}
                        </Badge>
                      </div>
                      {/* Date Info */}
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                        <span>Requested: {formatDate(sample.sample_requested_date || sample.created_at)}</span>
                        {sample.expected_readiness_date && (
                          <span>Ready by: {formatDate(sample.expected_readiness_date)}</span>
                        )}
                        {sample.dispatch_date && <span>Dispatched: {formatDate(sample.dispatch_date)}</span>}
                        {sample.buyer_decision && (
                          <span className="font-medium text-indigo-600">Type: {sample.buyer_decision}</span>
                        )}
                      </div>

                      {/* Dispatch & Reference Fields - Editable for Buyer, Read-only for others */}
                      {(canProcess || sample.transporter_name || sample.reference_number || sample.challan_number) && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-100 mt-1">
                          {canProcess ? (
                            <>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[9px] font-medium text-slate-500 mb-0.5 block">Transporter</label>
                                  <Input className="h-6 text-[10px]" placeholder="Transporter name"
                                    defaultValue={sample.transporter_name || ""}
                                    onBlur={(e) => { if (e.target.value !== (sample.transporter_name || "")) handleSamplePickup(sample.id, { transporter_name: e.target.value }); }}
                                    data-testid={`sample-transporter-${sample.id}`} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-medium text-slate-500 mb-0.5 block">Reference No.</label>
                                  <Input className="h-6 text-[10px]" placeholder="Reference number"
                                    defaultValue={sample.reference_number || ""}
                                    onBlur={(e) => { if (e.target.value !== (sample.reference_number || "")) handleSamplePickup(sample.id, { reference_number: e.target.value }); }}
                                    data-testid={`sample-reference-${sample.id}`} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                  <label className="text-[9px] font-medium text-slate-500 mb-0.5 block">Challan No.</label>
                                  <Input className="h-6 text-[10px]" placeholder="Challan number"
                                    defaultValue={sample.challan_number || ""}
                                    onBlur={(e) => { if (e.target.value !== (sample.challan_number || "")) handleSamplePickup(sample.id, { challan_number: e.target.value }); }}
                                    data-testid={`sample-challan-${sample.id}`} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-medium text-slate-500 mb-0.5 block">Dispatch Date</label>
                                  <Input type="date" className="h-6 text-[10px]"
                                    defaultValue={sample.dispatch_date?.split('T')[0] || ""}
                                    onBlur={(e) => { if (e.target.value) handleSamplePickup(sample.id, { dispatch_date: e.target.value }); }}
                                    data-testid={`sample-dispatch-date-${sample.id}`} />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              {sample.transporter_name && (
                                <div><span className="text-slate-500">Transporter:</span> <span className="font-medium text-slate-700">{sample.transporter_name}</span></div>
                              )}
                              {sample.reference_number && (
                                <div><span className="text-slate-500">Reference:</span> <span className="font-medium text-slate-700">{sample.reference_number}</span></div>
                              )}
                              {sample.challan_number && (
                                <div><span className="text-slate-500">Challan:</span> <span className="font-medium text-slate-700">{sample.challan_number}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Items Summary */}
                      <div className="text-[10px] text-slate-500">
                        {sample.line_items?.length || 0} item(s)
                      </div>
                      {/* Preparation Actions - for user/dept_head/process_engineering */}
                      {canUpdatePreparation && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 mt-1">
                          {(sample.status === 'Pending' || sample.status === 'Sample Requested') && (
                            <Button size="sm" className="h-6 text-[9px] bg-blue-500 hover:bg-blue-600 px-2"
                              onClick={() => setUnderPrepDialog({ open: true, sampleId: sample.id })}
                              data-testid={`under-prep-${sample.id}`}>
                              <Clock className="w-3 h-3 mr-1" /> Under Preparation
                            </Button>
                          )}
                          {sample.status === 'Under Preparation' && (
                            <Button size="sm" className="h-6 text-[9px] bg-green-500 hover:bg-green-600 px-2"
                              onClick={() => {
                                const items = sample.line_items?.map(li => ({
                                  description: li.material_description || '', material_code: li.material_code || '',
                                  number_of_samples: li.number_of_samples || 1, type_of_packing: li.type_of_packing || 'Wooden'
                                })) || [{ description: '', material_code: '', number_of_samples: 1, type_of_packing: 'Wooden' }];
                                setDispatchItems(items);
                                setDispatchDialog({ open: true, sampleId: sample.id, lineItems: sample.line_items || [] });
                              }}
                              data-testid={`ready-dispatch-${sample.id}`}>
                              <Package className="w-3 h-3 mr-1" /> Ready for Dispatch
                            </Button>
                          )}
                        </div>
                      )}
                      {/* Expected readiness date display */}
                      {sample.expected_readiness_date && sample.status === 'Under Preparation' && (
                        <div className="text-[10px] text-amber-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Expected ready: {formatDate(sample.expected_readiness_date)}
                        </div>
                      )}
                      {/* Buyer Decision - shown when sample is Ready for Dispatch and buyer hasn't decided */}
                      {canProcess && (sample.status === 'Sample Ready for Dispatch' || sample.status === 'Ready for Dispatch') && !sample.buyer_decision && (
                        <Button size="sm" className="h-6 text-[9px] bg-indigo-500 hover:bg-indigo-600 px-2 w-full"
                          onClick={() => setBuyerDecisionDialog({ open: true, sampleId: sample.id, gatePassAvailable: sample.gate_pass_available || false })}
                          data-testid={`buyer-decision-${sample.id}`}>
                          <FileText className="w-3 h-3 mr-1" /> Select JWC/Gate Pass
                        </Button>
                      )}
                      {/* Show buyer decision badge */}
                      {sample.buyer_decision && (
                        <Badge className={`text-[9px] ${sample.buyer_decision === 'Gate Pass' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {sample.buyer_decision}
                        </Badge>
                      )}
                      {/* Gate pass indicator */}
                      {sample.gate_pass_available && (
                        <div className="flex items-center gap-1 text-[10px] text-green-600">
                          <Check className="w-3 h-3" /> Gate Pass Uploaded
                          {sample.gate_pass_url && (
                            <a href={sample.gate_pass_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline ml-1">
                              <ExternalLink className="w-3 h-3 inline" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No sample requests</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assigned Buyer */}
      {hasAccess('capex_request', 'assigned_buyer') && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold">Assigned Buyer</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {request.assigned_buyer_name ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-indigo-600">{request.assigned_buyer_name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{request.assigned_buyer_name}</p>
                  <p className="text-xs text-slate-500">Buyer</p>
                </div>
              </div>
            ) : canProcess ? (
              <Select onValueChange={(v) => handleUpdate({ assigned_buyer_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Assign buyer..." /></SelectTrigger>
                <SelectContent>{buyers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-slate-500">Not assigned</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      {hasAccess('capex_request', 'comments') && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-48 pr-2">
              {comments.length > 0 ? (
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="p-2 bg-slate-50 rounded text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-medium">{c.user_name}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-400">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-slate-700">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No comments yet</p>
              )}
            </ScrollArea>
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <Textarea placeholder="Add comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] text-xs" data-testid="comment-input" />
              <Button size="sm" onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="self-end" data-testid="send-comment-btn">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Processing Timeline */}
      {hasAccess('capex_request', 'approval_flow') && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Processing Timeline
              {hasMultipleItems && selectedItem && (
                <Badge className="text-[9px] bg-indigo-100 text-indigo-700 ml-2">
                  {selectedItem.description?.substring(0, 15)}{selectedItem.description?.length > 15 ? '...' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {(() => {
                const calcDays = (startDate, endDate) => {
                  if (!startDate || !endDate) return null;
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                  return days >= 0 ? days : null;
                };
                const formatDays = (days) => {
                  if (days === null || days === undefined) return '-';
                  return `${days} day${days !== 1 ? 's' : ''}`;
                };
                const timelineData = hasMultipleItems && selectedItem ? selectedItem : request;
                const requestToCreated = calcDays(request.created_at, timelineData.cea_created_date || timelineData.pr_created_date);
                const ceaDays = calcDays(timelineData.cea_created_date, timelineData.cea_approved_date);
                const prDays = calcDays(timelineData.pr_created_date, timelineData.pr_approved_date);
                const poDays = calcDays(timelineData.po_created_date, timelineData.po_approved_date);
                const orderDays = calcDays(timelineData.po_approved_date || request.po_approved_date, timelineData.ordered_date || request.ordered_date);
                const sampleDays = sampleRequests.length > 0 ? calcDays(sampleRequests[0]?.sample_requested_date || sampleRequests[0]?.created_at, sampleRequests[0]?.dispatch_date) : null;
                const deliveryDays = calcDays(timelineData.ordered_date || request.ordered_date, request.delivery_date);
                const pdiDays = calcDays(request.delivery_date, request.pdi_date);
                const installDays = calcDays(request.pdi_date || request.delivery_date, request.installation_date);
                const commissionDays = calcDays(request.installation_date, request.commissioning_date);
                const allStepDays = [requestToCreated, ceaDays, prDays, poDays, orderDays, deliveryDays, pdiDays, installDays, commissionDays].filter(d => d !== null && d >= 0);
                const totalDays = allStepDays.length > 0 ? allStepDays.reduce((sum, d) => sum + d, 0) : null;

                const dapObj = typeof dap === 'object' ? dap : null;
                const steps = [
                  { name: 'Capex Request', status: 'done', time: formatDays(requestToCreated), dates: request.created_at?.split('T')[0], color: 'bg-slate-500' },
                  { name: 'CEA Processing', status: timelineData.cea_approved_date ? 'done' : (request.cea_required ? 'pending' : 'na'), time: formatDays(ceaDays), dates: timelineData.cea_created_date && timelineData.cea_approved_date ? `${timelineData.cea_created_date?.split('T')[0]} \u2192 ${timelineData.cea_approved_date?.split('T')[0]}` : null, color: 'bg-amber-500' },
                  { name: 'PR Processing', status: timelineData.pr_approved_date ? 'done' : ((hasMultipleItems ? selectedItem?.pr_available : request.pr_available) ? 'pending' : 'na'), time: formatDays(prDays), dates: timelineData.pr_created_date && timelineData.pr_approved_date ? `${timelineData.pr_created_date?.split('T')[0]} \u2192 ${timelineData.pr_approved_date?.split('T')[0]}` : null, color: 'bg-blue-500' },
                  { name: 'PO Processing', status: timelineData.po_approved_date ? 'done' : 'pending', time: formatDays(poDays), dates: timelineData.po_created_date && timelineData.po_approved_date ? `${timelineData.po_created_date?.split('T')[0]} \u2192 ${timelineData.po_approved_date?.split('T')[0]}` : null, color: 'bg-purple-500' },
                  { name: 'DAP', status: dapObj ? 'done' : 'pending', time: dapObj ? (dapObj.recorrection_history?.length > 0 ? `${dapObj.recorrection_history.length} rev` : 'Approved') : '-', dates: dapObj?.approved_at?.split('T')[0] || null, color: 'bg-indigo-500' },
                  { name: 'Sample Processing', status: sampleRequests.some(s => s.status === 'Dispatched' || s.status === 'Delivered') ? 'done' : (sampleRequests.length > 0 ? 'pending' : 'na'), time: sampleDays !== null ? formatDays(sampleDays) : (sampleRequests.length > 0 ? sampleRequests[0]?.status : '-'), dates: sampleRequests.length > 0 && sampleRequests[0]?.dispatch_date ? `${(sampleRequests[0]?.sample_requested_date || sampleRequests[0]?.created_at)?.split('T')[0]} \u2192 ${sampleRequests[0]?.dispatch_date?.split('T')[0]}` : null, color: 'bg-cyan-500' },
                  { name: 'PDI', status: request.pdi_status === 'Completed' ? 'done' : (request.pdi_date ? 'pending' : 'na'), time: formatDays(pdiDays), dates: request.pdi_date?.split('T')[0] || null, color: 'bg-pink-500' },
                  { name: 'Delivery', status: request.delivery_status === 'Delivered' ? 'done' : (request.delivery_date ? 'pending' : 'na'), time: formatDays(deliveryDays), dates: request.delivery_date?.split('T')[0] || null, color: 'bg-orange-500' },
                  { name: 'Installation & Commissioning', status: request.commissioning_status === 'Completed' ? 'done' : (request.installation_date ? 'pending' : 'na'), time: formatDays(commissionDays), dates: request.installation_date && request.commissioning_date ? `${request.installation_date?.split('T')[0]} \u2192 ${request.commissioning_date?.split('T')[0]}` : (request.installation_date?.split('T')[0] || null), color: 'bg-green-500' },
                ];

                return (
                  <>
                    {steps.map((step, idx) => (
                      <div key={idx} className="py-1">
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${step.status === 'done' ? 'bg-emerald-500' : step.status === 'na' ? 'bg-slate-300' : step.color}`} />
                          <span className={`flex-1 ${step.status === 'done' ? 'text-emerald-700 font-medium' : step.status === 'na' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {step.name}
                            {step.status === 'na' && <span className="ml-1 text-[9px]">(N/A)</span>}
                          </span>
                          <span className={`font-mono text-[10px] ${step.status === 'done' ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                            {step.time}
                          </span>
                        </div>
                        {step.dates && (
                          <div className="ml-4 text-[9px] text-slate-400 font-mono">{step.dates}</div>
                        )}
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Total Processing Time</span>
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {totalDays !== null ? `${totalDays} days` : '-'}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline / Activity */}
      {user?.role !== 'user' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold">Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-40">
              {request.time_log?.length > 0 ? (
                <div className="space-y-2">
                  {request.time_log.slice().reverse().slice(0, 5).map((entry, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${i === 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                      <div>
                        <p className="text-slate-700">{entry.action}</p>
                        <p className="text-slate-400">{entry.by} &bull; {formatDateTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No activity</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
