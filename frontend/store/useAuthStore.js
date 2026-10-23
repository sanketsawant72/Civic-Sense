import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * useAuthStore — manages JWT token + current user.
 *
 * Persisted to localStorage under 'civicsense-auth'.
 * The token is injected into every API request by api.js.
 *
 * Roles:  'admin' | 'department' | 'citizen'
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,   // JWT string
      user:  null,   // { id, name, email, role, departmentCategory, departmentName }

      // ── Derived helpers ────────────────────────────────────────────────
      isAuthenticated: () => !!get().token,
      isAdmin:         () => get().user?.role === 'admin',
      isDepartment:    () => get().user?.role === 'department',
      isCitizen:       () => get().user?.role === 'citizen',

      // ── Called by Login / Register after a successful API response ─────
      setAuth: ({ token, user }) => set({ token, user }),

      // ── Clear everything — called on logout or 401 ─────────────────────
      clearAuth: () => set({ token: null, user: null }),

      // ── Patch user fields in-place (e.g. after profile update) ─────────
      patchUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
    }),
    {
      name: 'civicsense-auth',
      // Only persist token + user — everything else is derived
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
