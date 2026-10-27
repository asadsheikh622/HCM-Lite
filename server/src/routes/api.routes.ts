import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { dbStatus } from '../config/database';
import { DBService } from '../services/db.service';
import { AIService } from '../services/ai.service';
import { calculateAnnualTax, getWorkingDaysInMonth } from '../services/payroll.calculator';
import { calculateWorkingDaysBetween, doDatesOverlap } from '../services/leave.calculator';
import {
  authenticateToken,
  requireRole,
  enforceEmployeeScope,
  AuthenticatedRequest,
} from '../middleware/auth';
import { UserRole } from '../types';

export const apiRouter = Router();

// ==========================================
// 1. HEALTH & SYSTEM STATUS
// ==========================================
apiRouter.get('/health', async (_req, res) => {
  let company = null;
  let superAdminCount = 0;
  try {
    company = await DBService.getCompany();
    superAdminCount = await DBService.countUsersByRole('admin');
  } catch (err: any) {
    console.warn('[Health Probe] Database query notice during health check:', err.message);
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      isConnected: dbStatus.isConnected,
      mode: dbStatus.mode,
      isFallback: dbStatus.mode === 'memory',
      status: dbStatus.isConnected ? 'connected' : 'disconnected',
      name: dbStatus.name,
      host: dbStatus.host || 'local/in-memory',
      error: dbStatus.error,
      lastConnectedAt: dbStatus.lastConnectedAt,
    },
    system: {
      isInitialized: Boolean(company?.isInitialized),
      superAdminExists: superAdminCount > 0,
      initialAdminEmail: ENV.INITIAL_ADMIN_EMAIL,
      geminiConfigured: Boolean(ENV.GEMINI_API_KEY),
    },
  });
});

// ==========================================
// 2. FIRST-RUN SETUP & SECURE ADMIN BOOTSTRAP
// ==========================================
apiRouter.get('/setup/status', async (_req, res) => {
  try {
    const company = await DBService.getCompany();
    const superAdminCount = await DBService.countUsersByRole('admin');

    res.json({
      isInitialized: Boolean(company?.isInitialized),
      superAdminExists: superAdminCount > 0,
      authorizedBootstrapEmail: ENV.INITIAL_ADMIN_EMAIL,
      database: {
        isConnected: dbStatus.isConnected,
        mode: dbStatus.mode,
        isFallback: dbStatus.mode === 'memory',
        error: dbStatus.error,
      },
    });
  } catch (err: any) {
    res.status(503).json({
      error: 'Database connection failed',
      details: err.message,
      isInitialized: false,
      superAdminExists: false,
      authorizedBootstrapEmail: ENV.INITIAL_ADMIN_EMAIL,
      database: {
        isConnected: false,
        mode: dbStatus.mode,
        isFallback: false,
        error: dbStatus.error || err.message,
      },
    });
  }
});

apiRouter.post('/setup/bootstrap-admin', async (req, res) => {
  try {
    const superAdminCount = await DBService.countUsersByRole('admin');
    if (superAdminCount > 0) {
      res.status(403).json({
        error: 'Forbidden: Super Admin has already been bootstrapped. Public admin creation is permanently disabled.',
      });
      return;
    }

    const { companyName, companyCode, email, password, adminName } = req.body;

    if (!email || !password || !companyName) {
      res.status(400).json({ error: 'Company Name, Admin Email, and Password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail !== ENV.INITIAL_ADMIN_EMAIL) {
      res.status(403).json({
        error: `Security Authorization Failed: Only the authorized email (${ENV.INITIAL_ADMIN_EMAIL}) is permitted to bootstrap the first Super Admin account.`,
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    // 1. Create Company
    const company = await DBService.createCompany({
      name: companyName.trim(),
      code: (companyCode || 'HCM').toUpperCase().trim(),
      officeStartTime: '09:00',
      graceMinutes: 15,
      weekendDays: [0, 6],
      halfDayHoursThreshold: 5,
    });

    // 2. Seed Default Leave Types
    await DBService.seedDefaultLeaveTypes(company._id);

    // 3. Hash password and create Super Admin User
    const passwordHash = await bcrypt.hash(password, 10);
    const superAdmin = await DBService.createUser({
      companyId: company._id,
      name: adminName ? adminName.trim() : 'Super Admin',
      email: cleanEmail,
      passwordHash,
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
    });

    // 4. Log Audit
    await DBService.logAudit({
      companyId: company._id,
      actorId: superAdmin._id,
      actorName: superAdmin.name,
      actorRole: 'admin',
      action: 'BOOTSTRAP_SUPER_ADMIN',
      entity: 'Company & User',
      entityId: company._id,
      afterState: { companyName: company.name, adminEmail: superAdmin.email },
      ipAddress: req.ip,
    });

    // 5. Generate JWT token
    const token = jwt.sign(
      { userId: superAdmin._id, role: superAdmin.role, companyId: company._id },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Initial Super Admin and Company bootstrapped successfully.',
      token,
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        companyId: company._id,
      },
      company,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to bootstrap Super Admin.', details: err.message });
  }
});

// ==========================================
// 3. AUTHENTICATION (Login, Logout, Change Password)
// ==========================================
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await DBService.findUserByEmail(cleanEmail);

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, companyId: user.companyId },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await DBService.logAudit({
      companyId: user.companyId,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword,
        companyId: user.companyId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
});

apiRouter.post('/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user!;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await DBService.updateUserPassword(user._id, newHash);

    await DBService.logAudit({
      companyId: user.companyId,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user._id,
      ipAddress: req.ip,
    });

    res.json({ message: 'Password updated successfully. You may now access all services.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update password.', details: err.message });
  }
});

apiRouter.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const company = await DBService.getCompany();
  let employeeProfile = null;
  if (user.employeeId) {
    employeeProfile = await DBService.getEmployeeById(user.employeeId);
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword,
      companyId: user.companyId,
    },
    company,
    employeeProfile,
  });
});

