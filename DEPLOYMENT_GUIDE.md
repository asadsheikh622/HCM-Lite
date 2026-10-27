# HCM Lite — Complete Hackathon Deployment, Architecture & Verification Guide

Welcome to the complete deployment guide for **HCM Lite (AI-Assisted HR Management System)**. This document provides step-by-step instructions for deploying HCM Lite to **Vercel** with **MongoDB Atlas**, resolving API routing issues (including `404` and `405 Method Not Allowed`), setting up your Super Admin account, and submitting your project for the Saylani Hackathon.

---

## 1. Project Status Overview

| Task / Component | Status | Details |
| :--- | :--- | :--- |
| **Frontend UI & Dashboards** |  **Completed** | React 19 + Vite + Tailwind CSS with Admin, HR, and Employee role-based dashboards. |
| **Express Backend & Routes** |  **Completed** | Full REST API covering Auth, Employees, Attendance, Leave, Payroll, Announcements, Notifications, and Audit Logs. |
| **Vercel Serverless Architecture** |  **Completed** | Created `/api/index.ts` and `vercel.json` with unified rewrites and preflight CORS handling. |
| **Vercel 404 / 405 Errors Fix** |  **Completed** | Route prefixes `/api/v1`, `/v1`, and `/api` mapped to the serverless Express handler. SPA rewrites exclude `/api/*`. |
| **Admin Setup & Login Security** |  **Completed** | One-time bootstrap locked to `INITIAL_ADMIN_EMAIL`. Password hashing via `bcryptjs` and session tokens via `jsonwebtoken`. |
| **MongoDB Atlas Connection Pool** |  **Completed** | Single reusable connection pool with auto-reconnection and serverless ready-state caching. |
| **Circuit Breakers & Health Probe** |  **Completed** | Real-time health diagnostic endpoint at `/api/v1/health` reporting database connection, cluster host, and system state. |
| **Live MongoDB Atlas Cluster** | ⚠️ **Manual Action** | You must create your free MongoDB Atlas cluster and paste the connection string into Vercel environment variables. |
| **GitHub Push & Vercel Import** | ⚠️ **Manual Action** | Push your code using GitHub Desktop and connect the repository in your Vercel Dashboard. |

---

## 2. Step-by-Step MongoDB Atlas Setup Guide

Follow these exact steps to create a free cloud database on MongoDB Atlas:

### Step 2.1: Create an Account & Cluster
1. Visit **[mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)** and sign in or create a free account.
2. Click **Create** or **Build a Database**.
3. Choose the **M0 Free (Shared)** cluster option (free forever, 512 MB storage).
4. Select a cloud provider (e.g. AWS) and the region closest to you (e.g., `us-east-1` or `eu-central-1`).
5. Set Cluster Name (e.g., `Cluster0`) and click **Create Deployment**.

### Step 2.2: Create a Database User
1. In the Atlas dashboard, open the left sidebar and click **Database Access** under the *Security* section.
2. Click the green **+ Add New Database User** button.
3. Select **Password** as the Authentication Method.
4. **Username**: enter `hcm_admin` (or your preferred username).
5. **Password**: click *Autogenerate Secure Password* or create a strong password (e.g., `Hcmlite2026SecurePass!`). **Copy and save this password immediately.**
6. Under **Database User Privileges**, select **Read and write to any database** (built-in role).
7. Click **Add User**.

### Step 2.3: Whitelist Network IP Access (Crucial for Vercel)
> ⚠️ **CRITICAL STEP**: Vercel functions run in dynamic serverless cloud regions. You **must** allow access from anywhere (`0.0.0.0/0`), otherwise MongoDB Atlas will refuse connections and your Vercel API will return database connection errors.

1. In the Atlas left sidebar, click **Network Access** under *Security*.
2. Click **+ Add IP Address**.
3. Click the button **Allow Access From Anywhere** (this automatically fills `0.0.0.0/0` in the Access List Entry).
4. In the comment field, enter `Vercel Serverless Deployment`.
5. Click **Confirm**. Wait 15–30 seconds until the status changes from *Pending* to *Active*.

### Step 2.4: Copy Your Connection String
1. In the left sidebar, click **Database** under *Deployments*.
2. Click the **Connect** button next to your cluster.
3. Select **Drivers** (Node.js).
4. Under *3. Add your connection string into your application code*, copy the connection string. It will look like this:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Replace `<password>` with the password you saved in Step 2.2.
6. Specify the database name `hcm_lite` before the query parameter `?`:
   ```
   mongodb+srv://hcm_admin:YourRealPassword123@cluster0.abcde.mongodb.net/hcm_lite?retryWrites=true&w=majority
   ```
