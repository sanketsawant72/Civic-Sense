import { HIGH_SEV_KW, MED_SEV_KW } from '../data/constants';

/**
 * Detect complaint priority from free-text title + description.
 * Returns 'Critical' | 'High' | 'Medium' | 'Low'
 */
export function detectPriority(text = '') {
  const lower = text.toLowerCase();
  if (HIGH_SEV_KW.some((kw) => lower.includes(kw))) return 'High';
  if (MED_SEV_KW.some((kw) => lower.includes(kw))) return 'Medium';
  return 'Low';
}

/**
 * Detect category from free-text using keyword matching.
 * Returns a category id string, defaults to 'other'.
 */
export function detectCategory(text = '', categories = []) {
  const lower = text.toLowerCase();
  for (const cat of categories) {
    if (cat.kw.some((kw) => lower.includes(kw))) return cat.id;
  }
  return 'other';
}
