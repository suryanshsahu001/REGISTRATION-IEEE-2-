import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { supabase } from '../lib/supabase';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase.from('users').select('*, teams(id, team_id, name, status, leader_id)').eq('role', 'student');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%,college.ilike.%${search}%`);
      }
      
      if (filter === 'with_team') query = query.not('team_id', 'is', null);
      if (filter === 'without_team') query = query.is('team_id', null);
      
      const { data, error } = await query;
      if (error) throw error;
      
      let processed = data.map(u => {
        const team = u.teams;
        let role = 'No Team';
        if (team) {
          role = team.leader_id === u.id ? 'Leader' : 'Member';
        }
        return {
          ...u,
          team_id_num: u.team_id,
          team_id: team?.team_id || '-',
          team_name: team?.name || '-',
          team_status: team?.status || '',
          role
        };
      });

      // Post-filtering for team specific roles/status
      if (filter === 'leaders') processed = processed.filter(u => u.role === 'Leader');
      if (filter === 'members') processed = processed.filter(u => u.role === 'Member');
      if (filter === 'complete_teams') processed = processed.filter(u => u.team_status === 'COMPLETE');
      if (filter === 'incomplete_teams') processed = processed.filter(u => u.team_status === 'INCOMPLETE');
      if (filter === 'registered_teams') processed = processed.filter(u => u.team_status === 'REGISTERED');

      setStudents(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filter, search]);

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Email', 'Mobile', 'College', 'Department', 'Year', 'Team ID', 'Team Name', 'Role'];
    const csvRows = students.map(s => [
      s.id, `"${s.name}"`, s.email, s.mobile, `"${s.college}"`, `"${s.department}"`, s.year, s.team_id, `"${s.team_name}"`, s.role
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medha2026_students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Students Directory</h1>
        <div className="header-actions">
          <button onClick={handleExport} className="btn btn-outline btn-sm"><i className="fas fa-download"></i> Export CSV</button>
        </div>
      </div>
      <div className="admin-controls glass-card">
        <input 
          type="text" 
          placeholder="Search by name, email, mobile, or team..." 
          className="admin-search-box"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Students</option>
          <option value="with_team">With Team</option>
          <option value="without_team">Without Team</option>
          <option value="leaders">Team Leaders</option>
          <option value="members">Team Members</option>
          <option value="complete_teams">In Complete Teams</option>
          <option value="incomplete_teams">In Incomplete Teams</option>
          <option value="registered_teams">In Registered Teams</option>
        </select>
      </div>
      <div className="admin-table-container glass-card">
        {loading ? <div style={{padding: '2rem', textAlign: 'center'}}>Loading...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name & Info</th>
                <th>Academic</th>
                <th>Team</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>
                    <strong>{s.name}</strong><br/>
                    <small>{s.email}</small><br/>
                    <small>{s.mobile}</small>
                  </td>
                  <td>
                    {s.college}<br/>
                    <small>{s.department} ({s.year})</small>
                  </td>
                  <td>
                    {s.team_id_num ? (
                      <><strong>{s.team_id}</strong><br/><small>{s.team_name}</small></>
                    ) : <span className="warning-text">No Team</span>}
                  </td>
                  <td>
                    <span className={`role-badge role-${s.role.replace(' ', '-').toLowerCase()}`}>
                      {s.role}
                    </span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No students found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStudents;