7. This full URL is your `MONGODB_URI`. Keep it private.

---

## 3. Vercel Backend & Express.js Architecture Requirements

### Why Previous Deployments Had 404 and 405 Errors
* **The 404 Error**: Occurred because Vercel was treating the project as a pure static Vite site. Requests to `/api/v1/...` looked for static files in `dist/api/v1/...` and failed.
* **The 405 Method Not Allowed Error**: Occurred when a generic SPA rewrite rule (e.g. `/(.*) -> /index.html`) routed `POST` or `PUT` API calls (such as `/api/v1/auth/login` or `/api/v1/setup/bootstrap-admin`) to the static `index.html` file. Static web servers strictly reject `POST` requests with HTTP 405.
* **The Serverless Cold-Start / Connection Dropping Issue**: Standalone Express apps listen continuously on a persistent port (`app.listen(3000)`), whereas Vercel invokes a Serverless Function on demand.

### The Unified Solution Implemented
We implemented a **single, unified Vercel architecture**:
1. **Frontend**: Vite compiles all client assets into `/dist` via `vite build`.
2. **Backend Serverless Handler (`/api/index.ts`)**: An Express app exported as a Vercel Serverless Function that initializes and caches the MongoDB Atlas connection pool on every invocation.
3. **Smart Rewrites (`vercel.json`)**:
   - `/api/(.*)` rewrites to `/api/index` (handled by Express).
   - `/api` rewrites to `/api/index`.
   - `/((?!api/).*)` rewrites to `/index.html` (pure client-side routing for SPA views without conflicting with API calls).
4. **Preflight CORS Protection**: Explicit `OPTIONS *` handlers return HTTP 204 No Content with CORS headers, preventing browsers from blocking login or admin requests.

---

## 4. Required Environment Variables

Configure these environment variables in your Vercel Project Settings:

| Variable Name | Required? | Example / Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | **YES (Prod)** | `mongodb+srv://user:pass@cluster0.xyz.mongodb.net/hcm_lite?retryWrites=true&w=majority` | Connects your backend to your MongoDB Atlas cluster. |
| `JWT_SECRET` | **YES** | `k9#mP$2vL@8xQ!zR5wT#yB1uE*4nJ7sA` | Secret key used to sign and verify JSON Web Tokens. Must be 32+ characters. |
| `INITIAL_ADMIN_EMAIL` | **YES** | `asadqadri239@gmail.com` | Email authorized to complete the Phase 1 One-Time Super Admin Setup. |
| `NODE_ENV` | Optional | `production` | Set automatically by Vercel to `production`. |
| `GEMINI_API_KEY` | Optional | `AIzaSy...` | Optional Gemini API key for natural language leave parsing and the AI Assistant. |

> 🔒 **Security Notice**: Never paste real passwords or API keys into `.env.example` or commit a `.env` file to GitHub. Only enter them in Vercel's secure dashboard.

---

## 5. How to Configure Environment Variables in Vercel

1. Open your project in the **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click on the **Settings** tab in the top navigation bar.
3. In the left sidebar, click **Environment Variables**.
4. Add each variable one by one:
   - **Key**: `MONGODB_URI`  
     **Value**: `mongodb+srv://...` (your full MongoDB Atlas connection string)  
     **Environment**: Check *Production*, *Preview*, and *Development*.  
     Click **Save**.
   - **Key**: `JWT_SECRET`  
     **Value**: (Enter any random string of 32+ characters, e.g., `hcm_lite_jwt_master_production_key_2026_secure`)  
     **Environment**: Check *Production*, *Preview*, and *Development*.  
     Click **Save**.
   - **Key**: `INITIAL_ADMIN_EMAIL`  
     **Value**: `asadqadri239@gmail.com`  
     **Environment**: Check *Production*, *Preview*, and *Development*.  
     Click **Save**.
   - **Key**: `GEMINI_API_KEY` *(Optional)*  
     **Value**: (Your Google Gemini API key if you want live AI assistant responses)  
     **Environment**: Check *Production*, *Preview*, and *Development*.  
     Click **Save**.
5. **Redeploy**: If you already have an existing deployment, go to the **Deployments** tab, click the three dots (`...`) next to the latest deployment, and select **Redeploy** so the new variables take effect.