apiRouter.post('/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  await DBService.logAudit({
    companyId: user.companyId,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'LOGOUT',
    entity: 'User',
    entityId: user._id,
    ipAddress: req.ip,
  });
  res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// 4. ORGANIZATION SETUP (Company, Depts, Designations, Holidays, Leave Types)
// ==========================================
apiRouter.get('/company', authenticateToken, async (_req, res) => {
  const company = await DBService.getCompany();
  res.json({ company });
});

apiRouter.put('/company', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const company = await DBService.getCompany();
    if (!company) {
      res.status(404).json({ error: 'Company not found.' });
      return;
    }

    const beforeState = { ...company };
    const updated = await DBService.updateCompany(company._id, req.body);

    await DBService.logAudit({
      companyId: company._id,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'UPDATE_COMPANY_SETTINGS',
      entity: 'Company',
      entityId: company._id,
      beforeState,
      afterState: updated,
      ipAddress: req.ip,
    });

    res.json({ message: 'Company settings updated successfully.', company: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update company settings.', details: err.message });
  }
});

// Departments
apiRouter.get('/departments', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const depts = await DBService.listDepartments(req.user!.companyId);
  res.json({ departments: depts });
});

apiRouter.post('/departments', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Department name and code are required.' });
      return;
    }
    const dept = await DBService.createDepartment(req.user!.companyId, { name, code, description });
    await DBService.logAudit({
      companyId: req.user!.companyId,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: dept._id,
      afterState: dept,
      ipAddress: req.ip,
    });
    res.status(201).json({ department: dept });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create department.', details: err.message });
  }
});

apiRouter.delete('/departments/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  await DBService.deleteDepartment(req.params.id);
  res.json({ message: 'Department deleted successfully.' });
});

// Designations
apiRouter.get('/designations', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const departmentId = req.query.departmentId as string | undefined;
  const designations = await DBService.listDesignations(req.user!.companyId, departmentId);
  res.json({ designations });
});

apiRouter.post('/designations', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  try {
    const { departmentId, name, grade } = req.body;
    if (!departmentId || !name) {
      res.status(400).json({ error: 'Department and designation name are required.' });
      return;
    }
    const des = await DBService.createDesignation(req.user!.companyId, { departmentId, name, grade });
    res.status(201).json({ designation: des });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create designation.', details: err.message });
  }
});

// Leave Types
apiRouter.get('/leave-types', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const leaveTypes = await DBService.listLeaveTypes(req.user!.companyId);
  res.json({ leaveTypes });
});

apiRouter.post('/leave-types', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const lt = await DBService.createLeaveType(req.user!.companyId, req.body);
    res.status(201).json({ leaveType: lt });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create leave type.', details: err.message });
  }
});

// Holidays
apiRouter.get('/holidays', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const holidays = await DBService.listHolidays(req.user!.companyId);
  res.json({ holidays });
});

apiRouter.post('/holidays', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, date, isRecurringYearly } = req.body;
    if (!name || !date) {
      res.status(400).json({ error: 'Holiday name and date (YYYY-MM-DD) are required.' });
      return;
    }
    const holiday = await DBService.createHoliday(req.user!.companyId, { name, date, isRecurringYearly: Boolean(isRecurringYearly) });
    res.status(201).json({ holiday });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create holiday.', details: err.message });
  }
});

// Create HR Account (Admin only)
apiRouter.post('/organization/create-hr', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await DBService.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'A user account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const hrUser = await DBService.createUser({
      companyId: req.user!.companyId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'hr',
      mustChangePassword: true, // Requires first login password change
    });

    await DBService.logAudit({
      companyId: req.user!.companyId,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'CREATE_HR_ACCOUNT',
      entity: 'User',
      entityId: hrUser._id,
      afterState: { name: hrUser.name, email: hrUser.email, role: 'hr' },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'HR account created successfully with temporary password.',
      user: { id: hrUser._id, name: hrUser.name, email: hrUser.email, role: hrUser.role },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create HR account.', details: err.message });
  }
});

// ==========================================
// 5. EMPLOYEE MANAGEMENT (Register, 360 Profile, CSV Import/Export)
// ==========================================
apiRouter.get('/employees', authenticateToken, enforceEmployeeScope, async (req: AuthenticatedRequest, res) => {
  const { departmentId, search, status, employeeId } = req.query as any;
  const companyId = req.user!.companyId;

  let employees = await DBService.listEmployees(companyId, { departmentId, search, status });

  if (req.user!.role === 'employee') {
    employees = employees.filter((e) => e._id === req.user!.employeeId);
  }

  res.json({ employees });
});

