document.addEventListener('DOMContentLoaded', () => {
    // Mobile Sidebar Toggle
    const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
    const adminSidebar = document.getElementById('adminSidebar');
    if (mobileSidebarBtn && adminSidebar) {
        mobileSidebarBtn.addEventListener('click', () => {
            adminSidebar.classList.toggle('show');
        });
    }

    // Highlight current nav item
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // --- Admin Students Logic ---
    const studentsTableBody = document.getElementById('studentsTableBody');
    if (studentsTableBody) {
        loadStudents();
        
        document.getElementById('studentSearch').addEventListener('input', debounce(loadStudents, 300));
        document.getElementById('studentFilter').addEventListener('change', loadStudents);
    }

    // --- Admin Teams Logic ---
    const teamsTableBody = document.getElementById('teamsTableBody');
    if (teamsTableBody) {
        loadTeams();
    }

    // Modal Logic for Editing Student
    const editStudentModal = document.getElementById('editStudentModal');
    const editStudentForm = document.getElementById('editStudentForm');
    
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const data = {
                name: document.getElementById('edit-name').value,
                email: document.getElementById('edit-email').value,
                mobile: document.getElementById('edit-mobile').value,
                college: document.getElementById('edit-college').value,
                department: document.getElementById('edit-department').value,
                year: document.getElementById('edit-year').value,
                skills: document.getElementById('edit-skills').value,
                github: document.getElementById('edit-github').value,
                linkedin: document.getElementById('edit-linkedin').value
            };
            
            try {
                const res = await fetch(`/api/admin/students/${id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    editStudentModal.style.display = 'none';
                    loadStudents(); // Reload table
                    alert('Student updated successfully.');
                }
            } catch (err) {
                console.error(err);
                alert('Error updating student.');
            }
        });
    }

    // Modal logic for closing
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // --- Admin Team Details Logic ---
    const editTeamBtn = document.getElementById('editTeamBtn');
    if (editTeamBtn) {
        editTeamBtn.addEventListener('click', () => {
            document.getElementById('editTeamModal').style.display = 'flex';
        });
        
        document.getElementById('editTeamForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = e.target.getAttribute('data-id');
            const data = {
                name: document.getElementById('team-name').value,
                status: document.getElementById('team-status').value
            };
            
            try {
                const res = await fetch(`/api/admin/teams/${id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    location.reload();
                }
            } catch (err) {
                console.error(err);
            }
        });
        
        document.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                if(confirm(`Are you sure you want to remove ${this.dataset.email} from the team?`)) {
                    const uid = this.dataset.uid;
                    const tid = this.dataset.tid;
                    try {
                        const res = await fetch(`/api/admin/teams/${tid}/members/${uid}`, {
                            method: 'DELETE'
                        });
                        if(res.ok) location.reload();
                        else alert('Error removing member.');
                    } catch(err) {
                        console.error(err);
                    }
                }
            });
        });
    }
});

// Helper Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadStudents() {
    const query = document.getElementById('studentSearch').value;
    const filter = document.getElementById('studentFilter').value;
    const tbody = document.getElementById('studentsTableBody');
    
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    try {
        const res = await fetch(`/api/admin/students?q=${encodeURIComponent(query)}&filter=${filter}`);
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No students found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(s => `
            <tr>
                <td><strong>${s.name}</strong><br><small class="text-muted">${s.role}</small></td>
                <td><i class="fas fa-envelope"></i> ${s.email}<br><i class="fas fa-phone"></i> ${s.mobile} 
                    ${s.phone_verified ? '<span class="status-badge status-registered" style="padding: 2px 5px; font-size: 0.7rem;">✓ Verified</span>' : ''}
                </td>
                <td>${s.college}<br><small>${s.department} (${s.year})</small></td>
                <td>
                    ${s.team_id !== '-' ? `<span class="badge">${s.team_id}</span><br><small>${s.team_name}</small>` : '-'}
                </td>
                <td>
                    <button class="btn btn-outline btn-sm edit-student-btn" data-student='${JSON.stringify(s).replace(/'/g, "&#39;")}'>Edit</button>
                </td>
            </tr>
        `).join('');
        
        // Attach event listeners to edit buttons
        document.querySelectorAll('.edit-student-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const s = JSON.parse(this.dataset.student);
                document.getElementById('edit-id').value = s.id;
                document.getElementById('edit-name').value = s.name;
                document.getElementById('edit-email').value = s.email;
                document.getElementById('edit-mobile').value = s.mobile;
                document.getElementById('edit-college').value = s.college;
                document.getElementById('edit-department').value = s.department;
                document.getElementById('edit-year').value = s.year;
                document.getElementById('edit-skills').value = s.skills || '';
                document.getElementById('edit-github').value = s.github || '';
                document.getElementById('edit-linkedin').value = s.linkedin || '';
                
                document.getElementById('editStudentModal').style.display = 'flex';
            });
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--danger-color)">Error loading data.</td></tr>';
    }
}