---

## 6. How to Commit and Push Using GitHub Desktop

If you use **GitHub Desktop** to manage your project:

1. Open **GitHub Desktop**.
2. If the repository is not open, click **File > Add Local Repository...** and select your project folder.
3. You will see the changed files in the left sidebar:
   - `api/index.ts`
   - `vercel.json`
   - `server.ts`
   - `server/src/config/database.ts`
   - `server/src/config/env.ts`
   - `server/src/routes/api.routes.ts`
   - `server/scripts/initialize-database.ts`
   - `package.json`
   - `.env.example`
   - `.gitignore`
   - `DEPLOYMENT_GUIDE.md`
4. In the bottom-left corner of GitHub Desktop:
   - In the **Summary** box, type: `Configure Vercel serverless deployment and API routing`.
   - In the **Description** box, type: `Add api/index.ts, vercel.json rewrites, and serverless MongoDB Atlas support`.
5. Click the blue **Commit to main** button.
6. Click the **Push origin** button in the top toolbar to sync changes to GitHub.

---

## 7. How to Deploy and Verify on Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)**.
2. Under **Import Git Repository**, find your repository and click **Import**.
3. In the configuration screen:
   - **Project Name**: `hcm-lite` (or your preferred name).
   - **Framework Preset**: Select **Vite** (Vercel will automatically detect `vite build` and the `dist` output directory).
   - **Root Directory**: `./` (leave default).
4. Expand **Environment Variables** and enter the variables from **Section 4** (`MONGODB_URI`, `JWT_SECRET`, `INITIAL_ADMIN_EMAIL`).
5. Click **Deploy**.
6. Wait 60–90 seconds for the build to finish.
7. Once finished, click **Go to Dashboard** and note your live URL (e.g. `https://hcm-lite-xyz.vercel.app`).

---

## 8. Step-by-Step Testing & Verification

Once deployed, perform these verification checks in order:

### Test 1: Verify API Health Check
Open your browser or terminal and visit:
```bash
curl -s https://<your-vercel-domain>.vercel.app/api/v1/health
```
**Expected Response (HTTP 200)**:
```json
{
  "status": "ok",
  "database": {
    "isConnected": true,
    "mode": "atlas",
    "status": "connected",
    "host": "cluster0-shard-00-00.xyz.mongodb.net",
    "name": "hcm_lite"
  },
  "system": {
    "isInitialized": false,
    "superAdminExists": false,
    "initialAdminEmail": "asadqadri239@gmail.com"
  }
}
```

### Test 2: First-Run Super Admin Setup
1. In your browser, open `https://<your-vercel-domain>.vercel.app/`.
2. Because the database is clean, the application will display the **Phase 1 · One-Time Super Admin Bootstrap** screen.
3. Verify that the authorized email is prefilled as `asadqadri239@gmail.com`.
4. Fill in:
   - **Company Name**: `Saylani Global Enterprises`
   - **Company Code**: `SGE`
   - **Admin Name**: `Asad Qadri`
   - **Admin Password**: Enter a secure password (at least 8 characters, e.g. `Admin@2026Secure`).
   - **Confirm Password**: Re-enter the exact same password.
5. Click **Initialize System & Activate Super Admin**.
6. **Result**: The backend hashes your password with `bcryptjs`, saves your company and Super Admin user in MongoDB Atlas, issues a signed JWT token, and logs you directly into the Admin Dashboard!

### Test 3: Sign Out and Test Regular Login
1. In the header bar, click the **Sign Out** icon.
2. The login page will appear.
3. Enter `asadqadri239@gmail.com` and your password.
4. Click **Sign In**.
5. **Result**: Successfully logs in with status 200, restores your session, and displays the Admin Dashboard.

### Test 4: Verify Admin Bootstrap Is Permanently Locked
Attempt to call the bootstrap endpoint again via terminal or Postman:
```bash
curl -i -X POST https://<your-vercel-domain>.vercel.app/api/v1/setup/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Hacker Corp","companyCode":"HC","email":"asadqadri239@gmail.com","password":"Password123"}'
```
**Expected Response (HTTP 403 Forbidden)**:
```json
{
  "error": "Forbidden: Super Admin has already been bootstrapped. Public admin creation is permanently disabled."
}
```

---

## 9. Common Deployment Errors and Solutions