apiRouter.get('/employees/:id', authenticateToken, enforceEmployeeScope, async (req: AuthenticatedRequest, res) => {
  const emp = await DBService.getEmployeeById(req.params.id);
  if (!emp || emp.companyId !== req.user!.companyId) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  // Employee 360 data
  const attendances = await DBService.listAttendances(emp.companyId, { employeeId: emp._id });
  const leaves = await DBService.listLeaveRequests(emp.companyId, emp._id);
  const payslips = await DBService.listPayslips(emp.companyId, { employeeId: emp._id });

  res.json({
    employee: emp,
    attendances: attendances.slice(0, 30),
    leaves,
    payslips,
  });
});

apiRouter.post('/employees', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      designationId,
      joiningDate,
      employmentStatus,
      basicSalary,
      temporaryPassword,
    } = req.body;

    if (!employeeCode || !firstName || !lastName || !email || !departmentId || !designationId || !basicSalary) {
      res.status(400).json({ error: 'All primary fields (code, name, email, department, designation, salary) are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = employeeCode.toUpperCase().trim();

    // Check duplicate code or email
    const existingCode = await DBService.getEmployeeByCode(req.user!.companyId, cleanCode);
    if (existingCode) {
      res.status(409).json({ error: `Employee code '${cleanCode}' is already registered.` });
      return;
    }
    const existingUser = await DBService.findUserByEmail(cleanEmail);
    if (existingUser) {
      res.status(409).json({ error: `An account with email '${cleanEmail}' already exists.` });
      return;
    }

    // 1. Create Employee record
    const emp = await DBService.createEmployee({
      companyId: req.user!.companyId,
      employeeCode: cleanCode,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phone,
      departmentId,
      designationId,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      employmentStatus: employmentStatus || 'Active',
      basicSalary: Number(basicSalary),
    });

    // 2. Create User login for Employee
    const tempPass = temporaryPassword || 'Welcome@2026';
    const passwordHash = await bcrypt.hash(tempPass, 10);
    const user = await DBService.createUser({
      companyId: req.user!.companyId,
      employeeId: emp._id,
      name: `${emp.firstName} ${emp.lastName}`,
      email: cleanEmail,
      passwordHash,
      role: 'employee',
      mustChangePassword: true, // Enforce password change at first sign-in
    });

    await DBService.logAudit({
      companyId: req.user!.companyId,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'REGISTER_EMPLOYEE',
      entity: 'Employee',
      entityId: emp._id,
      afterState: { employeeCode: emp.employeeCode, name: `${emp.firstName} ${emp.lastName}`, email: emp.email },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Employee registered successfully with temporary login credentials.',
      employee: emp,
      loginEmail: user.email,
      temporaryPasswordNote: 'Temporary password set. Employee will be prompted to change password on first sign-in.',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register employee.', details: err.message });
  }
});

// CSV Dry Run & Commit
apiRouter.post('/employees/import/dry-run', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const { rows } = req.body as { rows: any[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'No employee rows provided for import.' });
    return;
  }

  const companyId = req.user!.companyId;
  const depts = await DBService.listDepartments(companyId);
  const deptCodes = new Set(depts.map((d) => d.code.toUpperCase()));
  const existingEmps = await DBService.listEmployees(companyId);
  const seenCodes = new Set(existingEmps.map((e) => e.employeeCode.toUpperCase()));
  const seenEmails = new Set(existingEmps.map((e) => e.email.toLowerCase()));

  const invalidRows: Array<{ rowNumber: number; field: string; reason: string }> = [];
  let validCount = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    let hasError = false;

    if (!row.employeeCode || seenCodes.has(row.employeeCode.toUpperCase())) {
      invalidRows.push({ rowNumber: rowNum, field: 'employeeCode', reason: 'Missing or duplicate employee code' });
      hasError = true;
    }
    if (!row.email || seenEmails.has(row.email.toLowerCase()) || !row.email.includes('@')) {
      invalidRows.push({ rowNumber: rowNum, field: 'email', reason: 'Invalid or duplicate email address' });
      hasError = true;
    }
    if (!row.firstName || !row.lastName) {
      invalidRows.push({ rowNumber: rowNum, field: 'name', reason: 'First and last name are required' });
      hasError = true;
    }
    if (!row.basicSalary || Number(row.basicSalary) <= 0) {
      invalidRows.push({ rowNumber: rowNum, field: 'basicSalary', reason: 'Salary must be a positive number' });
      hasError = true;
    }

    if (!hasError) {
      validCount++;
      seenCodes.add(row.employeeCode.toUpperCase());
      seenEmails.add(row.email.toLowerCase());
    }
  });

  res.json({
    totalRows: rows.length,
    validRows: validCount,
    invalidRows,
    canCommit: invalidRows.length === 0,
  });
});

