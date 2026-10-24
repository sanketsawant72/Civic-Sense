import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import { ADMIN_ACCOUNT, DEPARTMENT_ACCOUNTS } from './department-accounts.js';

const MONGO = process.env.PRODUCTION_MONGO_URI;
const PASSWORD_ENV = {
  admin: 'CIVICSENSE_ADMIN_PASSWORD',
  pwd: 'CIVICSENSE_PWD_PASSWORD',
  sanitation: 'CIVICSENSE_SANITATION_PASSWORD',
  drainage: 'CIVICSENSE_DRAINAGE_PASSWORD',
  water: 'CIVICSENSE_WATER_PASSWORD',
  electrical: 'CIVICSENSE_ELECTRICAL_PASSWORD',
  planning: 'CIVICSENSE_PLANNING_PASSWORD',
  general: 'CIVICSENSE_GENERAL_PASSWORD',
};

function validateConfig() {
  if (!MONGO) {
    throw new Error('Set PRODUCTION_MONGO_URI to your MongoDB Atlas connection URI.');
  }

  let parsed;
  try {
    parsed = new URL(MONGO);
  } catch {
    throw new Error('PRODUCTION_MONGO_URI is not a valid MongoDB Atlas URI.');
  }

  if (parsed.protocol !== 'mongodb+srv:' || !parsed.hostname.endsWith('.mongodb.net')) {
    throw new Error('Production account setup only accepts a MongoDB Atlas mongodb+srv URI.');
  }

  const passwords = Object.entries(PASSWORD_ENV).map(([account, envName]) => {
    const password = process.env[envName];
    if (!password || password.length < 12) {
      throw new Error(`${envName} must be set and contain at least 12 characters.`);
    }
    return [account, password];
  });

  if (new Set(passwords.map(([, password]) => password)).size !== passwords.length) {
    throw new Error('Use a different password for every production account.');
  }

  return Object.fromEntries(passwords);
}

async function createIfMissing({ name, email, role, password }, extra = {}) {
  const normalizedEmail = email.toLowerCase();
  const existingByEmail = await User.findOne({ email: normalizedEmail });
  const existingByDepartment = extra.departmentCategory
    ? await User.findOne({ role: 'department', departmentCategory: extra.departmentCategory })
    : null;
  const existingAdmin = role === 'admin'
    ? await User.findOne({ role: 'admin' })
    : null;
  const existing = existingByEmail || existingByDepartment || existingAdmin;

  if (existing) {
    if (existing.role !== role) {
      throw new Error(`${normalizedEmail} conflicts with an existing ${existing.role} account.`);
    }
    if (
      extra.departmentCategory &&
      existing.departmentCategory !== extra.departmentCategory
    ) {
      throw new Error(`${normalizedEmail} is assigned to a different department.`);
    }
    console.log(`Already exists; left unchanged: ${existing.email}`);
    return;
  }

  await User.create({
    name,
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    active: true,
    ...extra,
  });
  console.log(`Created production account: ${normalizedEmail}`);
}

async function setupProduction() {
  const passwords = validateConfig();
  console.log('Connecting to MongoDB Atlas…');
  await mongoose.connect(MONGO);

  await createIfMissing({
    name: ADMIN_ACCOUNT.name,
    email: ADMIN_ACCOUNT.email,
    role: 'admin',
    password: passwords.admin,
  });

  for (const department of DEPARTMENT_ACCOUNTS) {
    const { category, deptName, name, email } = department;
    const passwordKey = email.split('@')[0];
    await createIfMissing(
      {
        name,
        email,
        role: 'department',
        password: passwords[passwordKey],
      },
      { departmentCategory: category, departmentName: deptName }
    );
  }

  console.log('Production accounts are ready. Existing accounts and complaints were not changed.');
}

setupProduction()
  .catch((error) => {
    console.error('Production account setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
