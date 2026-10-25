export type UserRole = 'admin' | 'hr' | 'employee';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  mustChangePassword?: boolean;
  companyId: string;
}

export interface ICompany {
  _id: string;
  name: string;
  code: string;
  industry: string;
  timezone: string;
  officeStartTime: string;
  graceMinutes: number;
  weekendDays: number[];
  halfDayHoursThreshold: number;
  officeCoordinates: {
    lat: number;
    lng: number;
    radiusMeters: number;
  };
  isInitialized: boolean;
}

export interface IDepartment {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

export interface IDesignation {
  _id: string;
  departmentId: string;
  name: string;
  grade?: string;
}

export interface ILeaveType {
  _id: string;
  name: string;
  code: string;
  annualQuota: number;
  isPaid: boolean;
  description?: string;
}

export interface IHoliday {
  _id: string;
  name: string;
  date: string;
  isRecurringYearly: boolean;
}

export interface IEmployee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  designationId: string;
  joiningDate: string;
  employmentStatus: 'Active' | 'Probationary' | 'Terminated';
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  bankAccount?: string;
  emergencyContact?: string;
}

export interface IAttendance {
  _id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'missing_checkout';
  workedHours: number;
  isGeofenced?: boolean;
  distanceMeters?: number;
  faceVerified?: boolean;
  notes?: string;
}

export interface IAttendanceCorrection {
  _id: string;
  employeeId: string;
  attendanceDate: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export interface ILeaveRequest {
  _id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
}

export interface IPayrollRun {
  _id: string;
  month: string;
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
  payrollRunId: string;
  employeeId: string;
  month: string;
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
}

export interface IAnnouncement {
  _id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  postedBy: string;
  postedByName: string;
  createdAt: string;
}

export interface INotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  timestamp: string;
}