// ==========================================
// 6. ATTENDANCE (Check-in, Check-out, Corrections)
// ==========================================
apiRouter.post('/attendance/check-in', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const employeeId = user.role === 'employee' ? user.employeeId : req.body.employeeId;

    if (!employeeId) {
      res.status(400).json({ error: 'Employee profile is required to check in.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const existing = await DBService.getAttendanceForDate(user.companyId, employeeId, today);

    if (existing) {
      res.status(409).json({ error: 'Duplicate Check-In: Attendance has already been logged for today.' });
      return;
    }

    // Geofencing verification if coords provided
    const { lat, lng, faceVerified, notes } = req.body;
    let isGeofenced = false;
    let distanceMeters = 0;

    const company = await DBService.getCompany();
    if (lat && lng && company?.officeCoordinates) {
      // Haversine formula
      const R = 6371e3; // meters
      const phi1 = (company.officeCoordinates.lat * Math.PI) / 180;
      const phi2 = (lat * Math.PI) / 180;
      const deltaPhi = ((lat - company.officeCoordinates.lat) * Math.PI) / 180;
      const deltaLambda = ((lng - company.officeCoordinates.lng) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceMeters = Math.round(R * c);

      isGeofenced = distanceMeters <= (company.officeCoordinates.radiusMeters || 150);
    }

    const checkInTime = new Date().toISOString();
    const attendance = await DBService.recordCheckIn(user.companyId, employeeId, today, checkInTime, {
      isGeofenced,
      distanceMeters,
      faceVerified: Boolean(faceVerified),
      notes,
    });

    res.status(201).json({
      message: `Check-in recorded successfully at ${new Date(checkInTime).toLocaleTimeString()}. Status: ${attendance.status}`,
      attendance,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record check-in.', details: err.message });
  }
});

apiRouter.post('/attendance/check-out', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const employeeId = user.role === 'employee' ? user.employeeId : req.body.employeeId;

    if (!employeeId) {
      res.status(400).json({ error: 'Employee profile is required to check out.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const existing = await DBService.getAttendanceForDate(user.companyId, employeeId, today);

    if (!existing) {
      res.status(400).json({ error: 'No check-in record found for today. Please check in first.' });
      return;
    }

    const checkOutTime = new Date().toISOString();
    const updated = await DBService.recordCheckOut(existing._id, checkOutTime);

    res.json({
      message: `Check-out recorded at ${new Date(checkOutTime).toLocaleTimeString()}. Total worked hours: ${updated?.workedHours}h`,
      attendance: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record check-out.', details: err.message });
  }
});

apiRouter.get('/attendance/today', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId;
  const today = new Date().toISOString().split('T')[0];
  const attendances = await DBService.listAttendances(companyId, { date: today });
  res.json({ date: today, attendances });
});

apiRouter.get('/attendance/my', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (!user.employeeId) {
    res.status(400).json({ error: 'No employee record linked to user account.' });
    return;
  }
  const attendances = await DBService.listAttendances(user.companyId, { employeeId: user.employeeId });
  res.json({ attendances });
});

apiRouter.get('/attendance/all', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const { date, month, employeeId } = req.query as any;
  const attendances = await DBService.listAttendances(req.user!.companyId, { date, month, employeeId });
  res.json({ attendances });
});

// Attendance Corrections
apiRouter.post('/attendance/corrections', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const employeeId = user.role === 'employee' ? user.employeeId : req.body.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: 'Employee ID is required.' });
      return;
    }

    const { attendanceDate, requestedCheckIn, requestedCheckOut, reason } = req.body;
    if (!attendanceDate || !requestedCheckIn || !requestedCheckOut || !reason) {
      res.status(400).json({ error: 'All correction fields (date, in, out, reason) are required.' });
      return;
    }

    const correction = await DBService.createCorrection(user.companyId, employeeId, {
      attendanceDate,
      requestedCheckIn,
      requestedCheckOut,
      reason,
    });

    res.status(201).json({ message: 'Correction request submitted to HR for review.', correction });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit correction.', details: err.message });
  }
});

apiRouter.get('/attendance/corrections', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const filterEmpId = user.role === 'employee' ? user.employeeId : undefined;
  const corrections = await DBService.listCorrections(user.companyId, filterEmpId);
  res.json({ corrections });
});

apiRouter.post('/attendance/corrections/:id/review', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const { status, reviewComment } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    return;
  }
  const updated = await DBService.reviewCorrection(req.params.id, status, req.user!.name, reviewComment);
  res.json({ message: `Correction request ${status}.`, correction: updated });
});

