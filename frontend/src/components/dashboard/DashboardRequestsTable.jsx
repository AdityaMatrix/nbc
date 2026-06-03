import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  FileText, Clock, XCircle, ArrowRight, Search, Check,
  AlertCircle, Trash2, Filter, Calendar, Users, Inbox,
  UserCheck, FileCheck, Package, Building2
} from "lucide-react";
import { statusConfig } from "./dashboardConfig";

export const DashboardRequestsTable = ({
  filteredRequests, allRequests,
  searchQuery, setSearchQuery,
  statusFilter, setStatusFilter, statuses,
  plantFilter, setPlantFilter, uniquePlants,
  deptFilter, setDeptFilter, uniqueDepts,
  ceaFilter, setCeaFilter,
  prFilter, setPrFilter,
  poFilter, setPoFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  prPoSearch, setPrPoSearch,
  buyerFilter, setBuyerFilter, buyersList,
  activeTab, setActiveTab,
  pendingTaskFilter, setPendingTaskFilter,
  buyerMetricFilter, setBuyerMetricFilter,
  selectedRequests, toggleSelectRequest, toggleSelectAll,
  deleteDialogOpen, setDeleteDialogOpen, handleBulkDelete, isDeleting,
  handleAssignBuyer,
  renderCEAStatus, renderPRStatus, renderPOStatus, getDisplayDescription,
  isBuyer, isDeptHead, isUserRole, effectiveRole, user
}) => {
  return (
    <Card className="border border-slate-200 shadow-lg shadow-slate-200/50 bg-white rounded-xl overflow-hidden mt-6">
      <CardContent className="p-0">
        {/* Buyer Tabs */}
        {isBuyer && (
          <div className="p-4 pb-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "assigned") setPendingTaskFilter(null); }} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 h-10 bg-slate-100/80 p-1 rounded-lg">
                  <TabsTrigger value="assigned" className="text-[10px] sm:text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600">
                    <Users className="w-3.5 h-3.5 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">My </span>Assigned
                  </TabsTrigger>
                  <TabsTrigger value="new" className="text-[10px] sm:text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600">
                    <Inbox className="w-3.5 h-3.5 mr-1 sm:mr-1.5" /> New
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-[10px] sm:text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: activeTab === 'all' ? 'var(--theme-primary)' : undefined }}>
                    <FileText className="w-3.5 h-3.5 mr-1 sm:mr-1.5" /> All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {pendingTaskFilter && (
              <div className="flex items-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">
                  Showing: {pendingTaskFilter === "pr" ? "PRs Pending Approval" :
                           pendingTaskFilter === "po" ? "POs Pending Approval" :
                           pendingTaskFilter === "cea" ? "CEAs in Approval" :
                           pendingTaskFilter === "dap" ? "Pending DAPs" :
                           pendingTaskFilter === "sample" ? "Sample Requested" :
                           pendingTaskFilter === "pdi" ? "PDIs Pending" : "All"}
                </span>
                <Button
                  variant="ghost" size="sm"
                  className="h-5 px-2 text-[10px] text-amber-700 hover:text-amber-900 ml-auto"
                  onClick={() => setPendingTaskFilter(null)}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
            )}
            {buyerMetricFilter && (
              <div className="flex items-center gap-2 py-2 px-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">
                  Showing: {buyerMetricFilter === "assigned" ? "My Assigned Requests" :
                           buyerMetricFilter === "completed" ? "Completed Requests" :
                           buyerMetricFilter === "inprogress" ? "In Progress Requests" :
                           buyerMetricFilter === "purchase" ? "Requests with Purchase Value" :
                           buyerMetricFilter === "savings" ? "Requests with Cost Savings" : "All"}
                </span>
                <Button
                  variant="ghost" size="sm"
                  className="h-5 px-2 text-[10px] text-blue-700 hover:text-blue-900 ml-auto"
                  onClick={() => setBuyerMetricFilter(null)}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Department Head Tabs */}
        {isDeptHead && (
          <div className="p-4 pb-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-sm grid-cols-2 h-10 bg-slate-100/80 p-1 rounded-lg">
                <TabsTrigger value="pending_dh" className="text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600" data-testid="tab-pending-dh">
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Pending Approval
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: activeTab === 'all' ? 'var(--theme-primary)' : undefined }}>
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> All Requests
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Search Bar and Filters */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-gradient-to-r from-slate-50/50 to-white">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by Request ID or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm bg-white border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                data-testid="search-input"
              />
            </div>
            <div className="relative w-full sm:w-36">
              <Input
                placeholder="PR/PO No..."
                value={prPoSearch}
                onChange={(e) => setPrPoSearch(e.target.value)}
                className="h-10 text-xs bg-white border-slate-200 rounded-lg"
                data-testid="prpo-search"
              />
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-28 h-6 text-[10px] border-0 p-0 focus:ring-0" placeholder="From" />
              <span className="text-slate-300">&rarr;</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-28 h-6 text-[10px] border-0 p-0 focus:ring-0" placeholder="To" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10 text-xs bg-white" data-testid="status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Column Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 bg-white border-slate-200 hover:bg-slate-50">
                  <Filter className="w-3 h-3" /> Filters
                  {(plantFilter !== 'all' || deptFilter !== 'all' || ceaFilter !== 'all' || prFilter !== 'all' || poFilter !== 'all' || buyerFilter !== 'all') && (
                    <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-indigo-500 text-white">
                      {[plantFilter, deptFilter, ceaFilter, prFilter, poFilter, buyerFilter].filter(f => f !== 'all').length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Filter Options</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => { setPlantFilter('all'); setDeptFilter('all'); setCeaFilter('all'); setPrFilter('all'); setPoFilter('all'); setBuyerFilter('all'); }}>
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
                  {!isUserRole && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-medium text-slate-600 flex items-center gap-1"><Building2 className="w-3 h-3" /> Plant</Label>
                        <Select value={plantFilter} onValueChange={setPlantFilter}>
                          <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="All Plants" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-[10px]">All Plants</SelectItem>
                            {uniquePlants.map((p) => <SelectItem key={p} value={p} className="text-[10px]">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-medium text-slate-600 flex items-center gap-1"><Users className="w-3 h-3" /> Department</Label>
                        <Select value={deptFilter} onValueChange={setDeptFilter}>
                          <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-[10px]">All Depts</SelectItem>
                            {uniqueDepts.map((d) => <SelectItem key={d} value={d} className="text-[10px]">{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {effectiveRole === "capex_head" && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-medium text-slate-600 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Buyer</Label>
                          <Select value={buyerFilter} onValueChange={setBuyerFilter}>
                            <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="All Buyers" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="text-[10px]">All Buyers</SelectItem>
                              {buyersList.map((b) => <SelectItem key={b.id} value={b.id} className="text-[10px]">{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-slate-600 flex items-center gap-1"><FileCheck className="w-3 h-3" /> CEA Status</Label>
                    <Select value={ceaFilter} onValueChange={setCeaFilter}>
                      <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="All CEA" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-[10px]">All CEA Status</SelectItem>
                        <SelectItem value="Pending" className="text-[10px]">CEA Pending</SelectItem>
                        <SelectItem value="Approved" className="text-[10px]">CEA Approved</SelectItem>
                        <SelectItem value="NA" className="text-[10px]">CEA N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-slate-600 flex items-center gap-1"><FileText className="w-3 h-3" /> PR Status</Label>
                    <Select value={prFilter} onValueChange={setPrFilter}>
                      <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="All PR" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-[10px]">All PR Status</SelectItem>
                        <SelectItem value="Pending" className="text-[10px]">PR Pending</SelectItem>
                        <SelectItem value="Approved" className="text-[10px]">PR Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-slate-600 flex items-center gap-1"><Package className="w-3 h-3" /> PO Status</Label>
                    <Select value={poFilter} onValueChange={setPoFilter}>
                      <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="All PO" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-[10px]">All PO Status</SelectItem>
                        <SelectItem value="Pending" className="text-[10px]">PO Pending</SelectItem>
                        <SelectItem value="Approved" className="text-[10px]">PO Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Active Filter Tags */}
            {plantFilter !== 'all' && (
              <Badge variant="secondary" className="h-6 text-[9px] gap-1 bg-blue-50 text-blue-700 border border-blue-200">
                Plant: {plantFilter} <XCircle className="w-3 h-3 cursor-pointer hover:text-blue-900" onClick={() => setPlantFilter('all')} />
              </Badge>
            )}
            {deptFilter !== 'all' && (
              <Badge variant="secondary" className="h-6 text-[9px] gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                Dept: {deptFilter} <XCircle className="w-3 h-3 cursor-pointer hover:text-purple-900" onClick={() => setDeptFilter('all')} />
              </Badge>
            )}
            {buyerFilter !== 'all' && (
              <Badge variant="secondary" className="h-6 text-[9px] gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                Buyer: {buyersList.find(b => b.id === buyerFilter)?.name || buyerFilter} <XCircle className="w-3 h-3 cursor-pointer hover:text-emerald-900" onClick={() => setBuyerFilter('all')} />
              </Badge>
            )}
            {ceaFilter !== 'all' && (
              <Badge variant="secondary" className="h-6 text-[9px] gap-1 bg-amber-50 text-amber-700 border border-amber-200">
                CEA: {ceaFilter} <XCircle className="w-3 h-3 cursor-pointer hover:text-amber-900" onClick={() => setCeaFilter('all')} />
              </Badge>
            )}
            {prFilter !== 'all' && (
              <Badge variant="secondary" className="h-6 text-[9px] gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200">
                PR: {prFilter} <XCircle className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => setPrFilter('all')} />
              </Badge>
            )}
            {poFilter !== 'all' && (
              <Badge variant="secondary" className="h-6 text-[9px] gap-1 bg-rose-50 text-rose-700 border border-rose-200">
                PO: {poFilter} <XCircle className="w-3 h-3 cursor-pointer hover:text-rose-900" onClick={() => setPoFilter('all')} />
              </Badge>
            )}

            {selectedRequests.size > 0 && (
              <Button variant="destructive" size="sm" className="h-7 text-[10px] ml-auto"
                onClick={() => setDeleteDialogOpen(true)} data-testid="delete-selected-btn">
                <Trash2 className="w-3 h-3 mr-1" /> Delete Selected ({selectedRequests.size})
              </Button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {selectedRequests.size} Request(s)</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedRequests.size} request(s)? This action cannot be undone and will also delete all related comments, sample requests, and DAP documents.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : `Delete ${selectedRequests.size} Request(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/80">
              <tr className="text-left">
                <th className="px-2 py-2 w-8">
                  <Checkbox
                    checked={selectedRequests.size > 0 && selectedRequests.size === filteredRequests.filter(r => !r._isExpanded || filteredRequests.filter(fr => fr.id === r.id)[0]._rowId === r._rowId).length}
                    onCheckedChange={toggleSelectAll}
                    data-testid="select-all-checkbox"
                  />
                </th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Request ID</th>
                {!isUserRole && <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Plant</th>}
                {!isUserRole && <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Dept</th>}
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Description</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Request Status</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">CEA No.</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">PR</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">PO</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-[10px] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={isUserRole ? 9 : 11} className="px-3 py-8 text-center text-slate-400">No requests found</td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const statusStyle = statusConfig[request.status] || statusConfig["Pending Approval"];
                  const workflowStyle = statusConfig[request.workflow_status] || null;

                  return (
                    <tr
                      key={request._rowId}
                      className={`hover:bg-slate-50/50 transition-colors ${request._isExpanded ? 'border-l-4 border-l-indigo-400 bg-indigo-50/20' : ''}`}
                    >
                      <td className="px-2 py-2.5">
                        <Checkbox
                          checked={selectedRequests.has(request.id)}
                          onCheckedChange={() => toggleSelectRequest(request.id)}
                          data-testid={`select-${request.id}`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-semibold" style={{ color: 'var(--theme-primary)' }}>{request.id}</span>
                        {request._isExpanded && <span className="text-slate-400 text-[9px] ml-1">(Item {request._itemIndex + 1})</span>}
                      </td>
                      {!isUserRole && <td className="px-3 py-2.5 text-slate-600">{request.plant}</td>}
                      {!isUserRole && <td className="px-3 py-2.5 text-slate-600">{request.department}</td>}
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <span className="truncate block text-slate-700">{getDisplayDescription(request)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={`${statusStyle.color} border text-[10px] font-medium px-1.5 py-0.5`}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">{renderCEAStatus(request)}</td>
                      <td className="px-3 py-2.5">
                        {request._prNumber ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium text-[10px]">
                            <Check className="w-3 h-3" /> {request._prNumber}
                          </span>
                        ) : renderPRStatus(request)}
                      </td>
                      <td className="px-3 py-2.5">{renderPOStatus(request)}</td>
                      <td className="px-3 py-2.5">
                        {request.workflow_status ? (
                          <Badge className={`${workflowStyle?.color || 'bg-slate-100 text-slate-600'} border text-[10px] font-medium px-1.5 py-0.5`}>
                            {request.workflow_status}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <Link to={`/requests/${request.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-slate-50" style={{ color: 'var(--theme-primary)' }}>
                              View <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                          {((effectiveRole === "capex_head") || (isBuyer && activeTab === "all" && !request.assigned_buyer_id)) && (
                            <Select
                              value={request.assigned_buyer_id || ""}
                              onValueChange={(buyerId) => handleAssignBuyer(request.id, buyerId)}
                            >
                              <SelectTrigger className={`h-6 w-28 text-[9px] ${request.assigned_buyer_id ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                <SelectValue placeholder="Assign Buyer" />
                              </SelectTrigger>
                              <SelectContent>
                                {buyersList.map((buyer) => (
                                  <SelectItem key={buyer.id} value={buyer.id} className="text-[10px]">{buyer.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {effectiveRole !== "capex_head" && request.assigned_buyer_name && !(isBuyer && activeTab === "all" && !request.assigned_buyer_id) && (
                            <Badge className="text-[8px] bg-emerald-100 text-emerald-700 border-emerald-200">
                              {request.assigned_buyer_name}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">{filteredRequests.length} of {allRequests.length} requests</span>
          <Link to="/requests" className="text-[10px] font-medium" style={{ color: 'var(--theme-primary)' }}>View All &rarr;</Link>
        </div>
      </CardContent>
    </Card>
  );
};
