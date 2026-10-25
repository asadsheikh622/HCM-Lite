import { IUser, ICompany, IDepartment, IDesignation, ILeaveType, IHoliday, IEmployee, IAttendance, IAttendanceCorrection, ILeaveRequest, IPayrollRun, IPayslip, IAnnouncement, INotification, IAuditLog } from '../types/client';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('hcm_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('hcm_token', token);
    } else {
      localStorage.removeItem('hcm_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private cache = new Map<string, { data: any; expiresAt: number }>();
  private inFlight = new Map<string, Promise<any>>();

  clearCache() {
    this.cache.clear();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const cacheKey = `${endpoint}::${this.token || 'anon'}`;

    // Read from cache for GET requests if valid
    if (isGet) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }

      // Deduplicate in-flight concurrent requests to the same endpoint
      if (this.inFlight.has(cacheKey)) {
        return this.inFlight.get(cacheKey) as Promise<T>;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const executeRequest = async (): Promise<T> => {
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errorMsg = data.error || `Request failed with status ${res.status}`;
          const err = new Error(errorMsg) as any;
          err.status = res.status;
          err.code = data.code;
          throw err;
        }

        // Cache successful GET requests for 10 seconds (for analytics and status)
        if (isGet && (endpoint.startsWith('/analytics') || endpoint.startsWith('/setup/status') || endpoint.startsWith('/auth/me'))) {
          this.cache.set(cacheKey, { data, expiresAt: Date.now() + 10_000 });
        } else if (!isGet) {
          // Clear analytics cache on any state mutation
          this.cache.clear();
        }

        return data as T;
      } finally {
        if (isGet) {
          this.inFlight.delete(cacheKey);
        }
      }
    };

    if (isGet) {
      const reqPromise = executeRequest();
      this.inFlight.set(cacheKey, reqPromise);
      return reqPromise;
    }

    return executeRequest();
  }

  // Health & Setup
  getHealth() {
    return this.request<{ status: string; database: any; system: any }>('/health');
  }

  getSetupStatus() {
    return this.request<{ isInitialized: boolean; superAdminExists: boolean; authorizedBootstrapEmail: string }>('/setup/status');
  }

  bootstrapAdmin(payload: { companyName: string; companyCode: string; email: string; password: string; adminName?: string }) {
    return this.request<{ message: string; token: string; user: IUser; company: ICompany }>('/setup/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Auth
  login(credentials: { email: string; password: string }) {
    return this.request<{ token: string; user: IUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  changePassword(passwords: { oldPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    });
  }

  getMe() {
    return this.request<{ user: IUser; company: ICompany; employeeProfile?: IEmployee }>('/auth/me');
  }

  logout() {
    return this.request<{ message: string }>('/auth/logout', { method: 'POST' });
  }

  // Company & Org
  getCompany() {
    return this.request<{ company: ICompany }>('/company');
  }

  updateCompany(updates: Partial<ICompany>) {
    return this.request<{ message: string; company: ICompany }>('/company', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  getDepartments() {
    return this.request<{ departments: IDepartment[] }>('/departments');
  }

  createDepartment(data: { name: string; code: string; description?: string }) {
    return this.request<{ department: IDepartment }>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getDesignations(deptId?: string) {
    const query = deptId ? `?departmentId=${deptId}` : '';
    return this.request<{ designations: IDesignation[] }>(`/designations${query}`);
  }

  createDesignation(data: { departmentId: string; name: string; grade?: string }) {
    return this.request<{ designation: IDesignation }>('/designations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getLeaveTypes() {
    return this.request<{ leaveTypes: ILeaveType[] }>('/leave-types');
  }

  createLeaveType(data: any) {
    return this.request<{ leaveType: ILeaveType }>('/leave-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getHolidays() {
    return this.request<{ holidays: IHoliday[] }>('/holidays');
  }

  createHoliday(data: { name: string; date: string; isRecurringYearly?: boolean }) {
    return this.request<{ holiday: IHoliday }>('/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  createHRAccount(data: { name: string; email: string; password: string }) {
    return this.request<{ message: string; user: any }>('/organization/create-hr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Employees
  getEmployees(params?: { departmentId?: string; search?: string; status?: string }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ employees: IEmployee[] }>(`/employees${q ? `?${q}` : ''}`);
  }

  getEmployee360(id: string) {
    return this.request<{ employee: IEmployee; attendances: IAttendance[]; leaves: ILeaveRequest[]; payslips: IPayslip[] }>(`/employees/${id}`);
  }

  registerEmployee(data: any) {
    return this.request<{ message: string; employee: IEmployee; loginEmail: string; temporaryPasswordNote: string }>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  importDryRun(rows: any[]) {
    return this.request<{ totalRows: number; validRows: number; invalidRows: any[]; canCommit: boolean }>('/employees/import/dry-run', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  }

  // Attendance
  checkIn(payload?: { lat?: number; lng?: number; faceVerified?: boolean; distanceMeters?: number; notes?: string; employeeId?: string }) {
    return this.request<{ message: string; attendance: IAttendance }>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  checkOut(payload?: { employeeId?: string }) {
    return this.request<{ message: string; attendance: IAttendance }>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  getTodayAttendance() {
    return this.request<{ date: string; attendances: IAttendance[] }>('/attendance/today');
  }

  getMyAttendance() {
    return this.request<{ attendances: IAttendance[] }>('/attendance/my');
  }

  getAllAttendance(params?: { date?: string; month?: string; employeeId?: string }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ attendances: IAttendance[] }>(`/attendance/all${q ? `?${q}` : ''}`);
  }

  submitCorrection(data: { attendanceDate: string; requestedCheckIn: string; requestedCheckOut: string; reason: string; employeeId?: string }) {
    return this.request<{ message: string; correction: IAttendanceCorrection }>('/attendance/corrections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getCorrections() {
    return this.request<{ corrections: IAttendanceCorrection[] }>('/attendance/corrections');
  }

  reviewCorrection(id: string, status: 'approved' | 'rejected', reviewComment?: string) {
    return this.request<{ message: string; correction: IAttendanceCorrection }>(`/attendance/corrections/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewComment }),
    });
  }

  // Leave
  applyLeave(data: { leaveTypeId: string; startDate: string; endDate: string; reason: string; employeeId?: string }) {
    return this.request<{ message: string; leaveRequest: ILeaveRequest }>('/leave/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getMyLeave() {
    return this.request<{ leaves: ILeaveRequest[]; balances: any[] }>('/leave/my');
  }

  getAllLeave() {
    return this.request<{ leaves: ILeaveRequest[] }>('/leave/all');
  }

  cancelLeave(id: string) {
    return this.request<{ message: string; leaveRequest: ILeaveRequest }>(`/leave/${id}/cancel`, {
      method: 'POST',
    });
  }

  reviewLeave(id: string, status: 'approved' | 'rejected', reviewComment?: string) {
    return this.request<{ message: string; leaveRequest: ILeaveRequest }>(`/leave/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewComment }),
    });
  }

  // Payroll
  getPayrollRuns() {
    return this.request<{ runs: IPayrollRun[] }>('/payroll/runs');
  }

  generatePayrollDraft(month: string) {
    return this.request<{ message: string; payrollRun: IPayrollRun; payslipsCount: number }>('/payroll/generate-draft', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  }

  finalizePayroll(id: string) {
    return this.request<{ message: string; payrollRun: IPayrollRun }>(`/payroll/runs/${id}/finalize`, {
      method: 'POST',
    });
  }

  getRunPayslips(month: string) {
    return this.request<{ payslips: IPayslip[] }>(`/payroll/runs/${month}/payslips`);
  }

  getMyPayslips() {
    return this.request<{ payslips: IPayslip[] }>('/payroll/my-payslips');
  }

  // Dashboards
  getAdminAnalytics() {
    return this.request<{ kpis: any; deptBreakdown: any[]; recentAuditLogs: IAuditLog[]; payrollRuns: IPayrollRun[]; aiSummary: string[] }>('/analytics/admin');
  }

  getHRAnalytics() {
    return this.request<{ kpis: any; topLateComers: any[]; aiSummary: string[] }>('/analytics/hr');
  }

  getEmployeeAnalytics() {
    return this.request<{ todayAttendance: IAttendance | null; hoursThisWeek: number; lateCountMonth: number; leaveBalances: any[]; lastPayslip: IPayslip | null; announcements: IAnnouncement[] }>('/analytics/employee');
  }

  getAISummary(kpis: any, forceRefresh = false) {
    return this.request<{ summary: string[] }>('/analytics/ai-summary', {
      method: 'POST',
      body: JSON.stringify({ kpis, forceRefresh }),
    });
  }

  // AI Assistant
  askAI(prompt: string) {
    return this.request<{ text: string; toolsUsed: string[] }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  parseSmartLeave(text: string) {
    return this.request<{ leaveTypeId?: string; startDate?: string; endDate?: string; reason?: string; confidence: number }>('/ai/parse-leave', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Communications & Audit
  getAnnouncements() {
    return this.request<{ announcements: IAnnouncement[] }>('/announcements');
  }

  createAnnouncement(data: { title: string; content: string; priority?: string }) {
    return this.request<{ announcement: IAnnouncement }>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getNotifications() {
    return this.request<{ notifications: INotification[] }>('/notifications');
  }

  markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  getAuditLogs() {
    return this.request<{ logs: IAuditLog[] }>('/audit');
  }

  // Optional Demo Seed
  seedDemo() {
    return this.request<{ success: boolean; message: string }>('/demo/seed', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