// ==========================================
// 7. LEAVE MANAGEMENT
// ==========================================
apiRouter.post('/leave/apply', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const employeeId = user.role === 'employee' ? user.employeeId : req.body.employeeId;

    if (!employeeId) {
      res.status(400).json({ error: 'Employee profile is required to apply for leave.' });
      return;
    }

    const { leaveTypeId, startDate, endDate, reason } = req.body;
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      res.status(400).json({ error: 'Leave type, start date, end date, and reason are required.' });
      return;
    }

    if (startDate > endDate) {
      res.status(422).json({ error: 'Validation Error: Start date cannot be after end date.' });
      return;
    }

    const company = await DBService.getCompany();
    const holidays = await DBService.listHolidays(user.companyId);
    const weekendDays = company?.weekendDays || [0, 6];

    // Calculate actual working days excluding weekends and public holidays
    const daysCount = calculateWorkingDaysBetween(startDate, endDate, weekendDays, holidays);
    if (daysCount <= 0) {
      res.status(422).json({
        error: 'Selected date range falls entirely on weekends or public holidays (0 working days).',
      });
      return;
    }

    // Overlap validation
    const existingLeaves = await DBService.listLeaveRequests(user.companyId, employeeId);
    const activeLeaves = existingLeaves.filter((l) => l.status === 'approved' || l.status === 'pending');
    for (const l of activeLeaves) {
      if (doDatesOverlap(startDate, endDate, l.startDate, l.endDate)) {
        res.status(422).json({
          error: `Overlap Error: You already have a ${l.status} leave request from ${l.startDate} to ${l.endDate}.`,
        });
        return;
      }
    }

    // Balance validation
    const leaveTypes = await DBService.listLeaveTypes(user.companyId);
    const targetType = leaveTypes.find((lt) => lt._id === leaveTypeId);
    if (!targetType) {
      res.status(404).json({ error: 'Invalid leave type.' });
      return;
    }

    if (targetType.annualQuota > 0) {
      const usedDays = existingLeaves
        .filter((l) => l.leaveTypeId === leaveTypeId && l.status === 'approved')
        .reduce((sum, l) => sum + l.daysCount, 0);
      const remainingQuota = targetType.annualQuota - usedDays;

      if (daysCount > remainingQuota) {
        res.status(422).json({
          error: `Insufficient Balance: Requested ${daysCount} days, but only ${remainingQuota} days remain in your ${targetType.name} quota.`,
        });
        return;
      }
    }

    const leaveRequest = await DBService.createLeaveRequest(user.companyId, employeeId, {
      leaveTypeId,
      startDate,
      endDate,
      daysCount,
      reason,
    });

    res.status(201).json({
      message: `Leave application submitted for ${daysCount} working days. Awaiting HR approval.`,
      leaveRequest,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit leave application.', details: err.message });
  }
});

apiRouter.get('/leave/my', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (!user.employeeId) {
    res.status(400).json({ error: 'No employee record linked to user account.' });
    return;
  }

  const leaves = await DBService.listLeaveRequests(user.companyId, user.employeeId);
  const leaveTypes = await DBService.listLeaveTypes(user.companyId);

  // Compute balances
  const balances = leaveTypes.map((lt) => {
    const used = leaves
      .filter((l) => l.leaveTypeId === lt._id && l.status === 'approved')
      .reduce((sum, l) => sum + l.daysCount, 0);
    return {
      leaveTypeId: lt._id,
      name: lt.name,
      code: lt.code,
      annualQuota: lt.annualQuota,
      usedDays: used,
      remainingDays: lt.annualQuota > 0 ? Math.max(0, lt.annualQuota - used) : 'Unlimited',
    };
  });

  res.json({ leaves, balances });
});

apiRouter.get('/leave/all', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const leaves = await DBService.listLeaveRequests(req.user!.companyId);
  res.json({ leaves });
});

apiRouter.post('/leave/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const leaves = await DBService.listLeaveRequests(user.companyId);
  const target = leaves.find((l) => l._id === req.params.id);

  if (!target) {
    res.status(404).json({ error: 'Leave request not found.' });
    return;
  }

  if (user.role === 'employee' && target.employeeId !== user.employeeId) {
    res.status(403).json({ error: 'You can only cancel your own leave requests.' });
    return;
  }

  if (target.status !== 'pending') {
    res.status(400).json({ error: 'Only pending leave requests can be cancelled.' });
    return;
  }

  const updated = await DBService.updateLeaveStatus(target._id, 'cancelled');
  res.json({ message: 'Leave request cancelled successfully.', leaveRequest: updated });
});

apiRouter.post('/leave/:id/review', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const { status, reviewComment } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    return;
  }

  const updated = await DBService.updateLeaveStatus(req.params.id, status, req.user!.name, reviewComment);

  // In-app notification to employee
  if (updated) {
    const allUsers = await DBService.listUsers(req.user!.companyId);
    const empUser = allUsers.find((u) => u.employeeId === updated.employeeId);
    if (empUser) {
      await DBService.createNotification({
        companyId: req.user!.companyId,
        recipientUserId: empUser._id,
        title: `Leave Request ${status.toUpperCase()}`,
        message: `Your leave request for ${updated.startDate} to ${updated.endDate} (${updated.daysCount} days) was ${status}. ${reviewComment ? `Note: "${reviewComment}"` : ''}`,
        type: 'leave',
      });
    }
  }

  res.json({ message: `Leave request has been ${status}.`, leaveRequest: updated });
});

// ==========================================
// 8. PAYROLL LITE (Calculations, Draft, Finalize, Payslip)
// ==========================================
apiRouter.get('/payroll/runs', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const runs = await DBService.listPayrollRuns(req.user!.companyId);
  res.json({ runs });
});

