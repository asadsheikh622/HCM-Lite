# HCM Lite — Architecture Documentation

## 1. System Overview
HCM Lite is an AI-assisted enterprise Human Capital Management system architected with full-stack TypeScript, Express, Vite, and Mongoose for MongoDB Atlas.

### Monorepo Organization
```
hcm-lite/
├── client/ (src/)
│   ├── features/
│   │   ├── auth/           # Login & mandatory first-time password change
│   │   ├── setup/          # Secure one-time Super Admin bootstrap
│   │   ├── dashboard/      # Role-specific executive views (Admin, HR, Employee)
│   │   ├── employees/      # Directory, 360 profile, CSV dry-run import/export
│   │   ├── attendance/     # Web check-in/out, camera & GPS, shift corrections
│   │   ├── leave/          # Working-day leave calculations & smart NL leave
│   │   ├── payroll/        # Formula calculations, tax slabs, PDF generation
│   │   ├── organization/   # Rules, departments, designations, quotas, holidays
│   │   ├── audit/          # Immutable append-only audit trail
│   │   ├── ai/             # Gemini 3.8 Assistant drawer with 7 tool calls
│   │   └── database/       # Atlas connectivity health & diagnostic modal
│   ├── layouts/            # 3-zone top bar contract & responsive workspace
│   ├── services/           # Centralized typed REST client
│   └── lib/                # Client-side PDF payslip generator (jspdf)
├── server/
│   ├── src/
│   │   ├── config/         # Environment & database connection manager
│   │   ├── models/         # Mongoose schemas & indexes
│   │   ├── middleware/     # JWT authentication, role guards, employee scope
│   │   ├── routes/         # REST API routes under /api/v1
│   │   ├── services/       # DB service, Payroll calculator, Leave calculator, AI service
│   │   └── types/          # Shared enterprise TypeScript contracts
│   └── scripts/            # Bootstrap admin and initialize database scripts
├── docs/                   # ARCHITECTURE.md, API.md, SETUP.md, DEMO.md
├── server.ts               # Express entry point on port 3000 with Vite middleware
├── package.json
└── README.md
```

## 2. Security & Authorization Architecture
1. **Zero-Trust Role & Data-Scope Middleware (`auth.ts`)**:
   - `authenticateToken`: Validates JWT signed with `JWT_SECRET`. Checks `mustChangePassword` flag.
   - `requireRole(['admin'])`, `requireRole(['admin', 'hr'])`: Blocks unauthorized cross-role calls.
   - `enforceEmployeeScope`: If caller is an `employee`, forces `req.query.employeeId` and `req.body.employeeId` to match caller's authenticated ID. Never trusts browser-supplied IDs.

2. **One-Time Super Admin Bootstrap**:
   - Authorized bootstrap email: `asadqadri239@gmail.com`.
   - Once bootstrapped, the endpoint returns HTTP 403 and public admin creation is permanently locked.
   - User creates an independent HCM Lite password encrypted with bcrypt (10 salt rounds).

3. **Dual-Mode Resilient Database Engine (`database.ts` & `db.service.ts`)**:
   - Connects to MongoDB Atlas when `MONGODB_URI` is provided.
   - If Atlas credentials are not yet configured or connecting, transparently activates an in-memory repository store matching the same Mongoose model signatures, allowing instant judge evaluation.
   - Zero mock data on clean launch: database starts empty.

4. **AI Assistant Guardrails (`ai.service.ts`)**:
   - Implemented exclusively on the backend using `@google/genai` (model `gemini-3.8-flash`).
   - 7 Server-side tools: `get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`.
   - Confidentiality guardrail: If employee inquires about colleague's salary, the request is strictly intercepted and refused.
