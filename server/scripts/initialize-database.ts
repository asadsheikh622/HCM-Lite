import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/config/database';
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
} from '../src/models';

async function run() {
  console.log('[Script] Initializing database indexes...');
  await connectDB();

  const models = [
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
  ];

  for (const model of models) {
    try {
      await model.init();
      console.log(`[Script] Initialized indexes for: ${model.modelName}`);
    } catch (err: any) {
      console.warn(`[Script] Index notice for ${model.modelName}: ${err.message}`);
    }
  }

  console.log('[Script] Database initialized with clean schema and indexes. Ready for first-run setup.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[Script] Database initialization failed:', err);
  process.exit(1);
});
