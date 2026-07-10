# Helpdesk: AI-Powered Ticket Management System
## Final Walkthrough & Documentation

Welcome to **Helpdesk**, a full-stack, AI-powered customer support ticketing system designed for speed, clarity, and automation. This document serves as the final walkthrough of the project's architecture, features, and operational workflows.

---

## 🏗️ Architecture & Tech Stack
The application is built on a decoupled, modern web stack:

- **Frontend:** React + Vite
  - **Styling:** Custom "Light Theme" vanilla CSS (clean, distraction-free minimalist aesthetic).
  - **Routing:** React Router DOM (with protected Auth wrappers).
- **Backend:** Node.js + Express.js
  - **Database:** PostgreSQL managed via Prisma ORM.
  - **Authentication:** JWT (JSON Web Tokens) stored securely in HTTP-only cookies.
- **AI Engine:** Google Gemini SDK (`@google/genai`)

---

## ✨ Core Features & Workflows

### 1. Dual-Portal Security
We implemented a strict separation of concerns for security and user experience:
- **Agent Portal (`/login`):** A clean interface where customer support agents log in. They can only see tickets assigned to them (or unassigned/pending tickets). They cannot access system settings or create other users.
- **Admin Portal (`/admin`):** A restricted access point for HQ personnel. Admins can view all tickets, access the "Agent Management" tab, create new agent accounts, and use the Email Simulator for testing. If an Agent attempts to log into the Admin portal, the backend outright rejects the request (`403 Forbidden`).

### 2. Gemini AI Autopilot Pipeline
Every inbound ticket (simulated via the Email Simulator) runs through a sophisticated AI pipeline:
- **Triage:** The AI reads the email and determines the urgency (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Autopilot Resolution:** If the ticket is a simple query (e.g., password reset, generic FAQ), the AI automatically drafts a warm, personalized response and marks the ticket as `RESOLVED`.
- **Human Routing:** If the ticket requires human intervention (e.g., billing issues, complex bugs), the AI marks it as `PENDING`.
- **On-Demand Summaries:** For long, complex customer emails, agents can click "Generate AI Summary" to receive a concise, bulleted breakdown of the issue directly in the sidebar.

### 3. Quota-Based Smart Assignment
When a ticket requires human intervention, it isn't assigned randomly. We engineered a highly scalable **Quota-Based Round-Robin Assignment** algorithm:
1. The system calculates the exact number of active (`PENDING` or `REVIEW_NEEDED`) tickets across the platform.
2. It divides that number by the total number of active agents to find the "Fair Quota".
3. The new ticket is mathematically assigned to the agent furthest below their quota, ensuring workload is distributed perfectly evenly.

### 4. Interactive Dashboard UI
The central workspace (`Dashboard.jsx`) was meticulously designed for high legibility and premium UX:
- **Dark Mode Toggle:** Agents can instantly switch between a pristine "Light Theme" and a deep slate "Dark Theme" using a toggle in the navbar. The preference is saved locally for seamless sessions. All inputs, text areas, and dropdowns dynamically invert to maintain perfect visibility.
- **Rich Text Editor:** The standard text area was upgraded to a full WYSIWYG editor (`react-quill-new`), allowing agents to format their replies with bolding, lists, and headers.
- **Real-Time Polling:** The dashboard silently fetches updates every 10 seconds, meaning ticket assignments and agent workload counts update automatically without requiring manual page refreshes.
- **Collapsible Layout:** The left navigation sidebar and right Ticket Detail panel can be collapsed or expanded, allowing agents to focus entirely on reading tickets.
- **Custom Toast Notifications:** We replaced ugly default browser alerts with beautiful, themed "floating card" toast notifications that adapt to both light and dark modes while maintaining status-colored borders (e.g., green for success).
- **Agent Reply System:** When a reply is sent via the Rich Text editor, the ticket automatically resolves, the formatted response is logged as an HTML block, and a clean green checkmark appears in the Audit Log timeline.

---

## 🚀 How to Run the Project

Since the project is divided into two distinct folders, you will need two terminal windows.

### 1. Start the Backend (API & Database)
Open your first terminal and navigate to the backend folder:
```bash
cd backend
npm install
node server.js
```
*The backend will boot up on `http://localhost:5000`.*

### 2. Start the Frontend (React App)
Open your second terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will boot up on `http://localhost:5173`.*

---

## 🧪 Testing the System (Walkthrough)

1. **Login as Admin:** Navigate to `http://localhost:5173/admin` and log in using the demo credentials (`admin@helpdesk.com` / `Admin@123`).
2. **Create an Agent:** Click the "Agent Management" tab on the left sidebar. Create a new test agent (e.g., John Doe, `john@helpdesk.com`).
3. **Simulate Emails:** Click the "Email Simulator" button in the top right. 
   - Send a **Low Priority** template. Watch it immediately appear on the dashboard as `RESOLVED` with an AI Auto-Reply.
   - Send a **High Priority** template. Watch it appear as `PENDING` and automatically assign itself to the newly created agent!
4. **Agent Workflow:** Log out of the Admin portal. Navigate to `http://localhost:5173/login` (the Agent portal) and log in as John Doe. You will see your newly assigned ticket. Open it, type a response in the reply box, and hit "Send Reply & Resolve". 

---
*Project successfully completed and verified. Ready for production deployment.*