| Symptom / Error | Root Cause | Exact Solution |
| :--- | :--- | :--- |
| **`404 Not Found` on API calls** | Missing `/api/index.ts` or missing `/api/(.*)` rewrite in `vercel.json`. | Ensure `vercel.json` contains `{"source": "/api/(.*)", "destination": "/api/index"}` and `api/index.ts` is present in the repository root. |
| **`405 Method Not Allowed` on POST** | API requests are accidentally being redirected to static `index.html`. | Verify the SPA rewrite in `vercel.json` uses `/((?!api/).*)` so that requests to `/api/*` are never rewritten to static HTML. |
| **`Could not connect to any servers in your MongoDB Atlas cluster`** | IP Whitelist restriction in MongoDB Atlas. | In Atlas, go to **Network Access > Add IP Address > Allow Access from Anywhere (`0.0.0.0/0`)**. Save and wait 30 seconds. |
| **`Authentication failed (bad auth)`** | Username or password inside `MONGODB_URI` is wrong, or special characters were not URL-encoded. | Verify user in **Database Access** in Atlas. If password has `@`, `#`, or `/`, URL-encode them or change password to alphanumeric characters. |
| **`MONGODB_URI must be set in production`** | Environment variable is missing in Vercel settings. | In Vercel, open **Settings > Environment Variables**, add `MONGODB_URI`, and **Redeploy** the latest deployment. |
| **Page refresh returns 404** | Client-side routing lacks SPA rewrite. | The `vercel.json` file now contains `{ "source": "/((?!api/).*)", "destination": "/index.html" }`, which solves this for all subpaths. |

---

## 10. Deployment Files and Configuration Requirements

To maintain a clean and reliable codebase, here is the exact purpose and requirement of each configuration file:

### Final Repository Structure
```
├── .env.example                     # [Required] Template showing required env vars
├── .gitignore                        # [Required] Excludes node_modules, .env, and .vercel
├── DEPLOYMENT_GUIDE.md               # [Required] This master guide and completion report
├── api/
│   └── index.ts                      # [Required] Vercel Serverless Function entrypoint
├── vercel.json                       # [Required] Vercel routing, rewrites, and CORS headers
├── package.json                      # [Required] Build scripts and dependencies
├── vite.config.ts                    # [Required] Frontend bundler configuration
├── server.ts                         # [Required] Local dev & container entrypoint
├── server/
│   ├── scripts/
│   │   ├── initialize-database.ts    # [Utility] Optional CLI script to build MongoDB indexes
│   │   └── bootstrap-admin.ts        # [Utility] Optional CLI script to seed initial admin
│   └── src/
│       ├── config/
│       │   ├── database.ts           # [Required] Mongoose connection pool & status
│       │   └── env.ts                # [Required] Environment validation & sanitization
│       ├── middleware/
│       │   └── auth.ts               # [Required] JWT validation & RBAC guards
│       ├── models/
│       │   └── index.ts              # [Required] Mongoose schemas & indexes
│       ├── routes/
│       │   └── api.routes.ts         # [Required] REST API endpoints
│       └── services/
│           ├── db.service.ts         # [Required] Database query service
│           └── ai.service.ts         # [Required] Gemini AI service with circuit breaker
└── src/                              # [Required] React frontend application
```

### File Details & Configuration