apiRouter.post('/payroll/generate-draft', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  try {
    const { month } = req.body; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: 'Valid payroll month in YYYY-MM format is required.' });
      return;
    }

    const companyId = req.user!.companyId;
    const existingRun = await DBService.getPayrollRun(companyId, month);
    if (existingRun && existingRun.status === 'finalized') {
      res.status(422).json({ error: `Payroll for ${month} is already finalized and cannot be modified.` });
      return;
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;

    const company = await DBService.getCompany();
    const holidays = await DBService.listHolidays(companyId);
    const workingDays = getWorkingDaysInMonth(year, monthIndex, company?.weekendDays || [0, 6], holidays);

    const employees = await DBService.listEmployees(companyId);
    const activeEmps = employees.filter((e) => e.employmentStatus !== 'Terminated');

    if (activeEmps.length === 0) {
      res.status(400).json({ error: 'No active employees found to generate payroll.' });
      return;
    }

    // Fetch month's attendances and leaves
    const monthAttendances = await DBService.listAttendances(companyId, { month });
    const monthLeaves = await DBService.listLeaveRequests(companyId);
    const unpaidLeaves = monthLeaves.filter((l) => l.status === 'approved');

    const draftPayslips = [];
    let runTotalGross = 0;
    let runTotalNet = 0;
    let runTotalTax = 0;
    let runTotalDeductions = 0;

    for (const emp of activeEmps) {
      const basic = emp.basicSalary;
      const hra = emp.hra;
      const medical = emp.medicalAllowance;
      const gross = emp.grossSalary;

      const perDayGross = Math.round((gross / workingDays) * 100) / 100;

      // Employee attendance records for month
      const empAtt = monthAttendances.filter((a) => a.employeeId === emp._id);
      const presentCount = empAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
      const halfDayCount = empAtt.filter((a) => a.status === 'half_day').length;

      // Compute absent days: workingDays - presentDays - halfDayCount - approvedLeaves
      // (For employees who joined mid-month or missed days)
      const empLeaves = unpaidLeaves.filter(
        (l) => l.employeeId === emp._id && l.startDate.startsWith(month)
      );
      const leaveDays = empLeaves.reduce((sum, l) => sum + l.daysCount, 0);

      const accountedDays = presentCount + halfDayCount + leaveDays;
      const absentDays = Math.max(0, workingDays - accountedDays);

      // Deductions
      const absentDeduction = Math.round(absentDays * perDayGross);
      const halfDayDeduction = Math.round(halfDayCount * 0.5 * perDayGross);
      const unpaidLeaveDeduction = 0; // If any unpaid leave type

      const totalAttendanceDeductions = absentDeduction + halfDayDeduction + unpaidLeaveDeduction;

      // Tax computation: Annualized Gross
      const annualGross = gross * 12;
      const taxBreakdown = calculateAnnualTax(annualGross);
      const monthlyTax = taxBreakdown.monthlyTax;

      const netSalary = Math.max(0, gross - totalAttendanceDeductions - monthlyTax);

      runTotalGross += gross;
      runTotalNet += netSalary;
      runTotalTax += monthlyTax;
      runTotalDeductions += totalAttendanceDeductions;

      draftPayslips.push({
        companyId,
        payrollRunId: existingRun?._id || 'temp',
        employeeId: emp._id,
        month,
        workingDays,
        presentDays: presentCount,
        absentDays,
        halfDays: halfDayCount,
        unpaidLeaveDays: 0,
        basicSalary: basic,
        hra,
        medicalAllowance: medical,
        grossSalary: gross,
        perDayGross,
        absentDeduction,
        unpaidLeaveDeduction,
        halfDayDeduction,
        totalDeductions: totalAttendanceDeductions,
        taxableIncomeAnnual: annualGross,
        annualTax: taxBreakdown.annualTax,
        monthlyTax,
        netSalary,
        isFinalized: false,
      });
    }

    let run = existingRun;
    if (!run) {
      run = await DBService.createPayrollRun({
        companyId,
        month,
        totalGross: runTotalGross,
        totalNet: runTotalNet,
        totalTax: runTotalTax,
        totalDeductions: runTotalDeductions,
        status: 'draft',
        preparedBy: req.user!.name,
      });
    }

    // Attach run ID to slips and persist
    draftPayslips.forEach((ps) => (ps.payrollRunId = run!._id));
    await DBService.savePayslips(draftPayslips);

    await DBService.logAudit({
      companyId,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'GENERATE_PAYROLL_DRAFT',
      entity: 'PayrollRun',
      entityId: run._id,
      afterState: { month, totalGross: runTotalGross, employeeCount: activeEmps.length },
      ipAddress: req.ip,
    });

    res.json({
      message: `Payroll draft prepared for ${month} (${activeEmps.length} employees).`,
      payrollRun: run,
      payslipsCount: draftPayslips.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate payroll draft.', details: err.message });
  }
});

