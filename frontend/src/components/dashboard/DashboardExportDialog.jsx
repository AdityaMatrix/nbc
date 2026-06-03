import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { FileSpreadsheet, Download } from "lucide-react";

export const DashboardExportDialog = ({
  open, onOpenChange, exportOptions, setExportOptions,
  onExportToExcel, onExportFYReport
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" style={{ color: "var(--theme-primary)" }} />
            Export FY Report
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive Excel report for the selected financial year
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Financial Year</label>
            <Select
              value={exportOptions.fy}
              onValueChange={(v) => setExportOptions(prev => ({ ...prev, fy: v }))}
            >
              <SelectTrigger data-testid="fy-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-25">FY 2024-25</SelectItem>
                <SelectItem value="2025-26">FY 2025-26</SelectItem>
                <SelectItem value="2026-27">FY 2026-27</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plant Filter</label>
              <Select
                value={exportOptions.plantFilter}
                onValueChange={(v) => setExportOptions(prev => ({ ...prev, plantFilter: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  <SelectItem value="Bagru">Bagru</SelectItem>
                  <SelectItem value="Jaipur">Jaipur</SelectItem>
                  <SelectItem value="Newai">Newai</SelectItem>
                  <SelectItem value="Savli">Savli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Filter</label>
              <Select
                value={exportOptions.statusFilter}
                onValueChange={(v) => setExportOptions(prev => ({ ...prev, statusFilter: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Include in Report</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "includeSummary", label: "Summary Dashboard" },
                { key: "includeSuppliers", label: "Supplier Quotations" },
                { key: "includeInvoices", label: "Invoice Details" },
                { key: "includeTimeline", label: "Workflow Timeline" },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={exportOptions[opt.key]}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, [opt.key]: checked }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <div className="font-medium mb-2">Report will include:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>All Requests (detailed with CEA, PR, PO info)</li>
              {exportOptions.includeSummary && <li>Summary Dashboard with KPIs</li>}
              {exportOptions.includeSuppliers && <li>Supplier Quotations sheet</li>}
              {exportOptions.includeInvoices && <li>Invoice Details sheet</li>}
              {exportOptions.includeTimeline && <li>Workflow Timeline sheet</li>}
              <li>Plant-wise Summary</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={onExportToExcel}>
            <Download className="w-4 h-4 mr-2" /> Quick Export
          </Button>
          <Button
            onClick={onExportFYReport}
            style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))" }}
            data-testid="export-fy-report-btn"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export FY Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
