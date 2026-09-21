import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const { user, checkAuth, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberForm, setMemberForm] = useState({
    member_name: '', member_email: '', member_mobile: '', member_college: '', member_department: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDash = async () => {
    setLoading(true);
    try {
      if (!user) return;
      
      let teamData = null;
      if (user.team_id) {
        const { data, error } = await supabase
          .from('teams')
          .select('*, members:users(*)')
          .eq('id', user.team_id)
          .single();
        if (data) teamData = data;
      }
      
      setDashData({ user, team: teamData });
      
      setMemberForm(f => ({
        ...f,
        member_college: user.college || '',
        member_department: user.department || ''
      }));
    } catch {
      setError('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchDash();
      } else {
        navigate('/login');
      }
    }
  }, [user, authLoading, navigate]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      const generatedTeamId = 'MEDHA-T-' + Math.floor(1000 + Math.random() * 9000);
      
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          team_id: generatedTeamId,
          name: teamName,
          leader_id: user.id,
          status: 'INCOMPLETE'
        })
        .select()
        .single();
        
      if (teamError) throw teamError;
      
      const { error: userError } = await supabase
        .from('users')
        .update({ team_id: team.id })
        .eq('id', user.id);
        
      if (userError) throw userError;
      
      setMessage(`Team ${generatedTeamId} created successfully!`);
      // Update context and refetch
      await checkAuth(); 
    } catch (err) { 
      setError(err.message || 'Failed to create team.'); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      // Create a secondary isolated client so signing up a new member doesn't log out the current leader
      const { createClient } = await import('@supabase/supabase-js');
      const isolatedSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      // Sign up the new member with a dummy password
      const { data: newMemberData, error: signUpError } = await isolatedSupabase.auth.signUp({
        email: memberForm.member_email,
        password: 'Welcome123!',
        options: {
          data: {
            name: memberForm.member_name,
            mobile: memberForm.member_mobile,
            college: memberForm.member_college,
            department: memberForm.member_department,
            year: user.year, // inherit year
            role: 'student'
          }
        }
      });

      if (signUpError) throw signUpError;

      // The trigger on_auth_user_created will insert the row into public.users.
      // Now, update that row to link them to the current team.
      const { error: linkError } = await supabase
        .from('users')
        .update({ team_id: dashData.team.id })
        .eq('id', newMemberData.user.id);

      if (linkError) throw linkError;

      setMessage(`Successfully added ${memberForm.member_name} to your team!`);
      setShowAddModal(false);
      setMemberForm({ member_name: '', member_email: '', member_mobile: '', member_college: '', member_department: '' });
      fetchDash();
    } catch (err) { 
      setError(err.message || 'Failed to add member. Email or phone may already be in use.'); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleSubmitRegistration = async () => {
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      const { error } = await supabase
        .from('teams')
        .update({ status: 'REGISTERED' })
        .eq('id', dashData.team.id);
        
      if (error) throw error;
      
      setMessage('Registration completed successfully!');
      setShowConfirmModal(false);
      fetchDash();
    } catch (err) { 
      setError(err.message || 'Network error.'); 
    } finally { 
      setActionLoading(false); 
    }
  };

  if (loading && !user) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>;

  const { user: u, team } = dashData || { user: null, team: null };
  const isLeader = team && u && team.leader_id === u.id;
  const isComplete = team && team.members && team.members.length >= 4;

  return (
    <>
      <Navbar user={u} onLogout={logout} />
      <main className="main-content">
        <div className="container">
          <div className="dashboard-container">
            <div className="dashboard-header">
              <h2>Dashboard</h2>
              <p>Welcome, <strong>{u?.name}</strong></p>
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert">{error}</div>}

            {!team ? (
              <div className="no-team-card glass-card">
                <h3>You are not part of a team yet.</h3>
                <p>Create a new team to become the Team Leader and then invite up to 3 more members.</p>
                <form onSubmit={handleCreateTeam} className="create-team-form">
                  <div className="form-group">
                    <label htmlFor="team_name">Team Name</label>
                    <input type="text" id="team_name" name="team_name" required
                      placeholder="Enter your team name" maxLength="100"
                      value={teamName} onChange={e => setTeamName(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Creating...' : 'Create Team'}
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
                    <div className={`team-status status-${team.status.toLowerCase()}`}>
                      Status: {team.status}
                    </div>
                  </div>
                  <div className="team-stats">
                    <p><strong>Team Leader:</strong> {team.members?.find(m => m.id === team.leader_id)?.name}</p>
                    <p><strong>Members:</strong> {team.members?.length} / 4</p>
                  </div>
                  {isLeader && isComplete && team.status !== 'REGISTERED' && (
                    <div className="registration-action" style={{ marginTop: '1rem' }}>
                      <button id="finalSubmitBtn" className="btn btn-success" onClick={() => setShowConfirmModal(true)}>
                        <i className="fas fa-check-circle"></i> Submit Final Registration
                      </button>
                    </div>
                  )}
                </div>

                <div className="team-members-section">
                  <h3>Team Members</h3>
                  <div className="members-grid">
                    {/* Leader first */}
                    {team.members?.filter(m => m.id === team.leader_id).map(member => (
                      <div key={member.id} className="member-card glass-card">
                        <div className="member-role">Team Leader</div>
                        <h4 className="member-name">{member.name}</h4>
                        <div className="member-details">
                          <p><i className="fas fa-envelope"></i> {member.email}</p>
                          <p><i className="fas fa-phone"></i> {member.mobile}</p>
                          <p><i className="fas fa-university"></i> {member.college}</p>
                          <p><i className="fas fa-book"></i> {member.department}</p>
                        </div>
                      </div>
                    ))}
                    {/* Non-leader members */}
                    {team.members?.filter(m => m.id !== team.leader_id).map(member => (
                      <div key={member.id} className="member-card glass-card">
                        <div className="member-role">Team Member</div>
                        <h4 className="member-name">{member.name}</h4>
                        <div className="member-details">
                          <p><i className="fas fa-envelope"></i> {member.email}</p>
                          <p><i className="fas fa-phone"></i> {member.mobile}</p>
                          <p><i className="fas fa-university"></i> {member.college}</p>
                          <p><i className="fas fa-book"></i> {member.department}</p>
                        </div>
                      </div>
                    ))}
                    {/* Empty slots */}
                    {Array.from({ length: 4 - (team.members?.length || 0) }).map((_, i) => (
                      <div key={`empty-${i}`} className="member-card empty-slot glass-card">
                        <div className="empty-content">
                          <i className="fas fa-user-plus"></i>
                          <p>Member slot available</p>
                          {isLeader && team.status !== 'REGISTERED' && (
                            <button className="btn btn-outline btn-sm add-member-btn" onClick={() => setShowAddModal(true)}>
                              Add Member
                            </button>
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <span className="close-modal" onClick={() => setShowAddModal(false)}>&times;</span>
            <h3>Add Team Member</h3>
            <p>Register a new member directly to your team.</p>
            <form onSubmit={handleAddMember} id="addMemberForm">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" required placeholder="Enter member's full name"
                  value={memberForm.member_name} onChange={e => setMemberForm({ ...memberForm, member_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" required placeholder="Enter member's email"
                  value={memberForm.member_email} onChange={e => setMemberForm({ ...memberForm, member_email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input type="tel" required pattern="[0-9]{10}" placeholder="10-digit mobile number"
                  value={memberForm.member_mobile} onChange={e => setMemberForm({ ...memberForm, member_mobile: e.target.value })} />
              </div>
              <div className="form-group">
                <label>College/University *</label>
                <input type="text" required
                  value={memberForm.member_college} onChange={e => setMemberForm({ ...memberForm, member_college: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Course/Department *</label>
                <input type="text" required
                  value={memberForm.member_department} onChange={e => setMemberForm({ ...memberForm, member_department: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={actionLoading}>
                <i className="fas fa-user-plus"></i> {actionLoading ? 'Adding...' : 'Add Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Registration Modal */}
      {showConfirmModal && team && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <span className="close-modal" onClick={() => setShowConfirmModal(false)}>&times;</span>
            <h3>Confirm Team Registration</h3>
            <div className="confirmation-details">
              <p><strong>Team ID:</strong> {team.team_id}</p>
              <p><strong>Team Name:</strong> {team.name}</p>
              <p><strong>Members ({team.members?.length}/4):</strong></p>
              <ul>
                {team.members?.map(m => (
                  <li key={m.id}>
                    {m.id === team.leader_id ? <strong>[Leader]</strong> : '[Member]'} {m.name} — {m.email}
                  </li>
                ))}
              </ul>
            </div>
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle"></i> Once submitted, your team cannot be modified without organiser approval.
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline cancel-btn" onClick={() => setShowConfirmModal(false)}>Cancel</button>
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
