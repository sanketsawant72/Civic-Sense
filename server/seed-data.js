// Shared demo seed data — used by routes/complaints.js (POST /seed)
// and seed.js (standalone CLI script).

const NOW = Date.now();
const DAY = 86_400_000;

export const DEMO_SEED = [
  {
    title: 'Large pothole on Main Road near bus stand',
    description: 'There is a dangerous large pothole causing accidents near the bus stand.',
    category: 'pothole', priority: 'High', status: 'In Progress',
    lat: 16.9341, lng: 74.4181, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 5 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 5 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 4 * DAY, note: 'Assigned to PWD inspector.' },
      { status: 'In Progress',  at: NOW - 2 * DAY, note: 'Repair crew dispatched.' },
    ],
  },
  {
    title: 'Overflowing garbage bin near market',
    description: 'Garbage bin near the vegetable market has been overflowing for 3 days, causing stink.',
    category: 'garbage', priority: 'Medium', status: 'Assigned',
    lat: 16.9320, lng: 74.4155, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 3 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 3 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 2 * DAY, note: 'Sanitation team notified.' },
      { status: 'Assigned',     at: NOW - 1 * DAY, note: 'Worker assigned for collection.' },
    ],
  },
  {
    title: 'Blocked drain causing stagnant water',
    description: 'The drain on Gandhi Nagar road is completely blocked, water stagnant for days.',
    category: 'drainage', priority: 'Medium', status: 'Under Review',
    lat: 16.9355, lng: 74.4195, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 2 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 2 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 1 * DAY, note: 'Drainage dept notified.' },
    ],
  },
  {
    title: 'Water pipe burst on Shivaji Chowk',
    description: 'Burst pipe leaking water on Shivaji Chowk, wasting large amounts of water.',
    category: 'water', priority: 'High', status: 'Resolved',
    lat: 16.9308, lng: 74.4170, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 8 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 8 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 7 * DAY, note: 'Water supply team alerted.' },
      { status: 'Assigned',     at: NOW - 6 * DAY, note: 'Plumber team assigned.' },
      { status: 'In Progress',  at: NOW - 5 * DAY, note: 'Repair in progress.' },
      { status: 'Resolved',     at: NOW - 4 * DAY, note: 'Pipe repaired successfully.' },
    ],
  },
  {
    title: 'Street light not working for 2 weeks',
    description: 'Three streetlights on the road near school have been dark for 2 weeks, unsafe at night.',
    category: 'streetlight', priority: 'Low', status: 'Submitted',
    lat: 16.9370, lng: 74.4140, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 1 * DAY,
    timeline: [
      { status: 'Submitted', at: NOW - 1 * DAY, note: 'Complaint registered.' },
    ],
  },
  {
    title: 'Illegal construction blocking footpath',
    description: 'Shop owner has extended shop illegally, completely blocking the footpath on MG Road.',
    category: 'construction', priority: 'Medium', status: 'Under Review',
    lat: 16.9330, lng: 74.4210, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 4 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 4 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 3 * DAY, note: 'Town Planning inspector assigned.' },
    ],
  },
  {
    title: 'Live wire hanging near bus stop — URGENT',
    description: 'Exposed live wire is hanging dangerously near the main bus stop. Risk of electrocution!',
    category: 'streetlight', priority: 'Critical', status: 'In Progress',
    lat: 16.9345, lng: 74.4165, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 6 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 6 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 6 * DAY, note: 'Escalated to electrical dept.' },
      { status: 'Assigned',     at: NOW - 5 * DAY, note: 'Electrical team assigned.' },
      { status: 'In Progress',  at: NOW - 4 * DAY, note: 'Team working on safe removal.' },
    ],
  },
  {
    title: 'Garbage dumped near river bank',
    description: 'Large amount of garbage has been illegally dumped near the river, causing pollution.',
    category: 'garbage', priority: 'Low', status: 'Rejected',
    lat: 16.9290, lng: 74.4200, photo: null, submittedBy: 'citizen',
    submittedAt: NOW - 10 * DAY,
    timeline: [
      { status: 'Submitted',    at: NOW - 10 * DAY, note: 'Complaint registered.' },
      { status: 'Under Review', at: NOW - 9  * DAY, note: 'Under investigation.' },
      { status: 'Rejected',     at: NOW - 7  * DAY, note: 'Location outside municipal limits.' },
    ],
  },
];
