import { HIGH_SEV_KW, MED_SEV_KW, CATEGORIES } from '../data/constants';

// ── Priority from text ────────────────────────────────────────────────────────
export function detectPriority(text = '') {
  const lower = text.toLowerCase();
  if (HIGH_SEV_KW.some((kw) => lower.includes(kw))) return 'High';
  if (MED_SEV_KW.some((kw) => lower.includes(kw))) return 'Medium';
  return 'Low';
}

// ── Category from text ────────────────────────────────────────────────────────
export function detectCategory(text = '', categories = []) {
  const lower = text.toLowerCase();
  for (const cat of categories) {
    if (cat.kw.some((kw) => lower.includes(kw))) return cat.id;
  }
  return 'other';
}

// ── Urgency level (3-tier, separate from priority) ────────────────────────────
// Normal | Urgent | Critical
const CRITICAL_KW = [
  'accident', 'fire', 'collapse', 'collapsed', 'electrocution',
  'live wire', 'exposed wire', 'sinkhole', 'flooding', 'flooded',
  'injury', 'death', 'dangerous', 'emergency',
];
const URGENT_KW = [
  'urgent', 'asap', 'immediate', 'broken', 'blocked', 'overflowing',
  'leaking', 'burst', 'dark', 'unsafe', 'deep', 'large', 'severe',
  'days', 'weeks', 'months',
];

export function detectUrgency(text = '') {
  const lower = text.toLowerCase();
  if (CRITICAL_KW.some((kw) => lower.includes(kw))) return 'Critical';
  if (URGENT_KW.some((kw)   => lower.includes(kw))) return 'Urgent';
  return 'Normal';
}

// ── Combined analysis — returns { category, priority, urgency, confidence } ───
export function analyzeComplaint(title = '', desc = '', selectedCategory = '') {
  const combined  = `${title} ${desc}`;
  const category  = selectedCategory || detectCategory(combined, CATEGORIES);
  const priority  = detectPriority(combined);
  const urgency   = detectUrgency(combined);

  // Bump priority if category is inherently high-risk (electrical, structural)
  const highRiskCats = ['streetlight', 'drainage'];
  const effectivePriority =
    highRiskCats.includes(category) && priority === 'Low' ? 'Medium' : priority;

  // Confidence: how many signals matched
  const lower = combined.toLowerCase();
  const kwHits = [...HIGH_SEV_KW, ...URGENT_KW].filter((kw) => lower.includes(kw)).length;
  const confidence = kwHits >= 3 ? 'high' : kwHits >= 1 ? 'medium' : 'low';

  return { category, priority: effectivePriority, urgency, confidence };
}