async function loadTeams() {
    const tbody = document.getElementById('teamsTableBody');
    try {
        const res = await fetch(`/api/admin/teams`);
        const data = await res.json();
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No teams found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(t => `
            <tr>
                <td><span class="badge">${t.team_id}</span></td>
                <td><strong>${t.name}</strong></td>
                <td>${t.leader}</td>
                <td>${t.member_count}/4</td>
                <td><span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span></td>
                <td>${t.created_at}</td>
                <td style="display:flex;gap:6px;align-items:center;">
                    <a href="/admin/teams/${t.id}" class="btn btn-primary btn-sm">View</a>
                    <button class="btn btn-sm delete-team-btn" 
                            style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.4);" 
                            data-id="${t.id}" data-team-id="${t.team_id}" data-name="${t.name}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach delete button listeners
        document.querySelectorAll('.delete-team-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id     = this.dataset.id;
                const teamId = this.dataset.teamId;
                const name   = this.dataset.name;
                showDeleteTeamModal(id, teamId, name);
            });
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--danger-color)">Error loading data.</td></tr>';
    }
}

function showDeleteTeamModal(id, teamId, name) {
    // Remove any existing modal
    const existing = document.getElementById('deleteTeamModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'deleteTeamModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
        <div style="background:#1e293b;border:1px solid rgba(239,68,68,0.4);border-radius:12px;padding:2rem;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="width:56px;height:56px;background:rgba(239,68,68,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                    <i class="fas fa-trash-alt" style="color:#f87171;font-size:1.4rem;"></i>
                </div>
                <h3 style="color:#f1f5f9;margin:0 0 0.5rem;">Delete Team?</h3>
                <p style="color:#94a3b8;margin:0;">This action is <strong style="color:#f87171;">permanent</strong> and cannot be undone.</p>
            </div>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:1rem;margin-bottom:1.5rem;">
                <p style="margin:0 0 0.3rem;color:#94a3b8;font-size:0.85rem;">Team to be deleted:</p>
                <p style="margin:0;color:#f1f5f9;font-weight:600;">${name} <span style="font-size:0.8rem;color:#94a3b8;font-weight:400;">(${teamId})</span></p>
                <p style="margin:0.5rem 0 0;color:#fbbf24;font-size:0.82rem;"><i class="fas fa-exclamation-triangle"></i> All members will be unlinked from this team.</p>
            </div>
            <div style="display:flex;gap:0.75rem;">
                <button id="cancelDeleteTeam" style="flex:1;padding:0.65rem;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:transparent;color:#94a3b8;cursor:pointer;font-size:0.9rem;">Cancel</button>
                <button id="confirmDeleteTeam" style="flex:1;padding:0.65rem;border-radius:8px;border:none;background:#ef4444;color:white;cursor:pointer;font-size:0.9rem;font-weight:600;">
                    <i class="fas fa-trash-alt"></i> Yes, Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('cancelDeleteTeam').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('confirmDeleteTeam').addEventListener('click', async () => {
        const confirmBtn = document.getElementById('confirmDeleteTeam');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        try {
            const res = await fetch(`/api/admin/teams/${id}`, { method: 'DELETE' });
            const data = await res.json();
            modal.remove();
            if (res.ok) {
                loadTeams(); // Refresh the teams table
            } else {
                alert(`Error: ${data.error || 'Could not delete team.'}`);
            }
        } catch (err) {
            modal.remove();
            console.error(err);
            alert('Network error. Could not delete team.');
        }
    });
}