#### 1. `vercel.json` (Required)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/api", "destination": "/api/index" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ]
}
```

#### 2. `api/index.ts` (Required)
Serves as the serverless bridge between Vercel and the Express API. It reuses the Mongoose connection pool, supports all API path prefixes (`/api/v1`, `/v1`, `/api`), handles preflight `OPTIONS` requests, and returns JSON 404s for unknown routes.

#### 3. `server.ts` (Required for Local Dev)
Maintains local development parity via `npm run dev` (`tsx server.ts`), mounting Vite's development middleware while serving the same Express `/api/v1` backend.

#### 4. `server/src/config/database.ts` (Required)
Manages MongoDB Atlas connectivity using a single connection pool (`minPoolSize: 1`, `maxPoolSize: 10`). Reuses `mongoose.connection.readyState === 1` across warm serverless invocations and prevents silent in-memory fallback in production.

#### 5. `server/src/config/env.ts` (Required)
Sanitizes environment variables, enforces `INITIAL_ADMIN_EMAIL`, and validates `MONGODB_URI` and `JWT_SECRET` in production mode.

---

## 11. Final Hackathon Submission Checklist

Before submitting your project to the Saylani Hackathon judges, verify every item:

- [ ] **GitHub Repository**: Code committed and pushed to GitHub main branch.
- [ ] **No Secrets in Git**: Confirmed `.env` and `.env.local` are in `.gitignore` and not pushed to GitHub.
- [ ] **MongoDB Atlas IP Access**: Network Access is set to `0.0.0.0/0` (Allow Access from Anywhere).
- [ ] **Vercel Environment Variables**: `MONGODB_URI`, `JWT_SECRET`, and `INITIAL_ADMIN_EMAIL` configured in Vercel.
- [ ] **Super Admin Setup**: Completed initial bootstrap using `asadqadri239@gmail.com`.
- [ ] **Login Tested**: Logged in as Admin and verified the Admin Dashboard loads metrics.
- [ ] **Health Endpoint Responding**: `GET /api/v1/health` returns `status: "ok"` and `isConnected: true`.
- [ ] **AI Assistant Animated Orb**: The futuristic green AI orb floats in the header and opens the AI Assistant drawer.
- [ ] **No 404/405 Errors**: Verified that all API calls return standard JSON responses.

---

# Completion Report

### A. Changes Made

1. **Created `/api/index.ts`**:
   - Implemented standard Vercel serverless function entry point for the Express backend.
   - Added database connection pooling middleware executed on each serverless invocation.
   - Configured route handlers for `/api/v1`, `/v1`, and `/api` to prevent path-stripping 404s.
   - Added preflight CORS response handler to eliminate 405 Method Not Allowed errors.
   - Added fallback JSON 404 handler for unknown API routes.

2. **Created `vercel.json`**:
   - Configured framework as `vite`, build command as `vite build`, and output directory as `dist`.
   - Set up exact serverless rewrites routing `/api/(.*)` to `/api/index` while safely routing non-API paths `/((?!api/).*)` to `/index.html`.
   - Added global CORS headers for all `/api/(.*)` endpoints.

3. **Modified `server/src/config/database.ts`**:
   - Added `mongoose.connection.readyState === 1` check to reuse active connection pools across serverless invocations.
   - Reset `connectionPromise = null` on connection failure so subsequent requests can retry rather than staying blocked on a rejected promise.
   - Enhanced error reporting to explicitly remind developers to whitelist `0.0.0.0/0` in MongoDB Atlas Network Access.

4. **Modified `server/src/services/db.service.ts`**:
   - Updated `isAtlas()` to enforce active MongoDB connection when running in Atlas mode, throwing clear diagnostic errors if Atlas is disconnected rather than silently corrupting data into temporary memory arrays.

5. **Modified `server/src/routes/api.routes.ts`**:
   - Added defensive `try...catch` handling to `/health` and `/setup/status` so database connectivity diagnoses can be viewed even during network dropouts without triggering unhandled exceptions.

6. **Modified `server.ts`**:
   - Synchronized CORS preflight options and API 404 JSON response handlers with the serverless configuration.
   - Added `/api/health` and `/health` route aliases.

7. **Modified `server/src/config/env.ts`**:
   - Added string trimming for all environment variables.
   - Added production validation checking that `MONGODB_URI` and `JWT_SECRET` are present when `NODE_ENV === 'production'`.
   - Exported `isProduction` boolean helper.

8. **Modified `server/scripts/initialize-database.ts`**:
   - Corrected typo where `mongoose` was imported from `dotenv`.

9. **Modified `package.json`**:
   - Added convenience scripts `"db:init"` and `"db:bootstrap"`.

10. **Modified `.gitignore`**:
    - Added `.vercel/` build cache directory to prevent local deployment artifacts from being committed.

11. **Modified `.env.example`**:
    - Added `NODE_ENV` variable explanation and clean comments for all required variables.

12. **Created `DEPLOYMENT_GUIDE.md`**:
    - Complete, beginner-friendly deployment instructions, architecture specification, troubleshooting, and completion report.

---

### B. Tests and Results

| Command / Test Executed | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| `npm run lint` (`tsc --noEmit`) | 0 TypeScript errors | Linting completed successfully with 0 errors | **PASSED** |
| `npm run build` (`vite build`) | Successful client build in `/dist` | Built `dist/index.html` and chunks in 496ms | **PASSED** |
| `GET http://localhost:3000/api/v1/health` | HTTP 200 with JSON database & system status | HTTP 200 OK, returned system and database status JSON | **PASSED** |
| `GET http://localhost:3000/api/health` | Redirects to `/api/v1/health` with HTTP 200 | HTTP 200 OK | **PASSED** |
| `GET http://localhost:3000/health` | Redirects to `/api/v1/health` with HTTP 200 | HTTP 200 OK | **PASSED** |
| `OPTIONS http://localhost:3000/api/v1/auth/login` | HTTP 204 with CORS preflight headers | HTTP 204 No Content with `Access-Control-Allow-Origin: *` | **PASSED** |
| `GET http://localhost:3000/api/v1/setup/status` | HTTP 200 with setup initialization status | HTTP 200 OK with `isInitialized`, `superAdminExists` | **PASSED** |
| `POST http://localhost:3000/api/v1/setup/bootstrap-admin` | HTTP 201 Created with JWT token and company data | HTTP 201 Created, returned JWT token & company object | **PASSED** |
| `POST http://localhost:3000/api/v1/setup/bootstrap-admin` (Repeat) | HTTP 403 Forbidden (prevent multiple admins) | HTTP 403 Forbidden (`Super Admin already bootstrapped`) | **PASSED** |
| `POST http://localhost:3000/api/v1/auth/login` (Valid) | HTTP 200 OK with signed JWT token | HTTP 200 OK with JWT token and user profile | **PASSED** |
| `POST http://localhost:3000/api/v1/auth/login` (Invalid) | HTTP 401 Unauthorized | HTTP 401 Unauthorized (`Invalid email or password.`) | **PASSED** |
| `GET http://localhost:3000/api/v1/auth/me` (Bearer JWT) | HTTP 200 OK with authenticated user session | HTTP 200 OK with user role `'admin'` and company info | **PASSED** |
| `GET http://localhost:3000/api/unknown-endpoint` | HTTP 404 JSON error instead of HTML fallback | HTTP 404 `{"error":"API route not found"}` | **PASSED** |

