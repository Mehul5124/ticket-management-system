# 🎫 Helpdesk: AI-Powered Ticket Management System

![Helpdesk Banner](https://via.placeholder.com/1200x400/0f172a/ffffff?text=AI-Powered+Helpdesk+System)

Welcome to **Helpdesk**, a full-stack, enterprise-grade customer support ticketing system designed for speed, clarity, and intelligent automation. Built with the PERN stack (PostgreSQL, Express, React, Node) and integrated with Google's Gemini AI, this system automatically triages, routes, and resolves customer inquiries.

---

## ✨ Key Features

- **🤖 AI Autopilot (Gemini 2.5):** Automatically analyzes inbound tickets, categorizes their urgency (Low to Urgent), and drafts automatic resolutions for standard queries.
- **⚖️ Smart Round-Robin Routing:** Intelligently distributes complex tickets to the human agent with the lowest active workload to ensure perfect quota balance.
- **🌗 Stunning UI & Dark Mode:** A meticulously designed dashboard with instant Light/Dark mode toggling, smooth micro-animations, and full mobile responsiveness.
- **📝 Rich Text Editing:** Built-in WYSIWYG editor (`react-quill-new`) for agents to format replies, create lists, and send professional responses.
- **🛡️ Dual-Portal Security:** Strict role-based access control (RBAC). Admins manage the platform and agents, while Agents have a focused workspace for resolving tickets.
- **⚡ Real-Time Polling:** The dashboard silently fetches updates in the background, keeping workload counts and assignments perfectly synced without page refreshes.

---

## 🏗️ Architecture & Tech Stack

**Frontend:**
- **React 19 & Vite:** Lightning-fast HMR and optimized production builds.
- **React Router DOM:** Protected routing and authentication wrappers.
- **Vanilla CSS:** Custom, lightweight design system (No heavy UI frameworks).
- **Lucide React:** Premium SVG iconography.

**Backend:**
- **Node.js & Express.js:** Robust REST API architecture.
- **Prisma ORM:** Type-safe database queries and seamless schema migrations.
- **PostgreSQL:** Relational database for strict data integrity (Hosted on Supabase).
- **JWT & Bcrypt:** Secure HTTP-only cookie authentication and password hashing.
- **Google GenAI SDK:** Direct integration with Gemini 2.5 Flash for natural language processing.

---

## 🚀 Quick Start Guide (Local Development)

To run this project locally on your machine, follow these steps:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A PostgreSQL database (Local or Cloud like Supabase/Neon)
- A [Google Gemini API Key](https://aistudio.google.com/)

### 2. Clone the Repository
```bash
git clone https://github.com/YourUsername/ticket-management-system.git
cd ticket-management-system
```

### 3. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/helpdesk"
JWT_SECRET="your-super-secret-jwt-key"
GEMINI_API_KEY="your-google-gemini-key"
```
Push the schema to your database and seed the initial Admin account:
```bash
npx prisma db push
node prisma/seed.js
```
Start the backend server:
```bash
npm run dev
```

### 4. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```
Start the frontend development server:
```bash
npm run dev
```

The application will be running at `http://localhost:5173`. 
**Default Admin Credentials:**
- Email: `admin@helpdesk.com`
- Password: `Admin@123`

---

## 🌐 Production Deployment

This project is fully optimized for modern cloud deployments.
- **Database:** Hosted on [Supabase](https://supabase.com/) (using connection pooling).
- **Backend:** Hosted on [Render](https://render.com/) (Node Web Service).
- **Frontend:** Hosted on [Vercel](https://vercel.com/) (Vite preset with `vercel.json` API rewrites to avoid CORS).

*(For a detailed deployment walkthrough, refer to the internal Deployment Plan guide).*

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/YourUsername/ticket-management-system/issues).

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
