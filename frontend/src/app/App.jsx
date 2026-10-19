import { useEffect } from 'react';
import ManageOptions from '../features/admin/ManageOptions';
import { useSelector } from 'react-redux';
import { Routes, Route, Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, LogOut } from 'lucide-react';
import { useBootstrapMutation, useLogoutMutation } from '../features/auth/api';
import { Button, ErrorBox, ToastProvider } from '../shared/ui';
import Home from '../features/jobs/Home';
import JobList from '../features/jobs/JobList';
import JobDetails from '../features/jobs/JobDetails';
import AuthPage from '../features/auth/AuthPage';
import Profile from '../features/profile/Profile';
import Applications from '../features/applications/Applications';
import Dashboard from '../features/admin/Dashboard';
import AdminJobs from '../features/admin/AdminJobs';
import JobForm from '../features/admin/JobForm';
function Protected({ role }) {
  const user = useSelector((s) => s.auth.user);
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to={role === 'admin' ? '/admin/login' : '/login'}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (user.role !== role)
    return (
      <div className="section page">
        <h1>This space is for {role}s.</h1>
        <Link to={user.role === 'admin' ? '/admin' : '/jobs'}>Go to your workspace →</Link>
      </div>
    );
  return <Outlet />;
}
function CandidateBrowsing() {
  const user = useSelector((s) => s.auth.user);
  return user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Outlet />;
}
function Layout() {
  const user = useSelector((s) => s.auth.user),
    [logout, state] = useLogoutMutation();
  const isAdmin = user?.role === 'admin';
  const homePath = isAdmin ? '/admin' : '/';
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link
          className="brand"
          to={homePath}
          aria-label={isAdmin ? 'TNP admin dashboard' : 'TNP Careers home'}
        >
          <span className="brand-symbol">
            t<span>n</span>p<span className="brand-dot">.</span>
          </span>
          <span className="brand-word">CAREERS</span>
        </Link>
        <nav aria-label="Main navigation">
          {!isAdmin && <NavLink to="/jobs">Find a job</NavLink>}
          {isAdmin ? (
            <>
              <NavLink to="/admin" end>
                Dashboard
              </NavLink>
              <NavLink to="/admin/jobs">Manage jobs</NavLink>
              <NavLink to="/admin/options">Job options</NavLink>
            </>
          ) : user?.role === 'candidate' ? (
            <>
              <NavLink to="/applications">My applications</NavLink>
              <NavLink to="/profile">My profile</NavLink>
            </>
          ) : null}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-name">Hi, {user.fullName.split(' ')[0]}</span>
              <Button variant="secondary" busy={state.isLoading} onClick={() => logout()}>
                <LogOut size={15} />
                <span>Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Sign in
              </Link>
              <Link className="button small" to="/register">
                Get started <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>
      {state.error && (
        <div className="section compact">
          <ErrorBox error={state.error} />
        </div>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>
          <Link className="footer-brand" to={homePath}>
            tnp<span>.</span> <small>CAREERS</small>
          </Link>
          <p>Good people. Meaningful work. New possibilities.</p>
        </div>
        <div>
          {isAdmin ? (
            <Link to="/admin">Admin portal</Link>
          ) : (
            <>
              <Link to="/jobs">Find opportunities</Link>
              <Link to="/profile">Candidate profile</Link>
            </>
          )}
        </div>
        <span>© {new Date().getFullYear()} TNP Careers</span>
      </footer>
    </>
  );
}
export default function App() {
  const [bootstrap, state] = useBootstrapMutation();
  const ready = useSelector((s) => s.auth.bootstrapped);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  if (!ready && !state.error)
    return (
      <div className="loading" role="status">
        Connecting your workspace…
      </div>
    );
  if (state.error && !ready)
    return (
      <div className="section">
        <ErrorBox error={state.error} retry={bootstrap} />
      </div>
    );
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route element={<CandidateBrowsing />}>
            <Route index element={<Home />} />
            <Route path="jobs" element={<JobList />} />
            <Route path="jobs/:id" element={<JobDetails />} />
          </Route>
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route path="admin/login" element={<AuthPage admin />} />
          <Route element={<Protected role="candidate" />}>
            <Route path="profile" element={<Profile />} />
            <Route path="applications" element={<Applications />} />
          </Route>
          <Route element={<Protected role="admin" />}>
            <Route path="admin" element={<Dashboard />} />
            <Route path="admin/jobs" element={<AdminJobs />} />
            <Route path="admin/options" element={<ManageOptions />} />
            <Route path="admin/jobs/new" element={<JobForm />} />
            <Route path="admin/jobs/:id/edit" element={<JobForm />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="section page">
                <h1>Page not found.</h1>
                <Link to="/">Back to home →</Link>
              </div>
            }
          />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
