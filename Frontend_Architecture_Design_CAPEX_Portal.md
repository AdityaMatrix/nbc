# Frontend Architecture & UI/UX Design Specification

## 1. Executive Summary & Design Philosophy
The frontend of the **CAPEX (Capital Expenditure) Intelligence Portal** was architected to replace a legacy, cumbersome Microsoft Excel workflow with an elegant, highly responsive web application. Designed under the overarching philosophy of **"Precision Technical"**, the user interface prioritizes clarity, data density, and lightning-fast exploratory interactions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND ARCHITECTURE                           │
├──────────────────────────────┬─────────────────────────────────────────┤
│    THEMING & DESIGN SYSTEM   │           DATA FLOW & STATE             │
│  - Light Canvas (#fafafa)    │  - Single Typed Source (capex.ts)       │
│  - Token-Driven Tailwind v4  │  - useMemo Client-Side Filtering        │
│  - Inter + JetBrains Mono    │  - Zero Latency Dashboard Recomputation │
├──────────────────────────────┴─────────────────────────────────────────┤
│                       MODULAR UI SURFACES                              │
│  - Analytics Dashboard (KPIs, Recharts, Supplier Tables)               │
│  - Project Timeline (MiniGantt, Detail Drawers, Multi-Compare)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack & Selection Rationale

To achieve an executive-grade experience with real-time responsiveness, the following cutting-edge technologies were selected:

### 2.1 React 19 & TanStack Start / Vite
- **Why it was chosen**: React 19 combined with Vite provides an incredibly fast development environment with instant Hot Module Replacement (HMR) and optimized production bundling. TanStack Start ensures highly robust, modern client-side structure and routing capabilities.
- **The Benefit**: Eliminates the slow load times of heavy enterprise web apps, ensuring clean component lifecycles and highly performant rendering of complex financial tables.

### 2.2 Tailwind CSS v4 (Token-Driven)
- **Why it was chosen**: Rather than writing brittle, monolithic CSS files or utilizing hardcoded utility strings, Tailwind v4 was deployed using a **token-driven semantic design system** (`src/styles.css` and `tailwind.config.js`).
- **The Benefit**: All colors, borders, and spacing utilize semantic tokens. This guarantees absolute visual consistency across all pages and establishes an effortless foundation for future theming (such as an automated Dark Mode).

### 2.3 Recharts
- **Why it was chosen**: Recharts provides robust, declarative React components for building complex SVG charts with minimal rendering overhead.
- **The Benefit**: Powers the interactive Plant-wise spend bar charts, Department breakdown donut charts, and cumulative lifecycle progress line charts with full tooltip support and drill-down highlighting.

### 2.4 Shadcn/UI Modular Component Architecture
- **Why it was chosen**: Rather than importing a heavy, rigid component library, the portal utilizes modular, accessible UI primitives (`src/components/ui/*` including Drawers, Tables, Dialogs, Selects, and Menubars).
- **The Benefit**: Gives our engineering team complete ownership over component markup and styling, guaranteeing that every interactive element adheres exactly to the "Precision Technical" design guidelines.

---

## 3. Core Design Direction: "Precision Technical"

Every visual decision was made to build trust in the underlying financial data and prevent user fatigue:

| Design Aspect | Decision & Implementation | Architectural Rationale |
| :--- | :--- | :--- |
| **Theme & Canvas** | Light canvas (`#fafafa`), crisp white cards, hairline border rings. | Reduces visual fatigue during long, data-heavy analysis sessions; keeps the user's focus entirely on the numbers. |
| **Accent Palette** | Emerald / green accents (`oklch(0.596 0.145 163)`). | Signals financial health and active "go" status, completely avoiding the generic AI purple-on-white aesthetic. |
| **Typography** | **Inter (UI)** paired with **JetBrains Mono** for numerical data. | Monospaced tabular figures align perfectly in vertical table columns, making massive spend figures and percentages instantly scannable. |
| **Localization** | Indian Rupee (₹) with custom Crore/Lakh formatting. | Matches the target audience's native financial accounting conventions, making executive reporting highly intuitive. |

---

## 4. Independent Frontend Functionality & Data Architecture

A groundbreaking feature of the frontend architecture is its ability to operate highly complex analytical workflows independently of the backend via client-side state management.

### 4.1 Single Source of Truth & Client-Side Filtering (`useMemo`)
- **How it works**: The frontend utilizes an in-memory typed dataset (`src/data/capex.ts`) containing structured data for POs, suppliers, plants, departments, and 42 deterministic projects. Advanced React memoization (`useMemo`) is applied over this dataset.
- **Why it helps**: When a user adjusts filters, the KPIs, charts, and tables recompute instantly in memory without initiating round-trips to the backend server. Users experience zero-latency exploratory drilling (e.g., instantly answering *"which department exceeded budget in Q2?"*). Furthermore, because every widget subscribes to the same memoized filter state, conflicting numbers are completely eliminated.

### 4.2 Core Application Surfaces

#### A. Analytics Page (`/` - `Analytics.jsx`)
- **Sticky Filters Bar**: A persistent header providing immediate dropdown filtering for Fiscal Year, Period (Daily/Monthly/Quarterly), Plant, Department, Supplier, and live PO-number searching.
- **6 KPI Cards**: Instant high-level spend summaries at a glance.
- **Visual Charts**: Plant-wise spend bar charts and Department breakdown donut charts featuring interactive hover tooltips.
- **Supplier Performance Table**: A sortable, searchable table displaying spend, PO counts, on-time delivery percentages, and realized cost savings, complete with status badges and progress bars.
- **Ask-AI Command Bar**: A sleek visual command placeholder designed for future natural language AI query features.

#### B. Project Timeline Page (`/timeline` - `ProjectTimeline.jsx`)
- **Interactive Project List**: A highly robust, sortable table featuring a `MiniGantt` progress bar, priority/status badges, and a reactive KPI strip (Total, Delayed, At Risk, In Progress, Completed) that updates immediately based on active filters.
- **Personalized Per-Project Analytics Drawer**: Clicking any project row triggers a smooth slide-out detail drawer (`RequestDetailSidebar.jsx`). It transforms a single table row into a focused mini-report displaying budget vs. spent utilization, stage-duration bar charts, and a vertical lifecycle timeline (`CEA → PR → PO → Manufacturing → Dispatch → Installation → Commissioning → Closure`).
- **Gantt Date-Axis View**: A zoomable timeline view (scaling from `1.2x` to `8x` pixels/day) featuring a sticky project-label column, a month-based date axis, and color-coded stage bars showing real start/end ranges. This exposes scheduling overlaps and portfolio slippage that simple percentage bars cannot convey.
- **Multi-Project Comparison Drawer**: Selecting up to 5 projects via checkboxes activates a floating Compare bar. Opening the compare drawer presents a side-by-side metric table (budget, spent, progress, delay), grouped bar charts for stage durations, and cumulative line charts for lifecycle progress. This enables executive benchmarking to easily identify outliers and determine where operational intervention is required.

---

## 5. Animations & Micro-Interactions
To ensure the application feels dynamic, polished, and premium, custom CSS keyframe animations were embedded in `src/styles.css`:
- **`animate-slide-in`**: Powers the ultra-smooth entry of the Per-Project Analytics Drawer and Multi-Project Compare Drawer, maintaining layout stability.
- **`animate-fade-in`**: Provides elegant fade transitions for modal dialogs, floating compare bars, and dynamic chart re-renders, creating a cohesive, world-class user experience.
