# Capex Portal - Product Requirements Document

## Original Problem Statement
Develop a modern, vibrant, and professional Capex Portal supporting the complete lifecycle management of Capex requests with role-based access control.

## Core Features (Implemented)
- **RBAC**: Admin, Capex Head, Buyer, Department Head, Process Engineer, User roles
- **Request Lifecycle**: Submit > DH Approve > Capex Head Approve > Buyer Assign > Quote > Compare > PO > Sample > Commission
- **Sample Dispatch Workflow**: Preparation, Ready for Dispatch, Gate Pass/Challan, Dispatch, Delivery
- **Master Data Management**: Plants, Departments, Users with employee IDs
- **AI Assistant**: "Capex Man" powered by GPT-5 via Emergent LLM Key
- **Interactive Tutorial**: 11-step in-app walkthrough
- **Theme Customization**: Dashboard themes via Settings; Admin panel themes
- **Google Auth**: Emergent-managed Google OAuth
- **Card-based UI**: Requests and samples with hierarchical display
- **Cost Savings Analytics**: Dashboard with supplier price mapping
- **Collapsible Sidebar**: Three-dot toggle and buyer dropdown filters
- **Settings Page**: Full landscape with Appearance, Dashboard, Security, Help tabs
- **CEA/PR/PO Status Display**: "-" when numbers not entered, checkmark+number when entered

## Module-Based Admin Access Control (Fully Functional)
- 31 items across Dashboard (15), Capex Request (10), Analytics (6)
- "Preview as Role" for admins
- Backend: `routes/access_control.py`
- Frontend: `AccessControlPanel.jsx`, `useAccessControl.js` hook

## Analytics Dashboard (Redesigned)
- FY filter (2024-25, 2025-26, 2026-27)
- Time granularity: Day / Month / Quarter
- Plant filter dropdown
- **Section 1**: Plant-wise Spend (bar chart + plant list)
- **Section 2**: Department-wise Spend filtered by plant (horizontal bar + pie chart)
- **Section 3**: Supplier-wise Spend (top 10 bar chart + summary cards)
- **Section 4**: Project Completion Timelines (table with PR/PO/Delivery/Install days, PO filter)
- AI Insights section

## Pending Task Logic
- CEA Pending: CEA number entered but not approved (not available/empty = not pending)
- PR Pending: PR number entered but not approved
- PO Pending: PO number entered but not approved

## Code Architecture

### Dashboard Module (7 files, was 1892 lines)
- `Dashboard.jsx` (605 lines), `DashboardStatsCards.jsx`, `DashboardAnalytics.jsx`, `DashboardPendingTasks.jsx`, `DashboardRequestsTable.jsx`, `DashboardExportDialog.jsx`, `dashboardConfig.js`

### RequestDetail Module (3 files, was 3401 lines)
- `RequestDetail.jsx` (2709 lines), `RequestDetailSidebar.jsx`, `RequestDetailDialogs.jsx`

### Analytics (1 file)
- `Analytics.jsx` - Complete redesign with 4 chart sections + filters

## Backlog
- **P1**: PDI Stage workflow definition
- **P2**: Email Notifications via Resend
- **P2**: PDF Export for Capex requests
- **P2**: Further refactoring of RequestDetail.jsx
