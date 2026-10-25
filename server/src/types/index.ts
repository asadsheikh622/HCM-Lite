export type UserRole = 'admin' | 'hr' | 'employee';

export interface IUser {
  _id: string;
  companyId: string;
  employeeId?: string; // If role is 'employee', link to Employee record
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ICompany {
  _id: string;
  name: string;
  code: string;
  industry: string;
  timezone: string;
  officeStartTime: string; // e.g. "09:00"
  graceMinutes: number; // e.g. 15
  weekendDays: number[]; // 0=Sun, 6=Sat (e.g. [0, 6])
  halfDayHoursThreshold: number; // e.g. 5
  officeCoordinates: {
    lat: number;
    lng: number;
    radiusMeters: number; // default 150
  };
  isInitialized: boolean;
  createdAt: string;
}

export interface IDepartment {
  _id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export interface IDesignation {
  _id: string;
  companyId: string;
  departmentId: string;
  name: string;
  grade?: string;
  createdAt: string;
}

export interface ILeaveType {
  _id: string;
  companyId: string;
  name: string;
  code: string; // 'ANNUAL', 'SICK', 'CASUAL', 'UNPAID'
  annualQuota: number; // 14, 8, 10, 0
  isPaid: boolean;
  description?: string;
}

export interface IHoliday {
  _id: string;
  companyId: string;
  name: string;
  date: string; // YYYY-MM-DD
  isRecurringYearly: boolean;
}

export type EmploymentStatus = 'Active' | 'Probationary' | 'Terminated';

export interface IEmployee {
  _id: string;
  companyId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  designationId: string;
  joiningDate: string; // YYYY-MM-DD
  employmentStatus: EmploymentStatus;
  // Salary structure
  basicSalary: number; // B
  hra: number; // 40% of B
  medicalAllowance: number; // 10% of B
  grossSalary: number; // 1.5 * B
  bankAccount?: string;
  emergencyContact?: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'missing_checkout';

export interface IAttendance {
  _id: string;
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
  status: AttendanceStatus;
  workedHours: number;
  isGeofenced?: boolean;
  distanceMeters?: number;
  faceVerified?: boolean;
  notes?: string;
  createdAt: string;
}

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface IAttendanceCorrection {
  _id: string;
  companyId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  requestedCheckIn: string; // ISO or HH:mm
  requestedCheckOut: string; // ISO or HH:mm
  reason: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ILeaveRequest {
  _id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
}

export interface IPayrollRun {
  _id: string;
  companyId: string;
  month: string; // YYYY-MM
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalDeductions: number;
  status: 'draft' | 'finalized';
  preparedBy: string;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
}

export interface IPayslip {
  _id: string;
  companyId: string;
  payrollRunId: string;
  employeeId: string;
  month: string; // YYYY-MM
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  unpaidLeaveDays: number;
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  perDayGross: number;
  absentDeduction: number;
  unpaidLeaveDeduction: number;
  halfDayDeduction: number;
  totalDeductions: number;
  taxableIncomeAnnual: number;
  annualTax: number;
  monthlyTax: number;
  netSalary: number;
  isFinalized: boolean;
  createdAt: string;
}

export interface IAnnouncement {
  _id: string;
  companyId: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  postedBy: string;
  postedByName: string;
  createdAt: string;
}

export interface INotification {
  _id: string;
  companyId: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: 'leave' | 'payroll' | 'attendance' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  companyId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
  timestamp: string;
}

export interface IAILog {
  _id: string;
  companyId: string;
  userId: string;
  userRole: UserRole;
  prompt: string;
  response: string;
  toolsUsed: string[];
  latencyMs: number;
  status: 'success' | 'error';
  timestamp: string;
}