*Note: Live Vercel production deployment and live Atlas connection from external cloud IPs require your private MongoDB Atlas cluster credentials and Vercel account, which cannot be executed automatically without your personal login credentials.*

---

### C. Deployment Requirements

1. **Environment Variables**:
   - `MONGODB_URI`: Valid MongoDB connection string targeting database `hcm_lite`.
   - `JWT_SECRET`: Random secret string (32+ chars).
   - `INITIAL_ADMIN_EMAIL`: `asadqadri239@gmail.com`.
2. **MongoDB Atlas Whitelist**:
   - Network Access entry `0.0.0.0/0` must be active in your Atlas project.
3. **Vercel Settings**:
   - Framework Preset: `Vite`.
   - Build Command: `vite build` (or leave default).
   - Output Directory: `dist` (or leave default).

---

### D. Your Remaining Tasks (Numbered Checklist)

1. [ ] Log in to **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** and create your free M0 cluster.
2. [ ] In Atlas **Database Access**, create a user (e.g. `hcm_admin`) and save the password.
3. [ ] In Atlas **Network Access**, add IP `0.0.0.0/0` to allow connections from Vercel's serverless servers.
4. [ ] Copy your connection string and insert your password and database name `/hcm_lite`.
5. [ ] Open **GitHub Desktop**, commit all changes, and push to your GitHub repository.
6. [ ] In **Vercel**, import your GitHub repository.
7. [ ] In the Vercel project settings, add the `MONGODB_URI`, `JWT_SECRET`, and `INITIAL_ADMIN_EMAIL` environment variables.
8. [ ] Click **Deploy** (or **Redeploy**).
9. [ ] Open your live Vercel URL, complete the one-time Super Admin bootstrap screen, and log in!

---

### E. Final Deployment Verification URLs

Once deployed to `https://<your-app-name>.vercel.app`:

* **Health Diagnostics Endpoint**:
  - URL: `https://<your-app-name>.vercel.app/api/v1/health`
  - Expected: HTTP 200 JSON with `status: "ok"`, `database.isConnected: true`, and `database.mode: "atlas"`.
* **Setup Status Endpoint**:
  - URL: `https://<your-app-name>.vercel.app/api/v1/setup/status`
  - Expected: HTTP 200 JSON with `isInitialized: true` (after bootstrap).
* **Super Admin Login Endpoint**:
  - URL: `https://<your-app-name>.vercel.app/api/v1/auth/login`
  - Method: `POST` with `{"email": "asadqadri239@gmail.com", "password": "YourPassword"}`
  - Expected: HTTP 200 JSON with signed JWT token and user profile object.