apiRouter.post('/payroll/runs/:id/finalize', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const run = await DBService.finalizePayrollRun(req.params.id, req.user!.name);
    if (!run) {
      res.status(404).json({ error: 'Payroll run not found.' });
      return;
    }

    await DBService.logAudit({
      companyId: req.user!.companyId,
      actorId: req.user!._id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      action: 'FINALIZE_PAYROLL_RUN',
      entity: 'PayrollRun',
      entityId: run._id,
      afterState: { month: run.month, status: 'finalized', finalizedBy: req.user!.name },
      ipAddress: req.ip,
    });

    // Notify all active employees that payslips are ready
    const employees = await DBService.listEmployees(req.user!.companyId);
    const users = await DBService.listUsers(req.user!.companyId);
    for (const u of users) {
      if (u.employeeId) {
        await DBService.createNotification({
          companyId: req.user!.companyId,
          recipientUserId: u._id,
          title: `Payslip Available (${run.month})`,
          message: `Your payslip for ${run.month} is now finalized and available for download.`,
          type: 'payroll',
        });
      }
    }

    res.json({ message: `Payroll run for ${run.month} is now finalized and locked.`, payrollRun: run });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to finalize payroll.', details: err.message });
  }
});

apiRouter.get('/payroll/runs/:month/payslips', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const month = req.params.month;

  const filters: any = { month };
  if (user.role === 'employee') {
    filters.employeeId = user.employeeId;
  }

  const payslips = await DBService.listPayslips(user.companyId, filters);
  res.json({ payslips });
});

apiRouter.get('/payroll/my-payslips', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (!user.employeeId) {
    res.status(400).json({ error: 'No employee record linked to user account.' });
    return;
  }
  const payslips = await DBService.listPayslips(user.companyId, { employeeId: user.employeeId });
  res.json({ payslips });
});

// ==========================================
// 9. DASHBOARDS & ANALYTICS (Server-Side Aggregations)
// ==========================================
apiRouter.get('/analytics/admin', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId;

  // Execute database queries in parallel for instant response
  const [employees, departments, auditLogs, payrollRuns] = await Promise.all([
    DBService.listEmployees(companyId),
    DBService.listDepartments(companyId),
    DBService.listAuditLogs(companyId, 10),
    DBService.listPayrollRuns(companyId),
  ]);

  const active = employees.filter((e) => e.employmentStatus === 'Active');
  const probationary = employees.filter((e) => e.employmentStatus === 'Probationary');
  const terminated = employees.filter((e) => e.employmentStatus === 'Terminated');
  const headcount = active.length + probationary.length;

  // Attrition rate
  const attritionRate = headcount > 0 ? Math.round((terminated.length / (headcount + terminated.length)) * 100 * 10) / 10 : 0;

  // Total payroll cost & average salary
  const totalPayrollCost = active.reduce((sum, e) => sum + e.grossSalary, 0);
  const avgSalary = headcount > 0 ? Math.round(totalPayrollCost / headcount) : 0;

  // Headcount and payroll cost by department
  const deptBreakdown = departments.map((d) => {
    const dEmps = employees.filter((e) => e.departmentId === d._id && e.employmentStatus !== 'Terminated');
    const dGross = dEmps.reduce((sum, e) => sum + e.grossSalary, 0);
    return {
      departmentId: d._id,
      name: d.name,
      code: d.code,
      headcount: dEmps.length,
      totalPayroll: dGross,
      avgSalary: dEmps.length > 0 ? Math.round(dGross / dEmps.length) : 0,
    };
  });

  const kpis = {
    headcount,
    activeHeadcount: active.length,
    probationaryHeadcount: probationary.length,
    attritionRate,
    totalMonthlyPayroll: totalPayrollCost,
    averageSalary: avgSalary,
    departmentCount: departments.length,
  };

  // Immediate cached or fast deterministic analytical insights
  const aiSummary = await AIService.generateDashboardSummary(kpis);

  res.json({
    kpis,
    deptBreakdown,
    recentAuditLogs: auditLogs,
    payrollRuns: payrollRuns.slice(0, 5),
    aiSummary,
  });
});

apiRouter.get('/analytics/hr', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId;
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);

  // Execute all HR queries concurrently in parallel
  const [employees, attendances, leaves, corrections, monthAtt] = await Promise.all([
    DBService.listEmployees(companyId),
    DBService.listAttendances(companyId, { date: today }),
    DBService.listLeaveRequests(companyId),
    DBService.listCorrections(companyId),
    DBService.listAttendances(companyId, { month: currentMonth }),
  ]);

  const activeEmps = employees.filter((e) => e.employmentStatus !== 'Terminated');
  const presentToday = attendances.filter((a) => a.status === 'present').length;
  const lateToday = attendances.filter((a) => a.status === 'late').length;
  const halfDayToday = attendances.filter((a) => a.status === 'half_day').length;

  const onLeaveToday = leaves.filter(
    (l) => l.status === 'approved' && l.startDate <= today && l.endDate >= today
  ).length;

  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;
  const pendingCorrections = corrections.filter((c) => c.status === 'pending').length;
  const pendingApprovals = pendingLeaves + pendingCorrections;

  // Top late-comers this month
  const lateCounts: Record<string, number> = {};
  monthAtt.filter((a) => a.status === 'late').forEach((a) => {
    lateCounts[a.employeeId] = (lateCounts[a.employeeId] || 0) + 1;
  });

  const empMap = new Map(employees.map((e) => [e._id, `${e.firstName} ${e.lastName} (${e.employeeCode})`]));
  const topLateComers = Object.entries(lateCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([empId, count]) => ({
      employee: empMap.get(empId) || empId,
      lateCount: count,
    }));

  const kpis = {
    headcount: activeEmps.length,
    presentToday,
    lateToday,
    halfDayToday,
    onLeaveToday,
    pendingApprovals,
    pendingLeaves,
    pendingCorrections,
  };

  // Immediate cached or fast deterministic analytical insights
  const aiSummary = await AIService.generateDashboardSummary(kpis);

  res.json({
    kpis,
    topLateComers,
    aiSummary,
  });
});

