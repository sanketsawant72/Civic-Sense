import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useStore }     from './store/useStore';
import AppShell         from './components/layout/AppShell';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const ReportIssue = lazy(() => import('./pages/ReportIssue'));
const MyComplaints = lazy(() => import('./pages/MyComplaints'));
const CommunityMap = lazy(() => import('./pages/CommunityMap'));
const TrackComplaint = lazy(() => import('./pages/TrackComplaint'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ManageComplaints = lazy(() => import('./pages/admin/ManageComplaints'));
const MapOverview = lazy(() => import('./pages/admin/MapOverview'));
const ManageDepartments = lazy(() => import('./pages/admin/ManageDepartments'));
const DeptDashboard = lazy(() => import('./pages/department/DeptDashboard'));
const DeptComplaints = lazy(() => import('./pages/department/DeptComplaints'));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Redirect authenticated users away from public pages to their home. */
function AuthRedirect({ children }) {
  const { token, user } = useAuthStore();
  if (token && user) {
    const home = user.role === 'admin'      ? '/admin'
               : user.role === 'department' ? '/department'
               : '/';
    return <Navigate to={home} replace />;
  }
  return children;
}

/**
 * Guard a route by role.
 * - Not logged in  → /landing
 * - Wrong role     → their own home
 */
function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthStore();
  const location        = useLocation();

  if (!token || !user) {
    return <Navigate to="/landing" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    const home = user.role === 'admin'      ? '/admin'
               : user.role === 'department' ? '/department'
               : '/';
    return <Navigate to={home} replace />;
  }
  return children;
}

/** Check API status and load complaints concurrently to avoid sequential wait. */
function AppInit() {
  const { checkApi, loadComplaints } = useStore();
  const { token }                    = useAuthStore();
  useEffect(() => {
    checkApi();
    if (token) loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}>
        <Routes>

        {/* ── Default: redirect root → landing ── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Public (no AppShell) ── */}
        <Route path="/landing"  element={<AuthRedirect><Landing  /></AuthRedirect>} />
        <Route path="/login"    element={<AuthRedirect><Login role="citizen" /></AuthRedirect>} />
        <Route path="/admin/login" element={<AuthRedirect><Login role="admin" /></AuthRedirect>} />
        <Route path="/department/login" element={<AuthRedirect><Login role="department" /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />

        {/* ── Authenticated routes wrapped in AppShell ── */}
        <Route element={<AppShell />}>

          {/* Citizen */}
          <Route path="/home"          element={<ProtectedRoute roles={['citizen']}><Home />           </ProtectedRoute>} />
          <Route path="/report"        element={<ProtectedRoute roles={['citizen']}><ReportIssue />    </ProtectedRoute>} />
          <Route path="/my-complaints" element={<ProtectedRoute roles={['citizen']}><MyComplaints />   </ProtectedRoute>} />
          <Route path="/map"           element={<ProtectedRoute roles={['citizen']}><CommunityMap />   </ProtectedRoute>} />
          <Route path="/track"         element={<ProtectedRoute roles={['citizen', 'department']}><TrackComplaint /> </ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin"              element={<ProtectedRoute roles={['admin']}><Dashboard />         </ProtectedRoute>} />
          <Route path="/admin/manage"       element={<ProtectedRoute roles={['admin']}><ManageComplaints />  </ProtectedRoute>} />
          <Route path="/admin/map"          element={<ProtectedRoute roles={['admin']}><MapOverview />       </ProtectedRoute>} />
          <Route path="/admin/departments"  element={<ProtectedRoute roles={['admin']}><ManageDepartments /></ProtectedRoute>} />

          {/* Department */}
          <Route path="/department"              element={<ProtectedRoute roles={['department']}><DeptDashboard />  </ProtectedRoute>} />
          <Route path="/department/complaints"   element={<ProtectedRoute roles={['department']}><DeptComplaints /> </ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/** Root / redirect: logged-in users go to their home, others go to landing. */
function RootRedirect() {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/landing" replace />;
  if (user.role === 'admin')      return <Navigate to="/admin"      replace />;
  if (user.role === 'department') return <Navigate to="/department" replace />;
  return <Navigate to="/home" replace />;
}

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2 style={{ color: 'var(--text-h)' }}>Page not found</h2>
      <p style={{ color: 'var(--text)' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
      <a href="/landing" style={{ color: 'var(--navy)', fontWeight: 600 }}>Go to home →</a>
    </div>
  );
}
