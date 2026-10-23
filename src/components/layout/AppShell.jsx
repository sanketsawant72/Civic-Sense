import { Outlet } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Navbar from './Navbar';
import './AppShell.css';

export default function AppShell() {
  const { apiOnline, loading, error, clearError } = useStore();

  return (
    <div className="app-shell">
      <Navbar />

      {/* API offline warning */}
      {apiOnline === false && (
        <div className="app-banner app-banner--warn" role="alert">
          <span>⚠ Cannot reach the API server — make sure MongoDB and Express are running.</span>
          <span className="app-banner__cmd">npm run dev:full</span>
        </div>
      )}

      {/* Global error toast */}
      {error && (
        <div className="app-banner app-banner--error" role="alert">
          <span>✖ {error}</span>
          <button className="app-banner__close" onClick={clearError} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Slim loading bar */}
      {loading && <div className="app-loading-bar" aria-hidden="true" />}

      <main className="app-main" id="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      <footer className="app-footer">
        <div className="page-container">
          <span>© {new Date().getFullYear()} CivicSense · Ashta, Maharashtra</span>
          <span className="footer-sep" aria-hidden="true">·</span>
          <span>Smart Civic Reporting Platform</span>
          {apiOnline === true && (
            <span className="footer-db">
              <span className="footer-db__dot" aria-hidden="true" /> MongoDB connected
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
