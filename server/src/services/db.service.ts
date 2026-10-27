import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { dbStatus } from '../config/database';
import {
  Company,
  User,
  Department,
  Designation,
  LeaveType,
  Holiday,
  Employee,
  Attendance,
  AttendanceCorrection,
  LeaveRequest,
  PayrollRun,
  Payslip,
  Announcement,
  Notification,
  AuditLog,
  AILog,
} from '../models';
import {
  ICompany,
  IUser,
  IDepartment,
  IDesignation,
  ILeaveType,
  IHoliday,
  IEmployee,
  IAttendance,
  IAttendanceCorrection,
  ILeaveRequest,
  LeaveStatus,
  IPayrollRun,
  IPayslip,
  IAnnouncement,
  INotification,
  IAuditLog,
  IAILog,
} from '../types';

// In-Memory store arrays for fallback preview
const memStore = {
  companies: [] as ICompany[],
  users: [] as IUser[],
  departments: [] as IDepartment[],
  designations: [] as IDesignation[],
  leaveTypes: [] as ILeaveType[],
  holidays: [] as IHoliday[],
  employees: [] as IEmployee[],
  attendances: [] as IAttendance[],
  attendanceCorrections: [] as IAttendanceCorrection[],
  leaveRequests: [] as ILeaveRequest[],
  payrollRuns: [] as IPayrollRun[],
  payslips: [] as IPayslip[],
  announcements: [] as IAnnouncement[],
  notifications: [] as INotification[],
  auditLogs: [] as IAuditLog[],
  aiLogs: [] as IAILog[],
};

function generateId(): string {
  return new mongoose.Types.ObjectId().toHexString();
}

export class DBService {
  private static isAtlas(): boolean {
    if (dbStatus.mode === 'atlas') {
      if (mongoose.connection.readyState !== 1) {
        throw new Error(
          `Database Operation Failed: MongoDB Atlas connection is not active (readyState: ${mongoose.connection.readyState}). Status: ${dbStatus.statusText}. Please verify MONGODB_URI and ensure Network Access in MongoDB Atlas allows 0.0.0.0/0.`
        );
      }
      return true;
    }
    return false;
  }

  // --- Company ---
  static async getCompany(): Promise<ICompany | null> {
    if (this.isAtlas()) {
      const doc = await Company.findOne().lean();
      return doc ? { ...doc, _id: doc._id.toString() } as ICompany : null;
    }
    return memStore.companies[0] || null;
  }

  static async createCompany(data: Partial<ICompany>): Promise<ICompany> {
    const defaultCoords = { lat: 24.8607, lng: 67.0011, radiusMeters: 150 };
    const companyData: ICompany = {
      _id: generateId(),
      name: data.name || 'HCM Enterprises',
      code: (data.code || 'HCM').toUpperCase(),
      industry: data.industry || 'Technology',
      timezone: data.timezone || 'Asia/Karachi',
      officeStartTime: data.officeStartTime || '09:00',
      graceMinutes: data.graceMinutes ?? 15,
      weekendDays: data.weekendDays || [0, 6],
      halfDayHoursThreshold: data.halfDayHoursThreshold ?? 5,
      officeCoordinates: data.officeCoordinates || defaultCoords,
      isInitialized: true,
      createdAt: new Date().toISOString(),
    };

    if (this.isAtlas()) {
      const doc = await Company.create(companyData);
      return { ...doc.toObject(), _id: doc._id.toString() } as ICompany;
    }
    memStore.companies = [companyData];
    return companyData;
  }