apiRouter.get('/analytics/employee', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (!user.employeeId) {
    const announcements = await DBService.listAnnouncements(user.companyId);
    res.json({
      todayAttendance: null,
      hoursThisWeek: 0,
      lateCountMonth: 0,
      leaveBalances: [],
      lastPayslip: null,
      announcements: announcements.slice(0, 5),
    });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);

  // Parallelize all 6 employee metrics queries
  const [todayAttendance, monthAtt, leaves, leaveTypes, payslips, announcements] = await Promise.all([
    DBService.getAttendanceForDate(user.companyId, user.employeeId, today),
    DBService.listAttendances(user.companyId, { employeeId: user.employeeId, month: currentMonth }),
    DBService.listLeaveRequests(user.companyId, user.employeeId),
    DBService.listLeaveTypes(user.companyId),
    DBService.listPayslips(user.companyId, { employeeId: user.employeeId }),
    DBService.listAnnouncements(user.companyId),
  ]);

  const lateCountMonth = monthAtt.filter((a) => a.status === 'late').length;

  // Hours worked this week
  const hoursThisWeek = monthAtt.slice(0, 7).reduce((sum, a) => sum + (a.workedHours || 0), 0);

  // Leave balances
  const leaveBalances = leaveTypes.map((lt) => {
    const used = leaves
      .filter((l) => l.leaveTypeId === lt._id && l.status === 'approved')
      .reduce((sum, l) => sum + l.daysCount, 0);
    return {
      name: lt.name,
      code: lt.code,
      annualQuota: lt.annualQuota,
      usedDays: used,
      remaining: lt.annualQuota > 0 ? Math.max(0, lt.annualQuota - used) : 'Unlimited',
    };
  });

  const lastPayslip = payslips.length > 0 ? payslips[payslips.length - 1] : null;

  res.json({
    todayAttendance,
    hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    lateCountMonth,
    leaveBalances,
    lastPayslip,
    announcements: announcements.slice(0, 5),
  });
});

// Dedicated on-demand background refresh for AI executive briefing
apiRouter.post('/analytics/ai-summary', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  try {
    const { kpis, forceRefresh } = req.body;
    if (!kpis) {
      res.status(400).json({ error: 'KPI payload required.' });
      return;
    }
    const summary = await AIService.generateDashboardSummary(kpis, Boolean(forceRefresh));
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate AI summary', details: err.message });
  }
});

// ==========================================
// 10. AI ASSISTANT (Chat with 7 Tools, Smart Leave, Summaries)
// ==========================================
apiRouter.post('/ai/chat', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const result = await AIService.chat(req.user!, prompt);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'AI processing failed.', details: err.message });
  }
});

apiRouter.post('/ai/parse-leave', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Natural language text is required.' });
      return;
    }
    const leaveTypes = await DBService.listLeaveTypes(req.user!.companyId);
    const parsed = await AIService.parseSmartLeave(text, leaveTypes);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Smart leave parsing failed.', details: err.message });
  }
});

apiRouter.get('/ai/logs', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const logs = await DBService.listAILogs(req.user!.companyId);
  res.json({ logs });
});

// ==========================================
// 11. COMMUNICATIONS & AUDIT
// ==========================================
apiRouter.get('/announcements', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const announcements = await DBService.listAnnouncements(req.user!.companyId);
  res.json({ announcements });
});

apiRouter.post('/announcements', authenticateToken, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res) => {
  try {
    const { title, content, priority } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required.' });
      return;
    }

    const announcement = await DBService.createAnnouncement({
      companyId: req.user!.companyId,
      title: title.trim(),
      content: content.trim(),
      priority: priority || 'normal',
      postedBy: req.user!._id,
      postedByName: req.user!.name,
    });

    res.status(201).json({ announcement });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create announcement.', details: err.message });
  }
});

apiRouter.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const notifications = await DBService.listNotifications(req.user!.companyId, req.user!._id);
  res.json({ notifications });
});

apiRouter.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  await DBService.markNotificationRead(req.params.id);
  res.json({ message: 'Marked as read.' });
});

apiRouter.get('/audit', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const logs = await DBService.listAuditLogs(req.user!.companyId);
  res.json({ logs });
});

// ==========================================
// 12. OPTIONAL DEMO SEED (Fictional Data)
// ==========================================
apiRouter.post('/demo/seed', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  const result = await DBService.seedDemoData(req.user!.companyId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json(result);
});
