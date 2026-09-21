import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { supabase } from '../lib/supabase';

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*, leader:users!teams_leader_id_fkey(name, email), members:users(id)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTeams(data.map(t => ({
        id: t.id,
        team_id: t.team_id,
        name: t.name,
        leader: t.leader?.name || 'Unknown',
        leader_email: t.leader?.email || '',
        member_count: t.members?.length || 0,
        status: t.status,
        created_at: t.created_at ? new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this team and ALL its members?')) return;
    setActionLoading(true);
    try {
      // First, unlink all users from this team
      const { error: unlinkError } = await supabase
        .from('users')
        .update({ team_id: null })
        .eq('team_id', id);
      if (unlinkError) throw unlinkError;

      // Then delete the team
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;

      fetchTeams();
    } catch (err) {
      alert('Failed to delete team: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['Team ID', 'Name', 'Leader', 'Leader Email', 'Members', 'Status', 'Created'];
    const csvRows = teams.map(t => [
      t.team_id, `"${t.name}"`, `"${t.leader}"`, t.leader_email, t.member_count, t.status, `"${t.created_at}"`
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvRows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "medha2026_teams.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Teams Directory</h1>
        <div className="header-actions">
          <button onClick={handleExport} className="btn btn-outline btn-sm"><i className="fas fa-download"></i> Export CSV</button>
        </div>
      </div>
      <div className="admin-table-container glass-card">
        {loading ? <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Team ID</th>
                <th>Team Name</th>
                <th>Leader</th>
                <th>Members</th>
                <th>Status</th>
                <th>Created (IST)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.team_id}</strong></td>
                  <td>{t.name}</td>
                  <td>
                    {t.leader}<br/>
                    <small>{t.leader_email}</small>
                  </td>
                  <td>{t.member_count} / 4</td>
                  <td>
                    <span className={`status-badge status-${t.status.toLowerCase()}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.created_at}</td>
                  <td>
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      className="btn btn-danger btn-sm"
                      disabled={actionLoading}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No teams found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTeams;
