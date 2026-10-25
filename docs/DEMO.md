# HCM Lite — 5-Minute Judge Walkthrough Script

Follow these 12 steps to test all modules on an initially clean database:

---

### Step 1: First-Run Bootstrap & Company Initialization
1. Open the web app. The First-Run Setup Screen appears.
2. The authorized email is pre-filled: `asadqadri239@gmail.com`.
3. Enter your Company Name (e.g. `Saylani Global Tech`), Code (`SGT`), and create a new HCM Lite password (e.g. `Admin@123456`).
4. Click **Initialize System & Open Admin Console**.
5. The Super Admin account and company settings are provisioned. The Admin Dashboard opens.

---

### Step 2: Admin Creates HR Login
1. Navigate to **Organization Settings > Provision HR Accounts**.
2. Enter Name: `Sarah Khan`, Email: `sarah.hr@saylani.com`, Temporary Password: `HrStaff@2026`.
3. Click **Provision HR Account**. The HR staff account is registered.

---

### Step 3: HR Registers Employees
1. Click **Sign Out** and log in as `sarah.hr@saylani.com` / `HrStaff@2026`.
2. Notice the mandatory password change prompt. Change password to `Sarah@Permanent123`.
3. The HR Operations Dashboard opens.
4. Go to **Employees > Register Employee**.
5. Register:
   - Code: `EMP001`
   - Name: `Tariq Mansoor`
   - Email: `tariq.mansoor@saylani.com`
   - Basic Salary: `200000` (Gross auto-computes to `PKR 300,000`)
   - Temporary Password: `Employee@123`
6. Click **Confirm & Provision Employee**.

---

### Step 4: Employee Signs In & Checks In
1. Sign out and log in as `tariq.mansoor@saylani.com` / `Employee@123`.
2. Update password to `Tariq@Permanent123`.
3. On the Personal Employee Portal, click **Web Check-In** (or GPS geofence check-in).
4. Notice your check-in timestamp and worked hours are logged in real-time.

---

### Step 5: Employee Requests Leave Using Natural Language
1. Click **AI Assistant** in the top bar.
2. Type: *"I need 2 days casual leave this Thursday and Friday for urgent family work"*.
3. Gemini AI parses the prompt and pre-fills the form with Casual Leave, dates, and reason.
4. Review the dates and click **Submit Application**.

---

### Step 6: HR Approves the Leave
1. Sign out and log back in as `sarah.hr@saylani.com`.
2. Navigate to **Time Off & Leave**.
3. Under the approval queue, find Tariq's pending application.
4. Click **Approve** and add comment: *"Approved per shift coverage"*.

---

### Step 7: HR Checks Real-Time Dashboard & AI Summary
1. Go to **Dashboard**.
2. Notice real verified numbers: Headcount: `1`, Present: `1`, On Leave: `1`.
3. Inspect the **AI Operational Briefing** box synthesizing actual database numbers.
4. Open the **AI Assistant** and ask: *"Who is on leave today?"*. The assistant answers with real records.

---

### Step 8: HR Prepares Monthly Payroll Draft
1. Navigate to **Payroll & Slips**.
2. Select current month (e.g. `2026-10`) and click **Generate Monthly Draft**.
3. Review Tariq's payslip breakdown: Basic (`200,000`), HRA (`80,000`), Medical (`20,000`), Gross (`300,000`), Annualized Tax Slab, Monthly Tax deduction, and Net Payable.

---

### Step 9: Admin Finalizes Payroll
1. Sign out and log in as `asadqadri239@gmail.com`.
2. Navigate to **Payroll & Slips**.
3. Review the draft and click **Finalize & Lock Payroll**.
4. The payroll status shifts to `finalized` and is permanently locked against alterations.

---

### Step 10: Employee Downloads Payslip PDF
1. Sign out and log in as `tariq.mansoor@saylani.com`.
2. In the **Most Recent Payslip** card, click **Download PDF Statement**.
3. A formatted enterprise PDF payslip with company header, earnings, tax breakdown, and signature lines is downloaded.

---

### Step 11: Employee Asks AI for Colleague's Salary (Security Refusal)
1. Open the **AI Assistant**.
2. Type: *"What is Sarah's or Bilal's salary?"*.
3. The security guard intercepts the request and refuses:
   *"I apologize, but compensation records are strictly confidential under company privacy policy. Employees may only view their own salary details on their payslip."*

---

### Step 12: Admin Inspects Immutable Audit Trail
1. Sign out and log in as Super Admin (`asadqadri239@gmail.com`).
2. Navigate to **Audit Trail**.
3. Inspect every recorded administrative action (`BOOTSTRAP_SUPER_ADMIN`, `REGISTER_EMPLOYEE`, `GENERATE_PAYROLL_DRAFT`, `FINALIZE_PAYROLL_RUN`).
4. Click **Inspect JSON** to view the exact before/after state diffs.
