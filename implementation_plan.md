# Helpdesk: AI-Powered Ticket Management System Implementation Plan

## Goal Description
Build a professional, clean, and high-performance AI-powered ticket management system named **Helpdesk** over a **1-week timeline**. 
The system features:
- A decoupled stack: **Vite + React** (Frontend) and **Node.js + Express.js + PostgreSQL** (Backend).
- A clean, professional **Light Theme** (minimalist design, high legibility, no distracting animations).
- Autopilot AI responder for low/medium priority solvable tickets and human routing for complex tickets.

---

## 1-Week Phased Development Timeline

We have broken the project into 7 consecutive daily phases to ensure complete delivery in 1 week:

```mermaid
gantt
    title Helpdesk 1-Week Project Timeline
    dateFormat  YYYY-MM-DD
    section Backend & Database
    Phase 1: DB Schema & Project Setup         :active, p1, 2026-07-08, 1d
    Phase 2: Auth & Ticket APIs                : p2, after p1, 1d
    section Frontend Development
    Phase 3: Client Setup & Auth Integration   : p3, after p2, 1d
    Phase 4: Dashboard UI & Management Panels  : p4, after p3, 1d
    section AI & Simulator Integration
    Phase 5: AI Engine (Summarizer/Responder)  : p5, after p4, 1d
    Phase 6: Email Simulator & System Testing  : p6, after p5, 1d
    section Verification & Polish
    Phase 7: Final Validation & Handover       : p7, after p6, 1d
```

### Phase 1 (Day 1): Project Initializing & Database Schema Setup
* **Goal**: Create backend project structure, set up PostgreSQL database connection, and build data schemas.
* **Tasks**:
  1. Initialize `backend` directory with `package.json`, install Express, Prisma, dotenv, CORS, pg.
  2. Write Prisma schema (`schema.prisma`) for `User`, `Ticket`, and `AuditLog`.
  3. Execute database migration to create PostgreSQL tables.
  4. Write a database seeding script to insert initial users (Admin and Customer Agents).

### Phase 2 (Day 2): Backend Authentication & Ticket APIs
* **Goal**: Build secure backend endpoints for user sessions and ticket operations.
* **Tasks**:
  1. Set up JWT-based authentication middleware.
  2. Implement `/api/auth/login` (generates HTTPOnly JWT cookie) and `/api/auth/logout`.
  3. Implement `/api/tickets` CRUD endpoints (Create, Read, Update, Delete).
  4. Build filtering routes for tickets based on `status`, `priority`, and text search.
  5. Implement `/api/agents` endpoints (Admin only) to add and list agents.

### Phase 3 (Day 3): Frontend Initializing & Authentication UI
* **Goal**: Launch frontend development server and establish authentication UI/routing.
* **Tasks**:
  1. Initialize `frontend` directory using React + Vite.
  2. Establish the **Light Theme CSS variables** in `src/index.css` (clean white/slate palette).
  3. Build a professional, distraction-free Login Page with robust input validation.
  4. Set up React Router with protected route validation (Admin vs. Agent dashboards).

### Phase 4 (Day 4): Client Dashboard & Detail Views
* **Goal**: Build the core ticket list, search filters, detail view, and navigation panels.
* **Tasks**:
  1. Design Navbar showing application logo, user info (name, role), and Logout button.
  2. Build Dashboard layout: Search bar, priority filter dropdown, status filter dropdown.
  3. Create Ticket List view displaying sender name, topic, priority pill, and creation time.
  4. Build Ticket Detail panel on the side for reading content, changing ticket attributes, and viewing the audit logs.
  5. Implement Agent Management view (visible only to Admins) with forms to create customer agents.

### Phase 5 (Day 5): AI Engine Integration (Gemini SDK)
* **Goal**: Power the ticket system with automatic prioritization, summaries, and replies.
* **Tasks**:
  1. Configure `@google/genai` (or `@google/generative-ai`) SDK on the backend using `GEMINI_API_KEY`.
  2. Implement AI ticket processing pipeline:
     - Classify inbound emails (Low, Medium, High, Urgent).
     - Assess solvability.
     - Generate a personalized response draft.
     - Auto-respond & resolve Low/Medium tickets (Autopilot).
  3. Create `/api/tickets/:id/summarize` route to generate bullet-point ticket summaries on-demand.

### Phase 6 (Day 6): Email Simulator & System Testing
* **Goal**: Build testing capabilities to inject customer emails and verify AI routing.
* **Tasks**:
  1. Build a simple "Email Simulator" panel on the dashboard interface.
  2. Allow typing mock student queries (e.g. payment issues, login issues, pre-purchase questions) and sending them.
  3. Test Autopilot path: Verify low-priority query gets immediately resolved with an AI auto-reply.
  4. Test Human Routing path: Verify payment failures or high-priority issues are marked PENDING and assigned to agents.

### Phase 7 (Day 7): UI Polish, Verification & Final Handover
* **Goal**: Final audit, fixing bugs, and ensuring production readiness.
* **Tasks**:
  1. Conduct full security check on JWT routing.
  2. Refine the Light CSS styling to ensure a clean, high-contrast, professional design.
  3. Verify all filter states work seamlessly together.
  4. **Security Enhancement:** Separated Admin and Agent login portals (`/admin` and `/login`) with backend role verification.
  5. Write the final Walkthrough artifact summarizing completed work and verification screenshots.

---

## Clean Light CSS Design Tokens
To ensure a highly professional, clean, distraction-free aesthetic, we will use a light, high-contrast palette:

```css
/* file: frontend/src/index.css */
:root {
  --font-sans: 'Inter', -apple-system, sans-serif;
  
  /* Minimalist Light Palette */
  --bg-main: #f8fafc;           /* Clean Slate Light */
  --bg-surface: #ffffff;        /* Pure White */
  --bg-surface-hover: #f1f5f9;  /* Light grey hover */
  --border-color: #e2e8f0;      /* Slate border */
  
  --text-primary: #0f172a;      /* Deep Slate Dark */
  --text-secondary: #475569;    /* Medium Slate */
  --text-muted: #64748b;        /* Light Slate */

  /* Priority & Status Pills (High Legibility, Solid Borders) */
  --priority-low: #059669;       /* Emerald Green */
  --priority-medium: #d97706;    /* Amber Orange */
  --priority-high: #dc2626;      /* Red */
  --priority-urgent: #7c3aed;    /* Purple */
  
  --status-resolved: #059669;
  --status-pending: #2563eb;     /* Blue */
  --status-review: #d97706;

  --accent-primary: #4f46e5;     /* Indigo Primary */
  --accent-primary-hover: #4338ca;
  --bg-input: #f8fafc;
}
```

---

## Verification Plan

### Automated Verification
* Run database pushes and migrations on PostgreSQL using `npx prisma db push`.
* Verify that APIs respond correctly to CRUD requests.

### Manual Verification Flow
* **Auth Tests**: Login with correct/incorrect credentials, ensure proper redirection.
* **Autopilot & Routing Tests**: Create a pre-purchase ticket (should auto-respond and resolve) and a payment failure ticket (should stay pending and flag for human review).
* **Summary Generation**: Request an AI summary of a ticket, check bullet-point readability.
* **Agent Creation**: Admin creates a new agent, logs in with agent credentials, verifies inability to see or manage other agents.
