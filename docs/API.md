# HCM Lite — REST API Specification (`/api/v1`)

All endpoints return JSON responses. Protected endpoints require `Authorization: Bearer <token>`.

## 1. System & Setup
- `GET /api/v1/health`: Returns database connectivity state (`atlas` or `memory`), host, database name `hcm_lite`, super admin bootstrap status.
- `GET /api/v1/setup/status`: Reports whether the company and first admin have been initialized.
- `POST /api/v1/setup/bootstrap-admin`: One-time bootstrap for email `asadqadri239@gmail.com`. Creates company, seeds default leave types, hashes password with bcrypt.

## 2. Authentication
- `POST /api/v1/auth/login`: Authenticates with email & password. Returns JWT token and user profile.
- `POST /api/v1/auth/change-password`: Updates password and clears `mustChangePassword` flag.
- `GET /api/v1/auth/me`: Returns profile of authenticated user.
- `POST /api/v1/auth/logout`: Invalidates session and logs audit event.

## 3. Organization Setup (Admin & HR)
- `GET /api/v1/company`: Retrieves company rules and operating hours.
- `PUT /api/v1/company`: Updates office start time, grace minutes, half-day threshold, geofence (Admin only).
- `GET /api/v1/departments`: Lists registered departments.
- `POST /api/v1/departments`: Creates new department.
- `GET /api/v1/designations`: Lists designations (optional `departmentId` filter).
- `POST /api/v1/designations`: Creates new designation.
- `GET /api/v1/leave-types`: Lists leave categories & annual quotas.
- `POST /api/v1/leave-types`: Adds custom leave type.
- `GET /api/v1/holidays`: Lists public holidays.
- `POST /api/v1/holidays`: Adds public holiday.
- `POST /api/v1/organization/create-hr`: Provisions HR staff login with temporary password (Admin only).

## 4. Employees
- `GET /api/v1/employees`: Search, filter by department and status (Admin/HR: all; Employee: self only).
- `GET /api/v1/employees/:id`: Employee 360 profile (overview, attendances, leaves, payslips).
- `POST /api/v1/employees`: Registers employee, calculates salary components, provisions login, sets `mustChangePassword: true`.
- `POST /api/v1/employees/import/dry-run`: Audits CSV batch rows without persisting. Returns valid and invalid rows with field names and error reasons.

## 5. Attendance
- `POST /api/v1/attendance/check-in`: Server-stamps check-in time. Evaluates late status (> 09:15). Rejects duplicate check-ins with HTTP 409.
- `POST /api/v1/attendance/check-out`: Server-stamps checkout time. Calculates worked hours. Flags half-day if < 5h.
- `GET /api/v1/attendance/today`: Daily company attendance board.
- `GET /api/v1/attendance/my`: Personal attendance history.
- `POST /api/v1/attendance/corrections`: Submits adjustment request with reason (Employee).
- `GET /api/v1/attendance/corrections`: Lists correction requests.
- `POST /api/v1/attendance/corrections/:id/review`: Approves or rejects correction. If approved, updates attendance and recalculates worked hours.

## 6. Leave Management
- `POST /api/v1/leave/apply`: Submits leave request. Excludes weekends & public holidays. Validates overlap (HTTP 422) and balance quota (HTTP 422).
- `GET /api/v1/leave/my`: Personal leave requests and remaining quota allowances.
- `GET /api/v1/leave/all`: Company leave requests (Admin/HR).
- `POST /api/v1/leave/:id/cancel`: Cancels pending request.
- `POST /api/v1/leave/:id/review`: Approves or rejects leave with comments. Dispatches in-app notification.

## 7. Payroll Lite
- `GET /api/v1/payroll/runs`: Lists monthly payroll runs.
- `POST /api/v1/payroll/generate-draft`: HR prepares monthly draft (computes gross, absent deductions, unpaid leave deductions, annual tax slabs, monthly tax, net payable).
- `GET /api/v1/payroll/runs/:month/payslips`: Lists payslips for selected month.
- `POST /api/v1/payroll/runs/:id/finalize`: Admin finalizes payroll run. Permanently locks records and notifies staff.
- `GET /api/v1/payroll/my-payslips`: Employee's personal payslip statements.

## 8. Analytics & Dashboards
- `GET /api/v1/analytics/admin`: Headcount, attrition, payroll cost, average salary, department breakdowns, AI executive summary.
- `GET /api/v1/analytics/hr`: Present today, late today, on leave today, pending approvals, top late-comers ranking.
- `GET /api/v1/analytics/employee`: Check-in state, weekly hours vs 40h, late count, leave balances, last payslip.

## 9. AI Assistant (Gemini 3.8 Flash)
- `POST /api/v1/ai/chat`: Interactive chat with 7 tool calls and role-based data isolation.
- `POST /api/v1/ai/parse-leave`: Parses natural language prompt into structured leave format.
- `GET /api/v1/ai/logs`: AI request logs with latency and tool execution records.

## 10. Audit Trail
- `GET /api/v1/audit`: Immutable append-only audit trail with before/after state diffs (Admin only).
