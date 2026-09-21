import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItem = (to, icon, label) => (
    <Link to={to} className={`nav-item${location.pathname === to ? ' active' : ''}`}>
      <i className={`fas fa-${icon}`}></i> {label}
    </Link>
  );

  return (
    <div className="admin-body" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="admin-wrapper">
        <aside className="admin-sidebar" id="adminSidebar">
          <div className="sidebar-header">
            <h2>MEDHA 2026</h2>
            <p>Admin Panel</p>
          </div>
          <nav className="sidebar-nav">
            {navItem('/admin/dashboard', 'home', 'Dashboard')}
            {navItem('/admin/students', 'user-graduate', 'Students')}
            {navItem('/admin/teams', 'users', 'Teams')}
            {navItem('/admin/audit', 'clipboard-list', 'Audit Logs')}
            <button className="nav-item logout" onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </nav>
        </aside>
        <div className="admin-main">
          <header className="admin-header">
            <div className="admin-user-info">
              <span><i className="fas fa-user-shield"></i> {user?.name}</span>
              <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{ marginLeft: '1rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </header>
          <main className="admin-content-area">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

// ─── Admin Dashboard Page ────────────────────────────────
const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/admin/login'); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
    
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [{ count: total_students }, { count: students_without_team }, { count: total_teams }] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').is('team_id', null),
          supabase.from('teams').select('*', { count: 'exact', head: true })
        ]);

        const { data: teams } = await supabase.from('teams').select('status');
        const registered = teams.filter(t => t.status === 'REGISTERED').length;
        const complete = teams.filter(t => t.status === 'COMPLETE').length;
        const incomplete = teams.filter(t => t.status === 'INCOMPLETE').length;

        const { count: team_leaders } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student').not('team_id', 'is', null);
        
        setStats({
          total_students,
          students_without_team,
          total_teams,
          registered_teams: registered,
          complete_teams: complete,
          incomplete_teams: incomplete,
          team_leaders: total_teams, // rough approx
          team_members: team_leaders - total_teams
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user]);

  if (loading) return <AdminLayout><div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Dashboard Overview</h1>
        <div className="header-actions">
          <Link to="/admin/students" className="btn btn-outline btn-sm"><i className="fas fa-download"></i> Export Students</Link>
          <Link to="/admin/teams" className="btn btn-outline btn-sm"><i className="fas fa-download"></i> Export Teams</Link>
        </div>
      </div>
      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card glass-card"><h3>Total Students</h3><div className="stat-value">{stats.total_students}</div></div>
            <div className="stat-card glass-card"><h3>Students Without Team</h3><div className="stat-value warning-text">{stats.students_without_team}</div></div>
            <div className="stat-card glass-card"><h3>Total Teams</h3><div className="stat-value">{stats.total_teams}</div></div>
            <div className="stat-card glass-card highlight-stat"><h3>Registered Teams</h3><div className="stat-value success-text">{stats.registered_teams}</div></div>
          </div>
          <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
            <div className="stat-card glass-card"><h3>Complete Teams</h3><div className="stat-value">{stats.complete_teams}</div></div>
            <div className="stat-card glass-card"><h3>Incomplete Teams</h3><div className="stat-value warning-text">{stats.incomplete_teams}</div></div>
            <div className="stat-card glass-card"><h3>Team Leaders</h3><div className="stat-value">{stats.team_leaders}</div></div>
            <div className="stat-card glass-card"><h3>Team Members</h3><div className="stat-value">{stats.team_members}</div></div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
export { AdminLayout };
