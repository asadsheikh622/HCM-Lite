import mongoose, { Schema, Document } from 'mongoose';
import {
  IUser,
  ICompany,
  IDepartment,
  IDesignation,
  ILeaveType,
  IHoliday,
  IEmployee,
  IAttendance,
  IAttendanceCorrection,
  ILeaveRequest,
  IPayrollRun,
  IPayslip,
  IAnnouncement,
  INotification,
  IAuditLog,
  IAILog
} from '../types';

// Company Schema
const CompanySchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  industry: { type: String, default: 'General' },
  timezone: { type: String, default: 'Asia/Karachi' },
  officeStartTime: { type: String, default: '09:00' },
  graceMinutes: { type: Number, default: 15 },
  weekendDays: { type: [Number], default: [0, 6] }, // Sunday (0), Saturday (6)
  halfDayHoursThreshold: { type: Number, default: 5 },
  officeCoordinates: {
    lat: { type: Number, default: 24.8607 },
    lng: { type: Number, default: 67.0011 },
    radiusMeters: { type: Number, default: 150 },
  },
  isInitialized: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// User Schema
const UserSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  employeeId: { type: String, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'hr', 'employee'], required: true },
  mustChangePassword: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
UserSchema.index({ companyId: 1, email: 1 }, { unique: true });

// Department Schema
const DepartmentSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});
DepartmentSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Designation Schema
const DesignationSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  departmentId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  grade: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// LeaveType Schema
const LeaveTypeSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  annualQuota: { type: Number, required: true, default: 0 },
  isPaid: { type: Boolean, default: true },
  description: { type: String },
});
LeaveTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });

// Holiday Schema
const HolidaySchema = new Schema({
  companyId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  isRecurringYearly: { type: Boolean, default: false },
});
HolidaySchema.index({ companyId: 1, date: 1 }, { unique: true });

// Employee Schema
const EmployeeSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  employeeCode: { type: String, required: true, uppercase: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String },
  departmentId: { type: String, required: true, index: true },
  designationId: { type: String, required: true, index: true },
  joiningDate: { type: String, required: true }, // YYYY-MM-DD
  employmentStatus: { type: String, enum: ['Active', 'Probationary', 'Terminated'], default: 'Active' },
  basicSalary: { type: Number, required: true, min: 0 },
  hra: { type: Number, required: true, min: 0 },
  medicalAllowance: { type: Number, required: true, min: 0 },
  grossSalary: { type: Number, required: true, min: 0 },
  bankAccount: { type: String },
  emergencyContact: { type: String },
  createdAt: { type: Date, default: Date.now },
});
EmployeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, employmentStatus: 1 });
EmployeeSchema.index({ companyId: 1, departmentId: 1 });

// Attendance Schema
const AttendanceSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  checkInTime: { type: String, required: true }, // ISO
  checkOutTime: { type: String }, // ISO
  status: { type: String, enum: ['present', 'late', 'half_day', 'absent', 'missing_checkout'], required: true },
  workedHours: { type: Number, default: 0 },
  isGeofenced: { type: Boolean, default: false },
  distanceMeters: { type: Number },
  faceVerified: { type: Boolean, default: false },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});
AttendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ companyId: 1, date: 1, status: 1 });
AttendanceSchema.index({ companyId: 1, employeeId: 1, date: -1 });

// Attendance Correction Schema
const AttendanceCorrectionSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  attendanceDate: { type: String, required: true },
  requestedCheckIn: { type: String, required: true },
  requestedCheckOut: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  reviewComment: { type: String },
  createdAt: { type: Date, default: Date.now },
});
AttendanceCorrectionSchema.index({ companyId: 1, status: 1 });
AttendanceCorrectionSchema.index({ companyId: 1, employeeId: 1, attendanceDate: -1 });

// Leave Request Schema
const LeaveRequestSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  leaveTypeId: { type: String, required: true, index: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  daysCount: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  reviewComment: { type: String },
  createdAt: { type: Date, default: Date.now },
});
LeaveRequestSchema.index({ companyId: 1, status: 1 });
LeaveRequestSchema.index({ companyId: 1, employeeId: 1, startDate: -1 });
LeaveRequestSchema.index({ companyId: 1, startDate: 1, endDate: 1 });

// Payroll Run Schema
const PayrollRunSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  month: { type: String, required: true }, // YYYY-MM
  totalGross: { type: Number, default: 0 },
  totalNet: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  preparedBy: { type: String, required: true },
  finalizedBy: { type: String },
  finalizedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
PayrollRunSchema.index({ companyId: 1, month: 1 }, { unique: true });

// Payslip Schema
const PayslipSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  payrollRunId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  month: { type: String, required: true }, // YYYY-MM
  workingDays: { type: Number, required: true },
  presentDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  halfDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  basicSalary: { type: Number, required: true },
  hra: { type: Number, required: true },
  medicalAllowance: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  perDayGross: { type: Number, required: true },
  absentDeduction: { type: Number, default: 0 },
  unpaidLeaveDeduction: { type: Number, default: 0 },
  halfDayDeduction: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  taxableIncomeAnnual: { type: Number, default: 0 },
  annualTax: { type: Number, default: 0 },
  monthlyTax: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  isFinalized: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
PayslipSchema.index({ companyId: 1, payrollRunId: 1, employeeId: 1 }, { unique: true });
PayslipSchema.index({ companyId: 1, employeeId: 1, month: -1 });
PayslipSchema.index({ companyId: 1, month: 1 });

// Announcement Schema
const AnnouncementSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  postedBy: { type: String, required: true },
  postedByName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
AnnouncementSchema.index({ companyId: 1, createdAt: -1 });

// Notification Schema
const NotificationSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  recipientUserId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['leave', 'payroll', 'attendance', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false },
  link: { type: String },
  createdAt: { type: Date, default: Date.now },
});
NotificationSchema.index({ companyId: 1, recipientUserId: 1, isRead: 1, createdAt: -1 });

// Audit Log Schema
const AuditLogSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  beforeState: { type: Schema.Types.Mixed },
  afterState: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
});
AuditLogSchema.index({ companyId: 1, timestamp: -1 });

// AI Log Schema
const AILogSchema = new Schema({
  companyId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userRole: { type: String, required: true },
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  toolsUsed: { type: [String], default: [] },
  latencyMs: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'error'], default: 'success' },
  timestamp: { type: Date, default: Date.now },
});

export const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
export const Designation = mongoose.models.Designation || mongoose.model('Designation', DesignationSchema);
export const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', LeaveTypeSchema);
export const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);
export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
export const AttendanceCorrection = mongoose.models.AttendanceCorrection || mongoose.model('AttendanceCorrection', AttendanceCorrectionSchema);
export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);
export const PayrollRun = mongoose.models.PayrollRun || mongoose.model('PayrollRun', PayrollRunSchema);
export const Payslip = mongoose.models.Payslip || mongoose.model('Payslip', PayslipSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const AILog = mongoose.models.AILog || mongoose.model('AILog', AILogSchema);
