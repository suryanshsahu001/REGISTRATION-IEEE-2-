import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const { user, logout, loading: authLoading, suppressAuthChange } = useContext(AuthContext);
  const navigate = useNavigate();
  const [team, setTeam] = useState(undefined); // undefined = not loaded yet, null = no team
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberForm, setMemberForm] = useState({
    member_name: '', member_email: '', member_mobile: '',
    member_college: '', member_department: '', member_year: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const loadTeam = useCallback(async (userId) => {
    // Step 1: Get the user's current team_id from DB (always fresh)
    const { data: userData } = await supabase
      .from('users').select('team_id').eq('id', userId).single();

    if (!userData?.team_id) { setTeam(null); return; }

    // Step 2: Fetch full team data
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, team_id, name, status, leader_id, created_at')
      .eq('id', userData.team_id)
      .single();

    if (!teamData) { setTeam(null); return; }

    // Step 3: Fetch members separately (avoids any join ambiguity)
    const { data: members } = await supabase
      .from('users')
      .select('id, name, email, mobile, college, department, year')
      .eq('team_id', userData.team_id);

    setTeam({ ...teamData, members: members || [] });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadTeam(user.id);
  }, [user?.id, authLoading]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) { setError('Please enter a team name.'); return; }
    setActionLoading(true);
    setError(''); setMessage('');

    const generatedTeamId = 'MEDHA-T-' + Math.floor(1000 + Math.random() * 9000);

    try {
      // Insert the team — trigger will automatically set user's team_id
      const { data: newTeam, error: insertError } = await supabase
        .from('teams')
        .insert({
          team_id: generatedTeamId,
          name: teamName.trim(),
          leader_id: user.id,
          status: 'INCOMPLETE'
        })
        .select('id, team_id, name, status, leader_id')
        .single();

      if (insertError) throw insertError;

      // Small delay for DB trigger to fire
      await new Promise(r => setTimeout(r, 500));

      setMessage(`Team ${generatedTeamId} created successfully!`);
      setTeamName('');

      // Fetch members (just the leader at this point)
      const { data: members } = await supabase
        .from('users')
        .select('id, name, email, mobile, college, department, year')
        .eq('team_id', newTeam.id);

      setTeam({ ...newTeam, members: members || [] });
    } catch (err) {
      setError('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      suppressAuthChange.current = true;
      const { createClient } = await import('@supabase/supabase-js');
      const iso = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      );

      const { data: newUser, error: signUpError } = await iso.auth.signUp({
        email: memberForm.member_email,
        password: 'Welcome123!',
        options: { data: {
          name: memberForm.member_name, mobile: memberForm.member_mobile,
          college: memberForm.member_college, department: memberForm.member_department,
          year: memberForm.member_year || user.year, role: 'student'
        }}
      });

      suppressAuthChange.current = false;
      if (signUpError) throw signUpError;
      if (!newUser?.user?.id) throw new Error('Signup returned no user ID');

      // Wait for handle_new_user trigger
      await new Promise(r => setTimeout(r, 1500));

      // Use RPC to bypass RLS when linking member to team
      const { error: linkErr } = await supabase.rpc('add_member_to_team', {
        p_team_id: team.id,
        p_member_id: newUser.user.id,
        p_leader_id: user.id
      });
      if (linkErr) throw linkErr;

      setMessage(`Added ${memberForm.member_name} successfully!`);
      setShowAddModal(false);
      setMemberForm({ member_name: '', member_email: '', member_mobile: '', member_college: '', member_department: '', member_year: '' });
      await loadTeam(user.id);
    } catch (err) {
      suppressAuthChange.current = false;
      setError(err.message || 'Failed to add member.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRegistration = async () => {
    setActionLoading(true); setError(''); setMessage('');
    try {
      const { error } = await supabase.from('teams').update({ status: 'REGISTERED' }).eq('id', team.id);
      if (error) throw error;
      setMessage('Registration complete! Your Team ID is ' + team.team_id);
      setShowConfirmModal(false);
      await loadTeam(user.id);
    } catch (err) {
      setError(err.message || 'Error submitting registration.');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || team === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', flexDirection: 'column', gap: '1rem' }}>
        <i className="fas fa-spinner fa-spin fa-2x"></i>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const isLeader = team && user && team.leader_id === user.id;
  const isComplete = team && team.members && team.members.length >= 4;

  return (
    <>
      <Navbar user={user} onLogout={logout} />
      <main className="main-content">
        <div className="container">
          <div className="dashboard-container">
            <div className="dashboard-header">
              <h2>Dashboard</h2>
              <p>Welcome, <strong>{user?.name}</strong></p>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert">{error}</div>}

            {!team ? (
              <div className="no-team-card glass-card">
                <h3>You are not part of a team yet.</h3>
                <p>Create a new team to become the Team Leader and then add up to 3 more members.</p>
                <form onSubmit={handleCreateTeam} className="create-team-form">
                  <div className="form-group">
                    <label htmlFor="team_name">Team Name</label>
                    <input type="text" id="team_name" required placeholder="Enter your team name"
                      maxLength="100" value={teamName} onChange={e => setTeamName(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? <><i className="fas fa-spinner fa-spin"></i> Creating...</> : 'Create Team'}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="team-info-card glass-card">
                  <div className="team-header">
                    <div>
                      <h3>{team.name}</h3>
                      <div className="team-id-badge">ID: {team.team_id}</div>
                    </div>
                    <div className={`team-status status-${team.status.toLowerCase()}`}>Status: {team.status}</div>
                  </div>
                  <div className="team-stats">
                    <p><strong>Team Leader:</strong> {team.members?.find(m => m.id === team.leader_id)?.name}</p>
                    <p><strong>Members:</strong> {team.members?.length} / 4</p>
                  </div>
                  {isLeader && isComplete && team.status !== 'REGISTERED' && (
                    <div style={{ marginTop: '1rem' }}>
                      <button className="btn btn-success" onClick={() => setShowConfirmModal(true)}>
                        <i className="fas fa-check-circle"></i> Submit Final Registration
                      </button>
                    </div>
                  )}
                  {team.status === 'REGISTERED' && (
                    <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                      <i className="fas fa-check-circle"></i> Registered! Show Team ID <strong>{team.team_id}</strong> at the desk.
                    </div>
                  )}
                </div>

                <div className="team-members-section">
                  <h3>Team Members</h3>
                  <div className="members-grid">
                    {team.members?.filter(m => m.id === team.leader_id).map(m => (
                      <div key={m.id} className="member-card glass-card">
                        <div className="member-role">Team Leader</div>
                        <h4 className="member-name">{m.name}</h4>
                        <div className="member-details">
                          <p><i className="fas fa-envelope"></i> {m.email}</p>
                          <p><i className="fas fa-phone"></i> {m.mobile}</p>
                          <p><i className="fas fa-university"></i> {m.college}</p>
                          <p><i className="fas fa-book"></i> {m.department}</p>
                        </div>
                      </div>
                    ))}
                    {team.members?.filter(m => m.id !== team.leader_id).map(m => (
                      <div key={m.id} className="member-card glass-card">
                        <div className="member-role">Team Member</div>
                        <h4 className="member-name">{m.name}</h4>
                        <div className="member-details">
                          <p><i className="fas fa-envelope"></i> {m.email}</p>
                          <p><i className="fas fa-phone"></i> {m.mobile}</p>
                          <p><i className="fas fa-university"></i> {m.college}</p>
                          <p><i className="fas fa-book"></i> {m.department}</p>
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - (team.members?.length || 0)) }).map((_, i) => (
                      <div key={`empty-${i}`} className="member-card empty-slot glass-card">
                        <div className="empty-content">
                          <i className="fas fa-user-plus"></i>
                          <p>Member slot available</p>
                          {isLeader && team.status !== 'REGISTERED' && (
                            <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>Add Member</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {showAddModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <span className="close-modal" onClick={() => setShowAddModal(false)}>&times;</span>
            <h3>Add Team Member</h3>
            <p>Member's login password will be <strong>Welcome123!</strong></p>
            <form onSubmit={handleAddMember}>
              {[
                ['Full Name *', 'text', 'member_name', 'Full name'],
                ['Email *', 'email', 'member_email', 'Email address'],
                ['Mobile *', 'tel', 'member_mobile', '10-digit number'],
                ['College *', 'text', 'member_college', 'College name'],
                ['Department *', 'text', 'member_department', 'Department'],
              ].map(([label, type, key, placeholder]) => (
                <div className="form-group" key={key}>
                  <label>{label}</label>
                  <input type={type} required placeholder={placeholder}
                    pattern={key === 'member_mobile' ? '[0-9]{10}' : undefined}
                    value={memberForm[key]}
                    onChange={e => setMemberForm({ ...memberForm, [key]: e.target.value })} />
                </div>
              ))}
              <div className="form-group"><label>Year *</label>
                <select required value={memberForm.member_year} onChange={e => setMemberForm({ ...memberForm, member_year: e.target.value })}>
                  <option value="" disabled>Select Year</option>
                  {['1st Year','2nd Year','3rd Year','4th Year','Other'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              {actionLoading && <p style={{color:'#4ade80', textAlign:'center'}}>Please wait, adding member...</p>}
              <button type="submit" className="btn btn-primary btn-block" disabled={actionLoading}>
                {actionLoading ? 'Adding...' : 'Add Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showConfirmModal && team && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <span className="close-modal" onClick={() => setShowConfirmModal(false)}>&times;</span>
            <h3>Confirm Team Registration</h3>
            <div className="confirmation-details">
              <p><strong>Team ID:</strong> {team.team_id}</p>
              <p><strong>Name:</strong> {team.name}</p>
              <p><strong>Members:</strong></p>
              <ul>{team.members?.map(m => <li key={m.id}>{m.id === team.leader_id ? <b>[Leader]</b> : '[Member]'} {m.name} — {m.email}</li>)}</ul>
            </div>
            <div className="alert alert-warning"><i className="fas fa-exclamation-triangle"></i> Cannot be changed after submitting.</div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSubmitRegistration} disabled={actionLoading}>
                {actionLoading ? 'Submitting...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-contact">
            <p>Email: <a href="mailto:JAIDEEP.KAMBLE@ADYPU.EDU.IN">JAIDEEP.KAMBLE@ADYPU.EDU.IN</a></p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Dashboard;
