/**
 * CivicSense — Full seed script
 *
 * Creates:
 *   1. Super-admin account
 *   2. One department account per civic category
 *   3. 8 demo complaints (linked to citizen user)
 *
 * Destructive: clears all users and complaints before creating the demo accounts.
 *
 * Usage:
 *   node server/seed.js
 */

import 'dotenv/config';
import mongoose  from 'mongoose';
import bcrypt    from 'bcryptjs';
import User      from './models/User.js';
import Complaint from './models/Complaint.js';
import { DEMO_SEED } from './seed-data.js';

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicsense';

function makeId() {
  return 'CS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Account definitions ───────────────────────────────────────────────────────
const ADMIN = {
  name:  'Super Admin',
  email: 'admin@civicsense.in',
  password: 'Admin@1234',
  role:  'admin',
};

const DEPT_ACCOUNTS = [
  { category: 'pothole',      name: 'PWD Officer',          email: 'pwd@civicsense.in',        password: 'Roads@2026Pwd',       deptName: 'Public Works Department' },
  { category: 'garbage',      name: 'Sanitation Officer',   email: 'sanitation@civicsense.in', password: 'Waste@2026Sanitation', deptName: 'Sanitation Department' },
  { category: 'drainage',     name: 'Drainage Officer',     email: 'drainage@civicsense.in',   password: 'Drain@2026Sewage',    deptName: 'Drainage & Sewage Department' },
  { category: 'water',        name: 'Water Supply Officer', email: 'water@civicsense.in',      password: 'Water@2026Supply',    deptName: 'Water Supply Department' },
  { category: 'streetlight',  name: 'Electrical Officer',   email: 'electrical@civicsense.in', password: 'Lights@2026Electric', deptName: 'Electrical Department' },
  { category: 'construction', name: 'Town Planner',         email: 'planning@civicsense.in',   password: 'Plan@2026Town',       deptName: 'Town Planning Department' },
  { category: 'other',        name: 'Admin Officer',        email: 'general@civicsense.in',    password: 'Civic@2026General',   deptName: 'General Administration' },
];

// Demo citizen — complaints will be linked to this user's _id
const CITIZEN = {
  name:  'Demo Citizen',
  email: 'citizen@civicsense.in',
  password: 'Citizen@1234',
  role:  'citizen',
};

// ── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  CivicSense Seed Script');
  console.log('─────────────────────────────────');
  console.log('Connecting to', MONGO, '…');
  await mongoose.connect(MONGO);
  console.log('✔  Connected.\n');

  // 1. Clear existing data
  await Complaint.deleteMany({});
  console.log('✔  Cleared complaints.');
  await User.deleteMany({});
  console.log('✔  Cleared users.\n');

  // 2. Create admin
  const adminHash = await bcrypt.hash(ADMIN.password, 12);
  const admin = await User.create({ ...ADMIN, passwordHash: adminHash });
  console.log(`✔  Admin:      ${admin.email}  /  ${ADMIN.password}`);

  // 3. Create citizen
  const citizenHash = await bcrypt.hash(CITIZEN.password, 12);
  const citizen = await User.create({ ...CITIZEN, passwordHash: citizenHash });
  console.log(`✔  Citizen:    ${citizen.email}  /  ${CITIZEN.password}`);

  // 4. Create department accounts
  for (const d of DEPT_ACCOUNTS) {
    const deptHash = await bcrypt.hash(d.password, 12);
    await User.create({
      name:               d.name,
      email:              d.email,
      passwordHash:       deptHash,
      role:               'department',
      departmentCategory: d.category,
      departmentName:     d.deptName,
      active:             true,
    });
    console.log(`✔  Dept [${d.category.padEnd(12)}]: ${d.email}  /  ${d.password}`);
  }

  // 5. Create complaints linked to citizen
  const docs = DEMO_SEED.map((d) => ({
    ...d,
    cid:         makeId(),
    submittedBy: citizen._id.toString(),
  }));
  const inserted = await Complaint.insertMany(docs);
  console.log(`\n✔  Seeded ${inserted.length} demo complaints.\n`);

  // 6. Summary
  console.log('─────────────────────────────────');
  console.log('Login credentials summary:');
  console.log('');
  console.log(`  ADMIN      admin@civicsense.in          Admin@1234`);
  console.log(`  CITIZEN    citizen@civicsense.in        Citizen@1234`);
  console.log('  DEPARTMENTS Use the unique credentials printed above');
  console.log('─────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✔  Done.');
}

seed().catch((err) => {
  console.error('\n✖  Seed failed:', err.message);
  process.exit(1);
});
