# Backend Architecture & API Design Specification

## 1. Executive Summary & Architectural Principles
The backend of the **CAPEX (Capital Expenditure) Intelligence Portal** is engineered to provide a robust, high-performance, and secure foundation for enterprise financial operations. Designed to replace a highly vulnerable and fragmented legacy Excel spreadsheet process, the backend operates as an immutable single source of truth. It adheres to strict micro-routing, asynchronous execution, and granular role-based access control (RBAC).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API LAYER (server.py)                   │
├──────────────────────────────┬─────────────────────────────────────────┤
│      ROUTING ARCHITECTURE    │          DATA & ACCESS CONTROL          │
│  - FastAPI Async Engine      │  - MongoDB NoSQL Client (database.py)   │
│  - 17+ Modular Micro-Routers │  - Strict RBAC (access_control.py)      │
│  - Automated OpenAPI Specs   │  - Bulk Ingestion & History Rollback    │
├──────────────────────────────┴─────────────────────────────────────────┤
│                       RELIABILITY & ASSETS                             │
│  - Static Media Streaming (/static/videos/user_manual.mp4)             │
│  - 44+ Pytest Automation Suites (pytest_access_control_granular.xml)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack & Selection Rationale

The backend technology stack was curated to provide maximum execution speed, maintainable codebases, and enterprise-grade validation:

### 2.1 Python & FastAPI
- **Why it was chosen**: FastAPI is a cutting-edge Python web framework built on standard Python type hints (`Pydantic` and `Starlette`). It provides asynchronous request handling (`async`/`await`), automatic serialization, and automatic Swagger/Redoc documentation generation.
- **The Benefit**: Outperforms traditional Python web frameworks (like Django or standard Flask) in concurrency and speed. The integrated validation guarantees that malformed financial requests are instantly rejected before reaching the database layer.

### 2.2 MongoDB (NoSQL Database Client)
- **Why it was chosen**: CAPEX project structures, purchase orders, and supplier metrics involve deeply nested, hierarchical, and evolving document structures that do not easily fit into rigid relational tables.
- **The Benefit**: A NoSQL document store (`database.py`) aligns perfectly with the JSON payloads exchanged with the React frontend. It enables rapid schema iterations and highly efficient document queries for complex project lifecycles.

### 2.3 Pytest Automation Framework
- **Why it was chosen**: `pytest` provides a mature, highly scalable testing architecture supporting advanced fixtures, parameterization, and JUnit XML report generation.
- **The Benefit**: Enables robust continuous integration testing across over 44 release iterations, guaranteeing zero regression in access control security or financial calculation consistency.

---

## 3. Independent Backend Functionality & System Design

The backend functions as a standalone micro-services engine capable of serving data, enforcing permissions, managing files, and processing large data ingestions independently.

### 3.1 Modular Micro-Routing Architecture (`server.py`)
To maintain a clean separation of concerns, the primary FastAPI application (`server.py`) delegates request handling to specialized micro-routers located in the `routes/` package:
- **`auth` & `users`**: Manages authentication tokens, user sessions, and profile attributes.
- **`requests` & `samples`**: Handles the full lifecycle creation, modification, and progression of CAPEX applications.
- **`analytics`**: Exposes aggregated statistical endpoints for high-level enterprise financial calculations.
- **`access_control` & `groups`**: Enforces strict organization-wide role and group permission matrixes.
- **`dap` & `comments`**: Provides departmental approval pipelines and real-time collaboration comment streams.
- **`notifications`**: Drives asynchronous alerts to project managers and stakeholders regarding delays or action requirements.
- **`ai` & `reference`**: Backing endpoints for upcoming AI natural language search capabilities and reference table lookups.
- **`files` & `vendors`**: Manages attachment files and maintains the master supplier performance index.
- **`bulk_upload` & `seed`**: Handles administrative seeding and batch historical Excel migrations.
- **`admin`**: Dedicated portal endpoints for administrative system oversight.

### 3.2 Granular Role-Based Access Control (RBAC)
- **Design Implementation**: Security is paramount in capital expenditure tracking. The backend implements rigorous access control checks (`routes/access_control.py`).
- **Functional Impact**: Incoming requests are evaluated against the user’s role (e.g., Plant Manager, Department Head, Executive, Auditor). The backend dynamically filters response payloads to ensure users only receive project data and approval capabilities matching their corporate clearance level.

### 3.3 Bulk Upload & Transaction Rollback (`routes/bulk_upload.py`)
- **Design Implementation**: Migrating historical records from legacy Excel sheets into a centralized portal requires absolute data integrity.
- **Functional Impact**: The bulk upload router validates uploaded Excel/CSV files against strict validation schemas. If an ingestion anomaly or malformed row is detected, the backend supports automated transaction history rollbacks, guaranteeing that corrupt data never contaminates the production database.

### 3.4 Dedicated Static Media & Document Serving
The backend is explicitly configured to serve large media files and corporate presentations to aid in user onboarding and offline presentation:
- **`app.mount("/static", StaticFiles(...))`**: Hosts high-bandwidth static media assets.
- **`/api/download/user-manual`**: Dedicated `FileResponse` endpoint serving `Capex_Portal_User_Manual.mp4`.
- **`/api/download/user-manual-ppt`**: Dedicated `FileResponse` endpoint serving `CAPEX_Portal_User_Manual.pptx`.
- **`/api/user-manual/status`**: Provides dynamic health check and streaming availability status for media assets.

---

## 4. Reliability, Verification & Testing Suites

To guarantee enterprise reliability, the backend logic was subjected to exhaustive automated testing spanning more than 44 continuous integration iterations (`test_reports/iteration_1.json` through `iteration_44.json`).

### 4.1 Pytest Verification Matrix
The `pytest` suites generated highly detailed XML verification records across critical functional areas:
- **`pytest_access_control_granular.xml`**: Verifies that unauthorized roles cannot view or approve specific departmental budget tiers.
- **`pytest_bulk_upload_history_rollback.xml`**: Validates the automatic rollback of database state upon simulated bulk ingestion failures.
- **`pytest_analytics_consistency.xml`**: Confirms that mathematical aggregations across plants, suppliers, and departments remain completely consistent across all API endpoints.
- **`pytest_preview_mode.xml`**: Tests the integrity of read-only preview features for executive stakeholders.

By enforcing these strict testing protocols, the backend establishes an impenetrable, highly performant foundation that instills absolute confidence in the CAPEX portal’s operations.
