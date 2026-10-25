import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/database';
import { DBService } from '../src/services/db.service';
import { ENV } from '../src/config/env';

async function run() {
  console.log('[Script] Starting Admin Bootstrap...');
  await connectDB();

  const company = await DBService.getCompany();
  let companyId = company?._id;

  if (!company) {
    console.log('[Script] Creating initial company settings...');
    const newCompany = await DBService.createCompany({
      name: 'HCM Enterprise Corp',
      code: 'HCM',
      officeStartTime: '09:00',
      graceMinutes: 15,
      weekendDays: [0, 6],
    });
    companyId = newCompany._id;
    await DBService.seedDefaultLeaveTypes(companyId);
  }

  const superAdminCount = await DBService.countUsersByRole('admin');
  if (superAdminCount > 0) {
    console.log('[Script] Super Admin already exists. No action taken.');
    process.exit(0);
  }

  const targetEmail = ENV.INITIAL_ADMIN_EMAIL;
  const targetPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const passwordHash = await bcrypt.hash(targetPassword, 10);

  const admin = await DBService.createUser({
    companyId: companyId!,
    name: 'Super Admin',
    email: targetEmail,
    passwordHash,
    role: 'admin',
    mustChangePassword: false,
    isActive: true,
  });

  console.log(`[Script] Successfully bootstrapped Super Admin: ${admin.email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[Script] Bootstrap failed:', err);
  process.exit(1);
});
