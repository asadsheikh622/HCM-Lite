# HCM Lite — AI-Assisted Enterprise HR System

> **Official Saylani Hackathon Challenge Project**  
> Build an AI-Assisted HR System for Admin, HR, and Employees with verified database records, strict role-based access control (RBAC), automated statutory payroll formulas, and Gemini 3.8 tool calling.

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript (`server.ts` on port 3000)
- **Database**: MongoDB Atlas + Mongoose (with embedded in-memory resilience for immediate local/preview evaluation)
- **Authentication**: JWT, bcrypt password hashing, role & data-scope guards
- **AI Engine**: Server-side `@google/genai` (Gemini 3.8 Flash) with 7 restricted tool calling functions
- **Document Generation**: Client & Server PDF payslip generator (`jspdf`)
- **Bulk Tools**: CSV employee import with live dry-run validation

---

## 2. Authorized First Super Admin Setup

The initial Super Admin bootstrap is restricted to:
- **Authorized Email**: `asadqadri239@gmail.com`

On first launch, HCM Lite detects an uninitialized database and displays the **First-Run Setup Screen**. The authorized email is pre-configured. The administrator establishes an independent HCM Lite password (minimum 8 characters).

*Privacy Notice*: Your Google account password is never requested, accessed, or stored. Passwords are saved as encrypted bcrypt hashes. After the first Super Admin is provisioned, public registration is permanently disabled.

---

## 3. Quick Start on Local Windows (PowerShell)

### Step 1: Open PowerShell in the project directory
```powershell
Get-ChildItem
```

### Step 2: Setup environment configuration
```powershell
Copy-Item .env.example .env
notepad .env
```

Ensure your `.env` contains:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/hcm_lite?retryWrites=true&w=majority"
GEMINI_API_KEY="AIzaSy..."
JWT_SECRET="hcm_lite_jwt_super_secret_key_2026_hackathon_secure"
PORT=3000
INITIAL_ADMIN_EMAIL="asadqadri239@gmail.com"
```

### Step 3: Install dependencies
```powershell
npm install
```

### Step 4: Start development server
```powershell
npm run dev
```

Visit in your browser:
👉 **`http://localhost:3000`**

---

## 4. Google AI Studio Secrets vs Local Environment

| Variable | Local Windows (`.env`) | Google AI Studio Environment |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Set in `.env` | Configured in **Settings > Secrets** panel |
| `MONGODB_URI` | Set in `.env` | Configured in Secrets panel or runs in resilient in-memory mode |
| `JWT_SECRET` | Set in `.env` | Automatically initialized |
| `INITIAL_ADMIN_EMAIL` | Set in `.env` | Defaults to `asadqadri239@gmail.com` |

---

## 5. Modules Implemented (M1 to M9)

| Module | Feature Set |
| :--- | :--- |
| **M1: Auth & Access** | Login, logout, change password, JWT, bcrypt, Admin/HR/Employee RBAC, first-login mandatory password change |
| **M2: Organization** | Company profile, office hours (09:00), grace period (15m), geofence radius, departments, designations, quotas, holidays, HR accounts |
| **M3: Employees** | Registration with auto salary calculation, Employee 360 profile, CSV export, CSV import with dry-run validator |
| **M4: Attendance** | Web check-in/out, duplicate 409 guard, late status (>09:15), half-day (<5h), shift corrections workflow, camera & GPS attendance |
| **M5: Leave** | Quotas, working-day calculation (excluding weekends & holidays), overlap & balance validation (HTTP 422), HR approval |
| **M6: Payroll Lite** | Gross formula ($1.5 \times B$), absent & half-day deductions, 5 annualized tax slabs, draft preparation, Admin finalization lock, PDF payslips |
| **M7: Dashboards** | Headcount, attrition, payroll cost, average salary, dept breakdown, attendance board, late arrivals, AI summary |
| **M8: AI Assistant** | Gemini 3.8 with 7 tool calls, role guardrails (refuses colleague salaries), natural language Smart Leave parser, policy Q&A |
| **M9: Communications** | Company announcements, in-app notifications, append-only immutable audit trail with before/after state diffs |

---

## 6. Testing & Build Verification

To verify TypeScript types and build for production:

```powershell
# Type check and lint
npm run lint

# Production build
npm run build

# Start production server
npm run start
```

---

## 7. Five-Minute Judge Walkthrough

Refer to [`docs/DEMO.md`](docs/DEMO.md) for the complete 12-step script verifying:
1. First-run bootstrap
2. HR creation
3. Employee registration
4. Employee sign-in & password change
5. Web check-in
6. Natural language Smart Leave application
7. HR leave approval
8. Real-time dashboard KPI verification
9. Monthly payroll draft computation
10. Admin finalization lock
11. Printable PDF payslip download
12. Security guardrail & immutable audit trail
