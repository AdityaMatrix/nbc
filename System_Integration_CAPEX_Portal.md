# System Integration & Full-Stack Data Flow Specification

## 1. Executive Summary & Full-Stack Synergy
The true power of the **CAPEX (Capital Expenditure) Intelligence Portal** emerges from the seamless integration between its token-driven React 19 frontend and its modular Python FastAPI backend. Neither component functions in isolation; together, they establish an impenetrable single source of truth that modernizes enterprise capital expenditure workflows.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FULL-STACK SYSTEM INTEGRATION                   │
├──────────────────────────────┬─────────────────────────────────────────┤
│    REACT 19 CLIENT LAYER     │         FASTAPI BACKEND LAYER           │
│  - useAccessControl.js       │<-- CORS / JSON --> - access_control.py  │
│  - Async Data Fetching       │<-- REST APIs ----> - Modular Routers    │
│  - Static Media Action Triggers│<-- File Streams -> - app.mount(/static) │
├──────────────────────────────┴─────────────────────────────────────────┤
│                     PARADIGM SHIFT: EXCEL TO PORTAL                    │
│  - Replaces fragile, isolated spreadsheets with centralized automation  │
│  - Eradicates version conflicts and provides real-time auditability   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cross-Origin Resource Sharing (CORS) & Security Middleware

Because the React client and FastAPI server operate as a decoupled architecture (often hosted on separate subdomains or ports during local execution), establishing secure, reliable cross-origin communication is paramount.

### 2.1 Middleware Configuration (`server.py`)
The FastAPI server is explicitly configured with `CORSMiddleware` to authorize requests originating from the React frontend:
```python
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', _default_origins).split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- **`allow_credentials=True`**: Authorizes the secure transmission of authorization cookies, session headers, and token credentials across the frontend-backend boundary.
- **`allow_origins`**: Dynamically binds to environment configurations, ensuring secure communication in local development (`localhost:3000`) while restricting access in production environments.

---

## 3. End-to-End Data Lifecycle & API Communication

The integration between frontend UI surfaces and backend business logic is wired through highly structured RESTful JSON transactions and specialized file transmission pipelines.

```
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│  React Frontend │             │ FastAPI Backend │             │ MongoDB Storage │
│ (Analytics/Gantt)│             │  (server.py)    │             │  (database.py)  │
└────────┬────────┘             └────────┬────────┘             └────────┬────────┘
         │                               │                               │
         │  1. HTTP GET /api/requests    │                               │
         ├──────────────────────────────►│  2. MongoDB Document Query    │
         │  (Auth & Role Headers)        ├──────────────────────────────►│
         │                               │                               │
         │                               │  3. Return BSON / Documents   │
         │                               │◄──────────────────────────────┤
         │  4. Return Validated JSON     │                               │
         │◄──────────────────────────────┤                               │
         │  (Filtered via RBAC)          │                               │
         │                               │                               │
         │  5. Client useMemo Cache      │                               │
         │  (Instant Zero-Lag Filters)   │                               │
         └───────────────────────────────┴───────────────────────────────┘
```

### 3.1 Asynchronous RESTful Communication
1. **Frontend Query Initiation**: When a user navigates to a dashboard or triggers a specific action, React hooks initiate asynchronous HTTP fetches to specific micro-routers (`/api/requests`, `/api/analytics`, `/api/vendors`).
2. **Backend Validation & Processing**: FastAPI routes intercept the payload, validate the request schema via Pydantic, and execute optimized document queries against the MongoDB database client.
3. **Optimized Serialization**: The backend returns clean, validated JSON back to the React client, where it is consumed by state stores and `useMemo` hooks for zero-latency client-side rendering.

### 3.2 Access Control Synchronization
- **Frontend Hook (`useAccessControl.js`)**: The frontend maintains a dedicated access control hook that stores the current user’s permission profile and role scope.
- **Backend Enforcer (`routes/access_control.py`)**: Before any sensitive financial data or approval action is executed, the backend validates the authorization token against the access control router.
- **Full-Stack Outcome**: If an executive views the project timeline, the backend serves full portfolio metrics; if a department head logs in, the backend filters the payload to their specific department, and the frontend dynamically renders only the relevant approval buttons.

### 3.3 Media Streaming & Document Download Pipeline
The system integrates dedicated media pipelines to handle large binary files for onboarding and presentations:
- **Streaming Handshake**: When a user opens the video guide, the frontend requests `/api/user-manual/status` to confirm file availability, then directly accesses the video stream hosted at `/static/videos/user_manual.mp4`.
- **Presentation Downloads**: Clicking the user manual download button routes directly to `/api/download/user-manual-ppt`, where FastAPI utilizes `FileResponse` to stream the exact `CAPEX_Portal_User_Manual.pptx` file directly to the user’s local machine.

---

## 4. Paradigm Shift: Modernizing the Excel Legacy

The primary success metric of this integration is the complete eradication of legacy Excel workflows. The table below illustrates the immense architectural improvements realized through our full-stack portal integration:

| Workflow Dimension | Legacy Microsoft Excel Workflow | Integrated CAPEX Portal System |
| :--- | :--- | :--- |
| **Data Synchronization** | **Disjointed**: Files circulated via email; high risk of conflicting versions and stale numbers. | **Single Source of Truth**: All clients connect to a unified MongoDB backing store via FastAPI. |
| **Filtering & Exploration** | **Tedious & Sluggish**: Requires manual pivot table generation and cross-tab lookups. | **Instantaneous**: `useMemo` client-side caching enables real-time drill-downs without server latency. |
| **Access Control & Security** | **Vulnerable**: Password-protected sheets easily bypassed or shared inappropriately. | **Granular RBAC**: Backend strictly enforces role-based clearance (`useAccessControl.js`). |
| **Lifecycle & Gantt Tracking** | **Static & Manual**: Progress bars and dates manually colored and typed into cell blocks. | **Dynamic & Automated**: Real-time Gantt rendering (`1.2x` to `8x` zoom) directly driven by database timestamps. |
| **Auditability & Rollback** | **Non-existent**: Accidental overrides destroy historical data permanently. | **Robust**: Automated transaction logs and bulk upload history rollbacks safeguard data integrity. |

---

## 5. Conclusion
The integration of the React frontend and FastAPI backend successfully establishes an enterprise-grade financial portal. By enforcing strict CORS boundaries, synchronizing access control across both layers, and providing instant client-side memoization over a centralized database, the system permanently resolves the inefficiencies and security vulnerabilities of legacy spreadsheet management.
