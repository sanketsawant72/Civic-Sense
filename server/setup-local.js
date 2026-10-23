import './config/env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import { ADMIN_ACCOUNT, DEPARTMENT_ACCOUNTS } from './department-accounts.js';

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicsense';

function assertLocalMongo(uri) {
  let hostname;
  try {
    hostname = new URL(uri).hostname.toLowerCase();
  } catch {
    throw new Error('MONGO_URI must be a valid local MongoDB connection URI.');
  }

  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname)) {
    throw new Error('Local setup only connects to MongoDB on this computer.');
  }
}

async function ensureAccount(account, extra = {}) {
  const email = account.email.toLowerCase();
  const existingByCategory = extra.departmentCategory
    ? await User.findOne({ role: account.role, departmentCategory: extra.departmentCategory })
    : null;
  const existingByEmail = await User.findOne({ email });
  const existing = existingByCategory || existingByEmail;

  if (existing && existing.role !== account.role) {
    throw new Error(`${email} is already assigned to a ${existing.role} account.`);
  }
  if (existingByEmail && existingByEmail.id !== existing?.id) {
    throw new Error(`${email} is already assigned to another account.`);
  }

  const passwordHash = await bcrypt.hash(account.password, 12);
  if (existing) {
    existing.name = account.name;
    existing.email = email;
    existing.passwordHash = passwordHash;
    existing.active = true;
    Object.assign(existing, extra);
    await existing.save();
    console.log(`Updated local login: ${email}`);
    return;
  }

  await User.create({
    ...extra,
    name: account.name,
    email,
    passwordHash,
    role: account.role,
    active: true,
  });
  console.log(`Created local login: ${email}`);
}

async function setupLocal() {
  assertLocalMongo(MONGO);
  console.log('Connecting to local MongoDB…');
  await mongoose.connect(MONGO);

  await ensureAccount(ADMIN_ACCOUNT);
  for (const department of DEPARTMENT_ACCOUNTS) {
    const { category, deptName, ...account } = department;
    await ensureAccount(
      { ...account, role: 'department' },
      { departmentCategory: category, departmentName: deptName }
    );
  }

  console.log('Local accounts are ready. No complaint records were changed.');
}

setupLocal()
  .catch((error) => {
    console.error('Local setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
