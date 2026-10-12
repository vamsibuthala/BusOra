# 🚍 BusOra – Smart College Bus Tracking System

> **Next-Gen Campus Transit & Live GPS Fleet Platform**  
> Built with **React + Tailwind CSS** (Frontend), **Node.js & Express + Socket.IO** (Backend), and **Supabase (PostgreSQL & Realtime)** (Database).

---

## 🌟 Features Overview

- **👑 Role Hierarchy Management**:
  1. **Super Admin**: Master privileges to add, edit, and deactivate user accounts for all roles (Admins, Drivers, and Students), assign buses & routes, and monitor fleet KPIs.
  2. **Driver**: Starts and ends trips, streams real-time satellite GPS coordinates, tests route motion with a built-in drive simulator, and reports incidents (delays, breakdowns, emergency SOS).
  3. **Student**: Live satellite GPS bus radar, accurate stop ETA countdown, distance calculation, stop checklist, and audio/push approach alerts (< 500m).
- **🎨 Modern Homepage**: High-conversion landing page with official **BusOra** branding, interactive live route explorer, real-time telemetry simulator, and 1-click demo login buttons.
- **⚡ Supabase Database Integration**: Production-ready PostgreSQL schema (`supabase_schema.sql`) with tables for users, routes, buses, trips, bus locations, and notifications with foreign keys and indexes.
- **🗺️ Interactive Leaflet Map**: Smooth bus tracking, customized pins, route polylines, and designated stop highlights.
- **🌐 Monorepo Structure**: Clean root layout ready for **Git** and **Vercel** deployment.

---

## 🔐 Role Credentials & Demo Accounts

| Role | Email | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `admin@busora.com` | `Admin@123` | Full control: Add new user accounts, assign buses/stops, manage routes, fleet view |
| **🚍 Driver 1** | `driver@busora.com` | `Driver@123` | Assigned to **BUS-01** (Route A). Starts trips, streams GPS, reports route incidents |
| **🚍 Driver 2** | `driver2@busora.com` | `Driver@123` | Assigned to **BUS-02** (Route B). Starts trips, streams GPS |
| **🎓 Student 1** | `student@busora.com` | `Student@123` | Assigned to **BUS-01**, boarding at **Market Complex** stop |
| **🎓 Student 2** | `student2@busora.com` | `Student@123` | Assigned to **BUS-01**, boarding at **Central Railway Station** |

> 💡 **Quick Demo Fill:** On the login screen, click any of the 1-click demo buttons to automatically populate credentials!

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (Node v20+ recommended)
- **npm** or **yarn**

### 2. Backend Setup
```bash
cd server
npm install
npm run dev
```
*The server will start on `http://localhost:5000`.*
*(If Supabase environment variables are not yet provided, it seamlessly runs with the fast in-memory store preloaded with the above demo accounts!)*

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install
npm run dev
```
*Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

## 🗄️ Setting up Supabase Database

1. Sign in or create a free project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** in your Supabase project dashboard.
3. Open `supabase_schema.sql` from this repository, copy all contents, and click **Run**.
4. Go to **Project Settings -> API** in Supabase and copy:
   - `Project URL` (e.g., `https://xyzcompany.supabase.co`)
   - `anon public key`
   - `service_role secret key`
5. Open `server/.env` and paste your credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
6. (Optional) Run the seed script to populate Supabase:
   ```bash
   cd server
   npm run seed
   ```

---

## 🐙 Push to Git

To push this repository to your GitHub account:

```bash
# 1. Initialize git if not already initialized
git init

# 2. Add all files
git add .

# 3. Commit changes
git commit -m "feat: complete BusOra React + Tailwind, Express, Supabase DB, role hierarchy, and landing page"

# 4. Link your GitHub remote repository
# Replace <YOUR_GITHUB_REPO_URL> with your actual repository URL
git remote add origin <YOUR_GITHUB_REPO_URL>

# 5. Push to main branch
git branch -M main
git push -u origin main
```

---

## 🔺 Deploy to Vercel

### Deploying the Frontend:
1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` (or keep root with included `vercel.json`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_URL` = `https://your-backend-service.onrender.com` (your deployed Express server URL)
5. Click **Deploy**!

### Deploying the Backend:
Because the backend uses **Socket.IO** for persistent real-time GPS websockets, deploy `server/` to a persistent Node host such as **Render**, **Railway**, or **Fly.io**:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: `5000` (or host provided)
  - `JWT_SECRET`: your secret key
  - `CLIENT_ORIGIN`: your Vercel deployment URL (e.g. `https://busora.vercel.app`)
  - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
