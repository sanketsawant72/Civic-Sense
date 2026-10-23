import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CATEGORIES, STATUSES } from '../data/constants';
import {
  fetchComplaints,
  createComplaint,
  patchStatus,
  patchPriority,
  seedComplaints,
  checkHealth,
} from '../utils/api.js';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── UI state ────────────────────────────────────────────────────────
      complaints: [],
      lang:       'en',
      role:       'citizen',   // 'citizen' | 'admin'

      // ── Async state ─────────────────────────────────────────────────────
      loading:   false,
      error:     null,
      apiOnline: null,  // null = unknown, true | false after health check

      // ── Language / role ─────────────────────────────────────────────────
      setLang: (lang) => set({ lang }),
      setRole: (role) => set({ role }),
      clearError: ()  => set({ error: null }),

      // ── Health check ────────────────────────────────────────────────────
      checkApi: async () => {
        const ok = await checkHealth();
        set({ apiOnline: ok });
        return ok;
      },

      // ── Load all complaints from API ─────────────────────────────────────
      loadComplaints: async (filters = {}) => {
        set({ loading: true, error: null });
        try {
          const data = await fetchComplaints(filters);
          set({ complaints: data, loading: false });
        } catch (err) {
          set({ loading: false, error: err.message });
        }
      },

      // ── Submit a new complaint ───────────────────────────────────────────
      addComplaint: async (payload) => {
        set({ loading: true, error: null });
        try {
          const created = await createComplaint(payload);
          // Prepend to local list so UI updates instantly
          set((s) => ({ complaints: [created, ...s.complaints], loading: false }));
          return created;
        } catch (err) {
          set({ loading: false, error: err.message });
          throw err;   // let the form surface it
        }
      },

      // ── Update status ────────────────────────────────────────────────────
      updateStatus: async (id, status, note = '') => {
        try {
          const updated = await patchStatus(id, status, note);
          set((s) => ({
            complaints: s.complaints.map((c) => (c.id === id ? updated : c)),
          }));
        } catch (err) {
          set({ error: err.message });
        }
      },

      // ── Update priority ──────────────────────────────────────────────────
      updatePriority: async (id, priority) => {
        try {
          const updated = await patchPriority(id, priority);
          set((s) => ({
            complaints: s.complaints.map((c) => (c.id === id ? updated : c)),
          }));
        } catch (err) {
          set({ error: err.message });
        }
      },

      // ── Reset to demo data (calls /api/complaints/seed) ──────────────────
      resetData: async () => {
        set({ loading: true, error: null });
        try {
          await seedComplaints();
          await get().loadComplaints();
        } catch (err) {
          set({ loading: false, error: err.message });
        }
      },

      // ── Computed selectors ───────────────────────────────────────────────
      getStats: () => {
        const { complaints } = get();
        const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
        const byStatus   = Object.fromEntries(STATUSES.map((s)   => [s,    0]));
        for (const c of complaints) {
          if (c.category in byCategory) byCategory[c.category]++;
          if (c.status   in byStatus)   byStatus[c.status]++;
        }
        return { total: complaints.length, byCategory, byStatus };
      },
    }),
    {
      name: 'civicsense-ui',
      // Only persist UI preferences — data always comes fresh from the API
      partialize: (state) => ({ lang: state.lang, role: state.role }),
    }
  )
);
