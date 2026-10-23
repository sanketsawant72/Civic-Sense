import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { getUserHomePath, useAuthStore } from './store/useAuthStore';
import { useStore }     from './store/useStore';
import AppShell         from './components/layout/AppShell';

// ── Auth pages (no shell) ────────────────────────────────────────────────────
import Login    from './pages/Login';
import Register from './pages/Register';

// ── Citizen pages ────────────────────────────────────────────────────────────
import Home           from './pages/Home';
import ReportIssue    from './pages/ReportIssue';
import MyComplaints   from './pages/MyComplaints';
import CommunityMap   from './pages/CommunityMap';
import TrackComplaint from './pages/TrackComplaint';

// ── Admin pages ───────────────────────────────────────────────────────────────
import Dashboard          from './pages/admin/Dashboard';
import ManageComplaints   from './pages/admin/ManageComplaints';
import MapOverview        from './pages/admin/MapOverview';
import ManageDepartments  from './pages/admin/ManageDepartments';

// ── Department pages ──────────────────────────────────────────────────────────
import DeptDashboard   from './pages/department/DeptDashboard';
import DeptComplaints  from './pages/department/DeptComplaints';

// ── ProtectedRoute ────────────────────────────────────────────────────────────
/**
 * Wraps a route with auth + optional role check.
 *   <ProtectedRoute roles={['admin']}> → only admins, others → /login
 *   <ProtectedRoute>                  → any authenticated user
 */
function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthStore();
  const location        = useLocation();

  if (!token || !user) {
    // Not logged in — redirect to login, remember where we came from
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Logged in but wrong role — send to their home
    return <Navigate to={getUserHomePath(user)} replace />;
  }

  return children;
}

// ── AuthRedirect ──────────────────────────────────────────────────────────────
// If already logged in, redirect away from /login and /register
function AuthRedirect({ children }) {
  const { token, user } = useAuthStore();
  if (token && user) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }
  return children;
}

function DepartmentCategoryRoute({ children }) {
  const { category } = useParams();
  const user = useAuthStore((s) => s.user);

  if (category !== user?.departmentCategory) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }

  return children;
}

function DepartmentRedirect({ complaints = false }) {
  const user = useAuthStore((s) => s.user);
  const destination = `${getUserHomePath(user)}${complaints ? '/complaints' : ''}`;
  return <Navigate to={destination} replace />;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Runs once on mount: health check + load complaints (token already in store)
function AppInit() {
  const { checkApi, loadComplaints } = useStore();
  const { token }                    = useAuthStore();

  useEffect(() => {
    checkApi().then((online) => {
      if (online && token) loadComplaints();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>

        {/* ── Public auth routes (no AppShell) ── */}
        <Route path="/login"    element={<AuthRedirect><Login    /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />

        {/* ── All authenticated routes share AppShell ── */}
        <Route element={<AppShell />}>

          {/* ── Citizen ── */}
          <Route path="/" element={
            <ProtectedRoute roles={['citizen']}>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/report" element={
            <ProtectedRoute roles={['citizen']}>
              <ReportIssue />
            </ProtectedRoute>
          } />
          <Route path="/my-complaints" element={
            <ProtectedRoute roles={['citizen']}>
              <MyComplaints />
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute roles={['citizen']}>
              <CommunityMap />
            </ProtectedRoute>
          } />
          <Route path="/track" element={
            <ProtectedRoute roles={['citizen']}>
              <TrackComplaint />
            </ProtectedRoute>
          } />

          {/* ── Admin ── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/manage" element={
            <ProtectedRoute roles={['admin']}>
              <ManageComplaints />
            </ProtectedRoute>
          } />
          <Route path="/admin/map" element={
            <ProtectedRoute roles={['admin']}>
              <MapOverview />
            </ProtectedRoute>
          } />
          <Route path="/admin/departments" element={
            <ProtectedRoute roles={['admin']}>
              <ManageDepartments />
            </ProtectedRoute>
          } />

          {/* ── Department ── */}
          <Route path="/department" element={
            <ProtectedRoute roles={['department']}>
              <DepartmentRedirect />
            </ProtectedRoute>
          } />
          <Route path="/department/complaints" element={
            <ProtectedRoute roles={['department']}>
              <DepartmentRedirect complaints />
            </ProtectedRoute>
          } />
          <Route path="/department/:category" element={
            <ProtectedRoute roles={['department']}>
              <DepartmentCategoryRoute><DeptDashboard /></DepartmentCategoryRoute>
            </ProtectedRoute>
          } />
          <Route path="/department/:category/complaints" element={
            <ProtectedRoute roles={['department']}>
              <DepartmentCategoryRoute><DeptComplaints /></DepartmentCategoryRoute>
            </ProtectedRoute>
          } />

          {/* ── Wildcard ── */}
          <Route path="*" element={<NotFound />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2 style={{ color: 'var(--text-h)' }}>Page not found</h2>
      <p style={{ color: 'var(--text)' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
      <a href="/" style={{ color: 'var(--navy)', fontWeight: 600 }}>Go home →</a>
    </div>
  );
}