  static async updateCompany(id: string, updates: Partial<ICompany>): Promise<ICompany | null> {
    if (this.isAtlas()) {
      const doc = await Company.findByIdAndUpdate(id, updates, { new: true }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as ICompany : null;
    }
    const idx = memStore.companies.findIndex((c) => c._id === id);
    if (idx !== -1) {
      memStore.companies[idx] = { ...memStore.companies[idx], ...updates };
      return memStore.companies[idx];
    }
    return null;
  }

  // --- Users & Bootstrap ---
  static async findUserByEmail(email: string): Promise<IUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (this.isAtlas()) {
      const doc = await User.findOne({ email: cleanEmail }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IUser : null;
    }
    return memStore.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }

  static async findUserById(id: string): Promise<IUser | null> {
    if (this.isAtlas()) {
      const doc = await User.findById(id).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IUser : null;
    }
    return memStore.users.find((u) => u._id === id) || null;
  }

  static async createUser(userData: {
    companyId: string;
    employeeId?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'hr' | 'employee';
    mustChangePassword?: boolean;
    isActive?: boolean;
  }): Promise<IUser> {
    const newUser: IUser = {
      _id: generateId(),
      companyId: userData.companyId,
      employeeId: userData.employeeId,
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      passwordHash: userData.passwordHash,
      role: userData.role,
      mustChangePassword: userData.mustChangePassword ?? false,
      isActive: userData.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    if (this.isAtlas()) {
      const doc = await User.create(newUser);
      return { ...doc.toObject(), _id: doc._id.toString() } as IUser;
    }
    memStore.users.push(newUser);
    return newUser;
  }

  static async updateUserPassword(userId: string, newHash: string): Promise<boolean> {
    if (this.isAtlas()) {
      const res = await User.findByIdAndUpdate(userId, {
        passwordHash: newHash,
        mustChangePassword: false,
      });
      return Boolean(res);
    }
    const user = memStore.users.find((u) => u._id === userId);
    if (user) {
      user.passwordHash = newHash;
      user.mustChangePassword = false;
      return true;
    }
    return false;
  }

  static async countUsersByRole(role: string): Promise<number> {
    if (this.isAtlas()) {
      return await User.countDocuments({ role });
    }
    return memStore.users.filter((u) => u.role === role).length;
  }

  static async listUsers(companyId: string): Promise<IUser[]> {
    if (this.isAtlas()) {
      const docs = await User.find({ companyId }).select('-passwordHash').lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IUser[];
    }
    return memStore.users
      .filter((u) => u.companyId === companyId)
      .map(({ passwordHash, ...rest }) => rest as IUser);
  }

  // --- Departments ---
  static async listDepartments(companyId: string): Promise<IDepartment[]> {
    if (this.isAtlas()) {
      const docs = await Department.find({ companyId }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IDepartment[];
    }
    return memStore.departments.filter((d) => d.companyId === companyId);
  }

  static async createDepartment(companyId: string, data: { name: string; code: string; description?: string }): Promise<IDepartment> {
    const item: IDepartment = {
      _id: generateId(),
      companyId,
      name: data.name.trim(),
      code: data.code.toUpperCase().trim(),
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await Department.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IDepartment;
    }
    memStore.departments.push(item);
    return item;
  }

  static async deleteDepartment(id: string): Promise<boolean> {
    if (this.isAtlas()) {
      const res = await Department.findByIdAndDelete(id);
      return Boolean(res);
    }
    const idx = memStore.departments.findIndex((d) => d._id === id);
    if (idx !== -1) {
      memStore.departments.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- Designations ---
  static async listDesignations(companyId: string, departmentId?: string): Promise<IDesignation[]> {
    const filter: any = { companyId };
    if (departmentId) filter.departmentId = departmentId;

    if (this.isAtlas()) {
      const docs = await Designation.find(filter).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IDesignation[];
    }
    return memStore.designations.filter(
      (d) => d.companyId === companyId && (!departmentId || d.departmentId === departmentId)
    );
  }

  static async createDesignation(companyId: string, data: { departmentId: string; name: string; grade?: string }): Promise<IDesignation> {
    const item: IDesignation = {
      _id: generateId(),
      companyId,
      departmentId: data.departmentId,
      name: data.name.trim(),
      grade: data.grade,
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await Designation.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IDesignation;
    }
    memStore.designations.push(item);
    return item;
  }

  // --- Leave Types ---
  static async listLeaveTypes(companyId: string): Promise<ILeaveType[]> {
    if (this.isAtlas()) {
      const docs = await LeaveType.find({ companyId }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as ILeaveType[];
    }
    return memStore.leaveTypes.filter((l) => l.companyId === companyId);
  }

  static async createLeaveType(companyId: string, data: Omit<ILeaveType, '_id' | 'companyId'>): Promise<ILeaveType> {
    const item: ILeaveType = {
      _id: generateId(),
      companyId,
      ...data,
      code: data.code.toUpperCase().trim(),
    };
    if (this.isAtlas()) {
      const doc = await LeaveType.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as ILeaveType;
    }
    memStore.leaveTypes.push(item);
    return item;
  }

  static async seedDefaultLeaveTypes(companyId: string): Promise<void> {
    const defaults = [
      { name: 'Annual Leave', code: 'ANNUAL', annualQuota: 14, isPaid: true, description: 'Standard annual paid leave quota' },
      { name: 'Sick Leave', code: 'SICK', annualQuota: 8, isPaid: true, description: 'Medical recovery leave' },
      { name: 'Casual Leave', code: 'CASUAL', annualQuota: 10, isPaid: true, description: 'Urgent personal work leave' },
      { name: 'Unpaid Leave', code: 'UNPAID', annualQuota: 0, isPaid: false, description: 'Loss of pay leave deduction' },
    ];
    for (const lt of defaults) {
      await this.createLeaveType(companyId, lt);
    }
  }

  // --- Holidays ---
  static async listHolidays(companyId: string): Promise<IHoliday[]> {
    if (this.isAtlas()) {
      const docs = await Holiday.find({ companyId }).sort({ date: 1 }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IHoliday[];
    }
    return memStore.holidays.filter((h) => h.companyId === companyId).sort((a, b) => a.date.localeCompare(b.date));
  }

  static async createHoliday(companyId: string, data: Omit<IHoliday, '_id' | 'companyId'>): Promise<IHoliday> {
    const item: IHoliday = {
      _id: generateId(),
      companyId,
      ...data,
    };
    if (this.isAtlas()) {
      const doc = await Holiday.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IHoliday;
    }
    memStore.holidays.push(item);
    return item;
  }

  // --- Employees ---
  static async listEmployees(
    companyId: string,
    filters?: { departmentId?: string; search?: string; status?: string }
  ): Promise<IEmployee[]> {
    if (this.isAtlas()) {
      const query: any = { companyId };
      if (filters?.departmentId) query.departmentId = filters.departmentId;
      if (filters?.status) query.employmentStatus = filters.status;
      if (filters?.search) {
        const regex = new RegExp(filters.search, 'i');
        query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }, { employeeCode: regex }];
      }
      const docs = await Employee.find(query).sort({ employeeCode: 1 }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IEmployee[];
    }

    return memStore.employees.filter((emp) => {
      if (emp.companyId !== companyId) return false;
      if (filters?.departmentId && emp.departmentId !== filters.departmentId) return false;
      if (filters?.status && emp.employmentStatus !== filters.status) return false;
      if (filters?.search) {
        const term = filters.search.toLowerCase();
        const full = `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.employeeCode}`.toLowerCase();
        if (!full.includes(term)) return false;
      }
      return true;
    });
  }

  static async getEmployeeById(id: string): Promise<IEmployee | null> {
    if (this.isAtlas()) {
      const doc = await Employee.findById(id).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IEmployee : null;
    }
    return memStore.employees.find((e) => e._id === id) || null;
  }

  static async getEmployeeByCode(companyId: string, code: string): Promise<IEmployee | null> {
    const cleanCode = code.toUpperCase().trim();
    if (this.isAtlas()) {
      const doc = await Employee.findOne({ companyId, employeeCode: cleanCode }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IEmployee : null;
    }
    return memStore.employees.find((e) => e.companyId === companyId && e.employeeCode === cleanCode) || null;
  }

  static async createEmployee(empData: Omit<IEmployee, '_id' | 'hra' | 'medicalAllowance' | 'grossSalary' | 'createdAt'>): Promise<IEmployee> {
    // Official Challenge Formula:
    // Basic = B, HRA = 40% of B, Medical = 10% of B, Gross = 1.5 * B
    const basic = Number(empData.basicSalary) || 0;
    const hra = Math.round(basic * 0.4);
    const medicalAllowance = Math.round(basic * 0.1);
    const grossSalary = basic + hra + medicalAllowance;

    const newEmp: IEmployee = {
      _id: generateId(),
      ...empData,
      employeeCode: empData.employeeCode.toUpperCase().trim(),
      email: empData.email.toLowerCase().trim(),
      basicSalary: basic,
      hra,
      medicalAllowance,
      grossSalary,
      createdAt: new Date().toISOString(),
    };

    if (this.isAtlas()) {
      const doc = await Employee.create(newEmp);
      return { ...doc.toObject(), _id: doc._id.toString() } as IEmployee;
    }
    memStore.employees.push(newEmp);
    return newEmp;
  }

  static async updateEmployee(id: string, updates: Partial<IEmployee>): Promise<IEmployee | null> {
    if (updates.basicSalary !== undefined) {
      const basic = Number(updates.basicSalary) || 0;
      updates.hra = Math.round(basic * 0.4);
      updates.medicalAllowance = Math.round(basic * 0.1);
      updates.grossSalary = basic + updates.hra + updates.medicalAllowance;
    }

    if (this.isAtlas()) {
      const doc = await Employee.findByIdAndUpdate(id, updates, { new: true }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IEmployee : null;
    }
    const idx = memStore.employees.findIndex((e) => e._id === id);
    if (idx !== -1) {
      memStore.employees[idx] = { ...memStore.employees[idx], ...updates };
      return memStore.employees[idx];
    }
    return null;
  }

  // --- Attendance ---
  static async getAttendanceForDate(companyId: string, employeeId: string, date: string): Promise<IAttendance | null> {
    if (this.isAtlas()) {
      const doc = await Attendance.findOne({ companyId, employeeId, date }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IAttendance : null;
    }
    return memStore.attendances.find((a) => a.companyId === companyId && a.employeeId === employeeId && a.date === date) || null;
  }

  static async listAttendances(companyId: string, filters?: { date?: string; employeeId?: string; month?: string }): Promise<IAttendance[]> {
    if (this.isAtlas()) {
      const query: any = { companyId };
      if (filters?.date) query.date = filters.date;
      if (filters?.employeeId) query.employeeId = filters.employeeId;
      if (filters?.month) query.date = new RegExp(`^${filters.month}`);
      const docs = await Attendance.find(query).sort({ date: -1, checkInTime: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IAttendance[];
    }

    return memStore.attendances.filter((a) => {
      if (a.companyId !== companyId) return false;
      if (filters?.date && a.date !== filters.date) return false;
      if (filters?.employeeId && a.employeeId !== filters.employeeId) return false;
      if (filters?.month && !a.date.startsWith(filters.month)) return false;
      return true;
    });
  }

  static async recordCheckIn(
    companyId: string,
    employeeId: string,
    date: string,
    checkInTime: string,
    meta?: { isGeofenced?: boolean; distanceMeters?: number; faceVerified?: boolean; notes?: string }
  ): Promise<IAttendance> {
    // Determine initial status based on office start time and grace period
    const company = await this.getCompany();
    const officeStart = company?.officeStartTime || '09:00';
    const graceMin = company?.graceMinutes ?? 15;

    // Parse checkInTime HH:mm
    const checkInDate = new Date(checkInTime);
    const [startH, startM] = officeStart.split(':').map(Number);
    const cutoffMinutes = startH * 60 + startM + graceMin;
    const actualMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

    const status = actualMinutes > cutoffMinutes ? 'late' : 'present';

    const item: IAttendance = {
      _id: generateId(),
      companyId,
      employeeId,
      date,
      checkInTime,
      status,
      workedHours: 0,
      isGeofenced: meta?.isGeofenced,
      distanceMeters: meta?.distanceMeters,
      faceVerified: meta?.faceVerified,
      notes: meta?.notes,
      createdAt: new Date().toISOString(),
    };

    if (this.isAtlas()) {
      const doc = await Attendance.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IAttendance;
    }
    memStore.attendances.push(item);
    return item;
  }

  static async recordCheckOut(
    attendanceId: string,
    checkOutTime: string
  ): Promise<IAttendance | null> {
    const existing = this.isAtlas()
      ? await Attendance.findById(attendanceId).lean()
      : memStore.attendances.find((a) => a._id === attendanceId);

    if (!existing) return null;

    const company = await this.getCompany();
    const halfDayThreshold = company?.halfDayHoursThreshold ?? 5;

    const inTime = new Date(existing.checkInTime).getTime();
    const outTime = new Date(checkOutTime).getTime();
    const diffHours = Math.max(0, (outTime - inTime) / (1000 * 60 * 60));
    const workedHours = Math.round(diffHours * 100) / 100;

    let status = existing.status;
    if (workedHours < halfDayThreshold) {
      status = 'half_day';
    }

    if (this.isAtlas()) {
      const doc = await Attendance.findByIdAndUpdate(
        attendanceId,
        { checkOutTime, workedHours, status },
        { new: true }
      ).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IAttendance : null;
    }

    const idx = memStore.attendances.findIndex((a) => a._id === attendanceId);
    if (idx !== -1) {
      memStore.attendances[idx].checkOutTime = checkOutTime;
      memStore.attendances[idx].workedHours = workedHours;
      memStore.attendances[idx].status = status;
      return memStore.attendances[idx];
    }
    return null;
  }

  // --- Attendance Corrections ---
  static async listCorrections(companyId: string, employeeId?: string): Promise<IAttendanceCorrection[]> {
    if (this.isAtlas()) {
      const query: any = { companyId };
      if (employeeId) query.employeeId = employeeId;
      const docs = await AttendanceCorrection.find(query).sort({ createdAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IAttendanceCorrection[];
    }
    return memStore.attendanceCorrections
      .filter((c) => c.companyId === companyId && (!employeeId || c.employeeId === employeeId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async createCorrection(
    companyId: string,
    employeeId: string,
    data: { attendanceDate: string; requestedCheckIn: string; requestedCheckOut: string; reason: string }
  ): Promise<IAttendanceCorrection> {
    const item: IAttendanceCorrection = {
      _id: generateId(),
      companyId,
      employeeId,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await AttendanceCorrection.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IAttendanceCorrection;
    }
    memStore.attendanceCorrections.push(item);
    return item;
  }

  static async reviewCorrection(
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewComment?: string
  ): Promise<IAttendanceCorrection | null> {
    const updates = {
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewComment,
    };

    if (this.isAtlas()) {
      const doc = await AttendanceCorrection.findByIdAndUpdate(id, updates, { new: true }).lean();
      if (doc && status === 'approved') {
        // Apply correction to attendance
        const inDate = new Date(`${doc.attendanceDate}T${doc.requestedCheckIn}:00Z`).toISOString();
        const outDate = new Date(`${doc.attendanceDate}T${doc.requestedCheckOut}:00Z`).toISOString();
        const hours = Math.max(0, (new Date(outDate).getTime() - new Date(inDate).getTime()) / 3600000);
        await Attendance.findOneAndUpdate(
          { companyId: doc.companyId, employeeId: doc.employeeId, date: doc.attendanceDate },
          {
            checkInTime: inDate,
            checkOutTime: outDate,
            workedHours: Math.round(hours * 100) / 100,
            status: hours < 5 ? 'half_day' : 'present',
          },
          { upsert: true }
        );
      }
      return doc ? { ...doc, _id: doc._id.toString() } as IAttendanceCorrection : null;
    }

    const idx = memStore.attendanceCorrections.findIndex((c) => c._id === id);
    if (idx !== -1) {
      memStore.attendanceCorrections[idx] = { ...memStore.attendanceCorrections[idx], ...updates };
      const item = memStore.attendanceCorrections[idx];
      if (status === 'approved') {
        const inDate = new Date(`${item.attendanceDate}T${item.requestedCheckIn}:00Z`).toISOString();
        const outDate = new Date(`${item.attendanceDate}T${item.requestedCheckOut}:00Z`).toISOString();
        const hours = Math.max(0, (new Date(outDate).getTime() - new Date(inDate).getTime()) / 3600000);
        const attIdx = memStore.attendances.findIndex(
          (a) => a.companyId === item.companyId && a.employeeId === item.employeeId && a.date === item.attendanceDate
        );
        if (attIdx !== -1) {
          memStore.attendances[attIdx].checkInTime = inDate;
          memStore.attendances[attIdx].checkOutTime = outDate;
          memStore.attendances[attIdx].workedHours = Math.round(hours * 100) / 100;
          memStore.attendances[attIdx].status = hours < 5 ? 'half_day' : 'present';
        } else {
          memStore.attendances.push({
            _id: generateId(),
            companyId: item.companyId,
            employeeId: item.employeeId,
            date: item.attendanceDate,
            checkInTime: inDate,
            checkOutTime: outDate,
            workedHours: Math.round(hours * 100) / 100,
            status: hours < 5 ? 'half_day' : 'present',
            createdAt: new Date().toISOString(),
          });
        }
      }
      return item;
    }
    return null;
  }

  // --- Leave Requests ---
  static async listLeaveRequests(companyId: string, employeeId?: string): Promise<ILeaveRequest[]> {
    if (this.isAtlas()) {
      const query: any = { companyId };
      if (employeeId) query.employeeId = employeeId;
      const docs = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as ILeaveRequest[];
    }
    return memStore.leaveRequests
      .filter((l) => l.companyId === companyId && (!employeeId || l.employeeId === employeeId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async createLeaveRequest(
    companyId: string,
    employeeId: string,
    data: { leaveTypeId: string; startDate: string; endDate: string; daysCount: number; reason: string }
  ): Promise<ILeaveRequest> {
    const item: ILeaveRequest = {
      _id: generateId(),
      companyId,
      employeeId,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await LeaveRequest.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as ILeaveRequest;
    }
    memStore.leaveRequests.push(item);
    return item;
  }

  static async updateLeaveStatus(
    id: string,
    status: LeaveStatus,
    reviewedBy?: string,
    reviewComment?: string
  ): Promise<ILeaveRequest | null> {
    const updates: any = { status };
    if (reviewedBy) {
      updates.reviewedBy = reviewedBy;
      updates.reviewedAt = new Date().toISOString();
      updates.reviewComment = reviewComment;
    }

    if (this.isAtlas()) {
      const doc = await LeaveRequest.findByIdAndUpdate(id, updates, { new: true }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as ILeaveRequest : null;
    }
    const idx = memStore.leaveRequests.findIndex((l) => l._id === id);
    if (idx !== -1) {
      memStore.leaveRequests[idx] = { ...memStore.leaveRequests[idx], ...updates };
      return memStore.leaveRequests[idx];
    }
    return null;
  }

  // --- Payroll Runs & Payslips ---
  static async getPayrollRun(companyId: string, month: string): Promise<IPayrollRun | null> {
    if (this.isAtlas()) {
      const doc = await PayrollRun.findOne({ companyId, month }).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IPayrollRun : null;
    }
    return memStore.payrollRuns.find((p) => p.companyId === companyId && p.month === month) || null;
  }

  static async listPayrollRuns(companyId: string): Promise<IPayrollRun[]> {
    if (this.isAtlas()) {
      const docs = await PayrollRun.find({ companyId }).sort({ month: -1 }).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IPayrollRun[];
    }
    return memStore.payrollRuns.filter((p) => p.companyId === companyId).sort((a, b) => b.month.localeCompare(a.month));
  }

  static async createPayrollRun(data: Omit<IPayrollRun, '_id' | 'createdAt'>): Promise<IPayrollRun> {
    const item: IPayrollRun = {
      _id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await PayrollRun.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IPayrollRun;
    }
    memStore.payrollRuns.push(item);
    return item;
  }

  static async finalizePayrollRun(id: string, finalizedBy: string): Promise<IPayrollRun | null> {
    const updates = {
      status: 'finalized' as const,
      finalizedBy,
      finalizedAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await PayrollRun.findByIdAndUpdate(id, updates, { new: true }).lean();
      if (doc) {
        await Payslip.updateMany({ payrollRunId: id }, { isFinalized: true });
      }
      return doc ? { ...doc, _id: doc._id.toString() } as IPayrollRun : null;
    }
    const idx = memStore.payrollRuns.findIndex((p) => p._id === id);
    if (idx !== -1) {
      memStore.payrollRuns[idx] = { ...memStore.payrollRuns[idx], ...updates };
      memStore.payslips.forEach((ps) => {
        if (ps.payrollRunId === id) ps.isFinalized = true;
      });
      return memStore.payrollRuns[idx];
    }
    return null;
  }

  static async savePayslips(payslips: Omit<IPayslip, '_id' | 'createdAt'>[]): Promise<IPayslip[]> {
    const items: IPayslip[] = payslips.map((p) => ({
      ...p,
      _id: generateId(),
      createdAt: new Date().toISOString(),
    }));

    if (this.isAtlas()) {
      // Remove existing draft slips for this run if re-generating draft
      if (items.length > 0) {
        await Payslip.deleteMany({ payrollRunId: items[0].payrollRunId, isFinalized: false });
      }
      const docs = await Payslip.insertMany(items);
      return docs.map((d) => ({ ...d.toObject(), _id: d._id.toString() })) as IPayslip[];
    }

    if (items.length > 0) {
      memStore.payslips = memStore.payslips.filter(
        (ps) => !(ps.payrollRunId === items[0].payrollRunId && !ps.isFinalized)
      );
    }
    memStore.payslips.push(...items);
    return items;
  }

  static async listPayslips(companyId: string, filters?: { payrollRunId?: string; employeeId?: string; month?: string }): Promise<IPayslip[]> {
    if (this.isAtlas()) {
      const query: any = { companyId };
      if (filters?.payrollRunId) query.payrollRunId = filters.payrollRunId;
      if (filters?.employeeId) query.employeeId = filters.employeeId;
      if (filters?.month) query.month = filters.month;
      const docs = await Payslip.find(query).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IPayslip[];
    }
    return memStore.payslips.filter((p) => {
      if (p.companyId !== companyId) return false;
      if (filters?.payrollRunId && p.payrollRunId !== filters.payrollRunId) return false;
      if (filters?.employeeId && p.employeeId !== filters.employeeId) return false;
      if (filters?.month && p.month !== filters.month) return false;
      return true;
    });
  }

  static async getPayslipById(id: string): Promise<IPayslip | null> {
    if (this.isAtlas()) {
      const doc = await Payslip.findById(id).lean();
      return doc ? { ...doc, _id: doc._id.toString() } as IPayslip : null;
    }
    return memStore.payslips.find((p) => p._id === id) || null;
  }

  // --- Announcements ---
  static async listAnnouncements(companyId: string): Promise<IAnnouncement[]> {
    if (this.isAtlas()) {
      const docs = await Announcement.find({ companyId }).sort({ createdAt: -1 }).limit(20).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IAnnouncement[];
    }
    return memStore.announcements
      .filter((a) => a.companyId === companyId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
  }

  static async createAnnouncement(data: Omit<IAnnouncement, '_id' | 'createdAt'>): Promise<IAnnouncement> {
    const item: IAnnouncement = {
      _id: generateId(),
      ...data,
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await Announcement.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as IAnnouncement;
    }
    memStore.announcements.push(item);
    return item;
  }

  // --- Notifications ---
  static async listNotifications(companyId: string, recipientUserId: string): Promise<INotification[]> {
    if (this.isAtlas()) {
      const docs = await Notification.find({ companyId, recipientUserId }).sort({ createdAt: -1 }).limit(30).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as INotification[];
    }
    return memStore.notifications
      .filter((n) => n.companyId === companyId && n.recipientUserId === recipientUserId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);
  }

  static async createNotification(data: Omit<INotification, '_id' | 'isRead' | 'createdAt'>): Promise<INotification> {
    const item: INotification = {
      _id: generateId(),
      ...data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      const doc = await Notification.create(item);
      return { ...doc.toObject(), _id: doc._id.toString() } as INotification;
    }
    memStore.notifications.push(item);
    return item;
  }

  static async markNotificationRead(id: string): Promise<boolean> {
    if (this.isAtlas()) {
      await Notification.findByIdAndUpdate(id, { isRead: true });
      return true;
    }
    const notif = memStore.notifications.find((n) => n._id === id);
    if (notif) notif.isRead = true;
    return true;
  }

  // --- Audit Logs (Append-Only) ---
  static async logAudit(data: Omit<IAuditLog, '_id' | 'timestamp'>): Promise<void> {
    const item: IAuditLog = {
      _id: generateId(),
      ...data,
      timestamp: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      await AuditLog.create(item);
    } else {
      memStore.auditLogs.unshift(item);
      if (memStore.auditLogs.length > 500) memStore.auditLogs.pop();
    }
  }

  static async listAuditLogs(companyId: string, limit = 100): Promise<IAuditLog[]> {
    if (this.isAtlas()) {
      const docs = await AuditLog.find({ companyId }).sort({ timestamp: -1 }).limit(limit).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IAuditLog[];
    }
    return memStore.auditLogs.filter((a) => a.companyId === companyId).slice(0, limit);
  }

  // --- AI Logs ---
  static async logAI(data: Omit<IAILog, '_id' | 'timestamp'>): Promise<void> {
    const item: IAILog = {
      _id: generateId(),
      ...data,
      timestamp: new Date().toISOString(),
    };
    if (this.isAtlas()) {
      await AILog.create(item);
    } else {
      memStore.aiLogs.unshift(item);
      if (memStore.aiLogs.length > 200) memStore.aiLogs.pop();
    }
  }

  static async listAILogs(companyId: string, limit = 50): Promise<IAILog[]> {
    if (this.isAtlas()) {
      const docs = await AILog.find({ companyId }).sort({ timestamp: -1 }).limit(limit).lean();
      return docs.map((d) => ({ ...d, _id: d._id.toString() })) as IAILog[];
    }
    return memStore.aiLogs.filter((l) => l.companyId === companyId).slice(0, limit);
  }

  // Seed development fictional data (Only when explicitly triggered by judge / dev!)
  static async seedDemoData(companyId: string): Promise<{ success: boolean; message: string }> {
    const existingEmps = await this.listEmployees(companyId);
    if (existingEmps.length > 0) {
      return { success: false, message: 'Database already has employee records. Seed aborted.' };
    }

    // 1. Departments
    const eng = await this.createDepartment(companyId, { name: 'Engineering', code: 'ENG', description: 'Software & Technology' });
    const hr = await this.createDepartment(companyId, { name: 'Human Resources', code: 'HR', description: 'Talent & Culture' });
    const fin = await this.createDepartment(companyId, { name: 'Finance & Accounts', code: 'FIN', description: 'Finance & Compliance' });

    // 2. Designations
    const desLead = await this.createDesignation(companyId, { departmentId: eng._id, name: 'Principal Engineer', grade: 'L5' });
    const desDev = await this.createDesignation(companyId, { departmentId: eng._id, name: 'Senior Developer', grade: 'L4' });
    const desHR = await this.createDesignation(companyId, { departmentId: hr._id, name: 'HR Generalist', grade: 'L3' });
    const desFin = await this.createDesignation(companyId, { departmentId: fin._id, name: 'Financial Analyst', grade: 'L3' });

    // 3. Fictional Employees with passwords
    const defaultHash = await bcrypt.hash('Employee@123', 10);

    const emp1 = await this.createEmployee({
      companyId,
      employeeCode: 'EMP001',
      firstName: 'Tariq',
      lastName: 'Mansoor',
      email: 'tariq.mansoor@example.com',
      phone: '+92 300 1234567',
      departmentId: eng._id,
      designationId: desLead._id,
      joiningDate: '2024-01-15',
      employmentStatus: 'Active',
      basicSalary: 200000,
    });
    await this.createUser({
      companyId,
      employeeId: emp1._id,
      name: 'Tariq Mansoor',
      email: 'tariq.mansoor@example.com',
      passwordHash: defaultHash,
      role: 'employee',
      mustChangePassword: false,
    });

    const emp2 = await this.createEmployee({
      companyId,
      employeeCode: 'EMP002',
      firstName: 'Zainab',
      lastName: 'Fatima',
      email: 'zainab.fatima@example.com',
      phone: '+92 301 9876543',
      departmentId: hr._id,
      designationId: desHR._id,
      joiningDate: '2024-03-01',
      employmentStatus: 'Active',
      basicSalary: 120000,
    });
    await this.createUser({
      companyId,
      employeeId: emp2._id,
      name: 'Zainab Fatima',
      email: 'zainab.fatima@example.com',
      passwordHash: defaultHash,
      role: 'employee',
      mustChangePassword: false,
    });

    const emp3 = await this.createEmployee({
      companyId,
      employeeCode: 'EMP003',
      firstName: 'Bilal',
      lastName: 'Ahmed',
      email: 'bilal.ahmed@example.com',
      phone: '+92 302 5551234',
      departmentId: eng._id,
      designationId: desDev._id,
      joiningDate: '2024-06-10',
      employmentStatus: 'Active',
      basicSalary: 150000,
    });
    await this.createUser({
      companyId,
      employeeId: emp3._id,
      name: 'Bilal Ahmed',
      email: 'bilal.ahmed@example.com',
      passwordHash: defaultHash,
      role: 'employee',
      mustChangePassword: false,
    });

    // 4. Sample Attendance for Today
    const today = new Date().toISOString().split('T')[0];
    await this.recordCheckIn(companyId, emp1._id, today, `${today}T08:55:00Z`);
    await this.recordCheckIn(companyId, emp2._id, today, `${today}T09:22:00Z`); // Late

    // 5. Sample announcement
    await this.createAnnouncement({
      companyId,
      title: 'Welcome to HCM Lite Enterprise HR Portal',
      content: 'All team members please review your profile details and ensure attendance check-in by 09:00 AM.',
      priority: 'normal',
      postedBy: 'admin',
      postedByName: 'Super Admin',
    });

    return { success: true, message: 'Fictional demo data seeded successfully with 3 employees, departments, and designations.' };
  }
}
