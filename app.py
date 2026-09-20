import os
import random
import string
import csv
import pytz
from io import StringIO
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, Response, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Team, AuditLog

app = Flask(__name__)
# SECRET_KEY — load from environment in production; strong fallback for dev
app.config['SECRET_KEY'] = os.environ.get(
    'MEDHA_SECRET_KEY',
    'M3dH@2026!x#R9qL^kP7vNzW$jBtYs4eUoAcDfGhIiJlQw'
)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'sqlite:///hackathon.db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

db.init_app(app)

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

IST = pytz.timezone('Asia/Kolkata')

def now_ist():
    return datetime.now(IST).replace(tzinfo=None)

def format_ist(dt):
    if dt is None:
        return '-'
    return dt.strftime('%d %b %Y, %I:%M %p IST')

@app.context_processor
def inject_helpers():
    return dict(format_ist=format_ist)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def generate_team_id():
    """Generate a guaranteed-unique 6-character alphanumeric team ID."""
    while True:
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        team_id = f'MEDHA26-{suffix}'
        if not Team.query.filter_by(team_id=team_id).first():
            return team_id

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            flash('Please log in as an administrator to access this page.')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

def log_audit(admin_id, action, target_type=None, target_id=None, prev_val=None, new_val=None):
    try:
        log = AuditLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            previous_value=str(prev_val) if prev_val else None,
            new_value=str(new_val) if new_val else None,
            timestamp=now_ist()
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"[AUDIT LOG ERROR] {e}")

# ─────────────────────────────────────────────
# STUDENT ROUTES
# ─────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        name     = request.form.get('name', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        mobile   = request.form.get('mobile', '').strip()
        college  = request.form.get('college', '').strip()
        department = request.form.get('department', '').strip()
        year     = request.form.get('year', '').strip()
        skills   = request.form.get('skills', '').strip()
        github   = request.form.get('github', '').strip() or None
        linkedin = request.form.get('linkedin', '').strip() or None

        # Validate required fields
        if not all([name, email, password, mobile, college, department, year]):
            flash('All required fields must be filled in.')
            return redirect(url_for('register'))

        if len(password) < 6:
            flash('Password must be at least 6 characters.')
            return redirect(url_for('register'))

        if len(mobile) != 10 or not mobile.isdigit():
            flash('Mobile number must be exactly 10 digits.')
            return redirect(url_for('register'))

        # Duplicate email check
        if User.query.filter_by(email=email).first():
            flash('This email address is already registered. Please login.')
            return redirect(url_for('register'))

        # Duplicate mobile check
        if User.query.filter_by(mobile=mobile).first():
            flash('This mobile number is already registered.')
            return redirect(url_for('register'))

        new_user = User(
            name=name, email=email,
            password_hash=generate_password_hash(password),
            mobile=mobile, college=college, department=department,
            year=year, skills=skills, github=github, linkedin=linkedin
        )
        db.session.add(new_user)
        db.session.commit()

        log_audit(
            admin_id=None,
            action=f'New Student Registered: {name} ({email})',
            target_type='Student',
            target_id=new_user.id,
            new_val=f'College: {college}, Dept: {department}'
        )

        flash('Registration successful! Please login.')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        # Try matching by email (case-insensitive)
        user = User.query.filter(db.func.lower(User.email) == email).first()

        if not user or not check_password_hash(user.password_hash, password):
            flash('Incorrect email or password. Please try again.')
            return redirect(url_for('login'))

        if user.role == 'admin':
            flash('Please use the Admin Login page.')
            return redirect(url_for('admin_login'))

        login_user(user, remember=True)
        return redirect(url_for('dashboard'))

    return render_template('login.html')


@app.route('/logout')
def logout():
    role = None
    if current_user.is_authenticated:
        role = current_user.role
        logout_user()
    if role == 'admin':
        return redirect(url_for('admin_login'))
    return redirect(url_for('index'))

@app.route('/admin/logout')
def admin_logout():
    """Dedicated admin logout — always redirects to admin login."""
    logout_user()
    return redirect(url_for('admin_login'))



@app.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'admin':
        return redirect(url_for('admin_dashboard'))

    team = None
    if current_user.team_id:
        # Always fetch fresh from DB — never rely on cached object
        team = db.session.get(Team, current_user.team_id)
        if team:
            # Refresh members list from DB
            db.session.refresh(team)
        else:
            # Team was deleted by admin — clean up the stale reference
            fresh_user = db.session.get(User, current_user.id)
            fresh_user.team_id = None
            db.session.commit()

    return render_template('dashboard.html', user=current_user, team=team)


# ─────────────────────────────────────────────
# TEAM ROUTES
# ─────────────────────────────────────────────

@app.route('/create_team', methods=['POST'])
@login_required
def create_team():
    if current_user.role == 'admin':
        return redirect(url_for('admin_dashboard'))

    # Re-fetch user fresh to prevent stale team_id
    fresh_user = db.session.get(User, current_user.id)
    if fresh_user.team_id:
        flash('You are already part of a team.')
        return redirect(url_for('dashboard'))

    team_name = request.form.get('team_name', '').strip()
    if not team_name:
        flash('Team name is required.')
        return redirect(url_for('dashboard'))

    if len(team_name) > 100:
        flash('Team name is too long (max 100 characters).')
        return redirect(url_for('dashboard'))

    team_id = generate_team_id()

    new_team = Team(
        team_id=team_id,
        name=team_name,
        leader_id=current_user.id,
        created_at=now_ist()
    )
    db.session.add(new_team)
    db.session.flush()  # Get new_team.id before committing

    # Assign leader to team
    fresh_user.team_id = new_team.id
    db.session.commit()

    log_audit(
        admin_id=None,
        action=f'Team Created: {team_name} [{team_id}] by {current_user.name}',
        target_type='Team',
        target_id=new_team.id,
        new_val=f'Leader: {current_user.email}'
    )

    flash(f'Team "{team_name}" created successfully! Team ID: {team_id}')
    return redirect(url_for('dashboard'))


@app.route('/add_member', methods=['POST'])
@login_required
def add_member():
    if current_user.role == 'admin':
        flash('Admins cannot add team members.')
        return redirect(url_for('admin_dashboard'))

    if not current_user.team_id:
        flash('You do not belong to a team.')
        return redirect(url_for('dashboard'))

    # Refresh team from DB
    team = db.session.get(Team, current_user.team_id)
    if not team:
        flash('Team not found.')
        return redirect(url_for('dashboard'))

    if team.leader_id != current_user.id:
        flash('Only the Team Leader can add members.')
        return redirect(url_for('dashboard'))

    if team.status == 'REGISTERED':
        flash('Team is already registered. Members cannot be changed.')
        return redirect(url_for('dashboard'))

    if team.is_complete():
        flash('Your team already has 4 members.')
        return redirect(url_for('dashboard'))

    member_email = request.form.get('member_email', '').strip().lower()
    member_name  = request.form.get('member_name', '').strip()
    member_mobile = request.form.get('member_mobile', '').strip()
    member_college = request.form.get('member_college', '').strip()
    member_department = request.form.get('member_department', '').strip()

    if not member_email or not member_name or not member_mobile or not member_college or not member_department:
        flash('All fields are required to add a member.')
        return redirect(url_for('dashboard'))

    # Check if this email is already registered anywhere
    existing_user = User.query.filter(db.func.lower(User.email) == member_email).first()
    
    if existing_user:
        if existing_user.team_id == team.id:
            flash(f'{existing_user.name} is already in your team.')
        elif existing_user.team_id:
            flash(f'Cannot add {member_email}: They are already registered in another team.')
        else:
            flash(f'Cannot add {member_email}: They are already registered independently. Please use an unregistered email.')
        return redirect(url_for('dashboard'))

    # Check if mobile is already used
    if User.query.filter_by(mobile=member_mobile).first():
        flash('This mobile number is already registered by someone else.')
        return redirect(url_for('dashboard'))

    # Register the member directly and assign to team
    new_member = User(
        name=member_name,
        email=member_email,
        password_hash=generate_password_hash('Welcome123!'), # Default password
        mobile=member_mobile,
        college=member_college,
        department=member_department,
        year=current_user.year, # inherit from leader
        role='student',
        team_id=team.id
    )
    db.session.add(new_member)
    db.session.commit()

    # Refresh team and update status
    db.session.refresh(team)
    if team.is_complete() and team.status != 'REGISTERED':
        team.status = 'COMPLETE'
        db.session.commit()

    log_audit(
        admin_id=None,
        action=f'Member Added Directly: {new_member.name} ({new_member.email}) → Team {team.team_id}',
        target_type='Team',
        target_id=team.id,
        new_val=f'Team now has {team.member_count()} member(s)'
    )

    flash(f'✓ {new_member.name} has been successfully registered and added to your team!')
    return redirect(url_for('dashboard'))


@app.route('/submit_registration', methods=['POST'])
@login_required
def submit_registration():
    if current_user.role == 'admin':
        return redirect(url_for('admin_dashboard'))
    if not current_user.team_id:
        return redirect(url_for('dashboard'))

    team = db.session.get(Team, current_user.team_id)
    if not team:
        flash('Team not found.')
        return redirect(url_for('dashboard'))

    if team.leader_id != current_user.id:
        flash('Only the Team Leader can submit the registration.')
        return redirect(url_for('dashboard'))

    db.session.refresh(team)
    if not team.is_complete():
        flash(f'Your team needs 4 members to register. Currently has {team.member_count()}.')
        return redirect(url_for('dashboard'))

    if team.status == 'REGISTERED':
        flash('Your team is already registered.')
        return redirect(url_for('dashboard'))

    team.status = 'REGISTERED'
    db.session.commit()

    log_audit(
        admin_id=None,
        action=f'Final Registration Submitted: {team.name} [{team.team_id}]',
        target_type='Team',
        target_id=team.id,
        new_val='Status: REGISTERED'
    )

    flash('✓ Team registration submitted successfully!')
    return redirect(url_for('dashboard'))


# ─────────────────────────────────────────────
# ADMIN ROUTES
# ─────────────────────────────────────────────

@app.route('/admin')
def admin_redirect():
    # Always send to login page — admin_dashboard will redirect to login if not authenticated
    return redirect(url_for('admin_login'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if current_user.is_authenticated and current_user.role == 'admin':
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        identifier = request.form.get('email', '').strip()
        password   = request.form.get('password', '')

        # Match by email OR by name (for MEDHA_ADMIN_2026 style IDs)
        user = User.query.filter_by(role='admin').filter(
            db.or_(
                db.func.lower(User.email) == identifier.lower(),
                User.name == identifier
            )
        ).first()

        if not user or not check_password_hash(user.password_hash, password):
            flash('Invalid admin credentials. Please try again.')
            return redirect(url_for('admin_login'))

        login_user(user, remember=True)
        log_audit(user.id, f'Admin Login: {user.name}')
        return redirect(url_for('admin_dashboard'))

    return render_template('admin_login.html')


@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    total_students       = User.query.filter_by(role='student').count()
    total_teams          = Team.query.count()
    complete_teams       = Team.query.filter_by(status='COMPLETE').count()
    incomplete_teams     = Team.query.filter_by(status='INCOMPLETE').count()
    registered_teams     = Team.query.filter_by(status='REGISTERED').count()
    students_without_team = User.query.filter_by(role='student', team_id=None).count()

    # Count actual team leaders (users whose id == their team's leader_id)
    team_leaders = db.session.query(User).join(
        Team, Team.leader_id == User.id
    ).filter(User.role == 'student').count()

    stats = {
        'total_students':       total_students,
        'total_teams':          total_teams,
        'complete_teams':       complete_teams,
        'incomplete_teams':     incomplete_teams,
        'registered_teams':     registered_teams,
        'students_without_team': students_without_team,
        'team_leaders':         team_leaders,
        'team_members':         total_students - students_without_team - team_leaders
    }
    return render_template('admin_dashboard.html', stats=stats)


@app.route('/admin/students')
@admin_required
def admin_students():
    return render_template('admin_students.html')

@app.route('/admin/teams')
@admin_required
def admin_teams():
    return render_template('admin_teams.html')

@app.route('/admin/teams/<int:team_id>')
@admin_required
def admin_team_details(team_id):
    team = db.session.get(Team, team_id)
    if not team:
        flash('Team not found.')
        return redirect(url_for('admin_teams'))
    db.session.refresh(team)
    return render_template('admin_team_details.html', team=team)

@app.route('/admin/audit')
@admin_required
def admin_audit():
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).all()
    return render_template('admin_audit.html', logs=logs, format_ist=format_ist)


# ─────────────────────────────────────────────
# ADMIN API ENDPOINTS
# ─────────────────────────────────────────────

@app.route('/api/admin/students', methods=['GET'])
@admin_required
def api_get_students():
    query     = request.args.get('q', '').strip()
    filter_by = request.args.get('filter', 'all')

    base = User.query.filter_by(role='student')

    if query:
        base = base.outerjoin(Team, User.team_id == Team.id).filter(
            db.or_(
                User.name.ilike(f'%{query}%'),
                User.email.ilike(f'%{query}%'),
                User.mobile.ilike(f'%{query}%'),
                User.college.ilike(f'%{query}%'),
                Team.team_id.ilike(f'%{query}%'),
                Team.name.ilike(f'%{query}%')
            )
        )

    if filter_by == 'with_team':
        base = base.filter(User.team_id.isnot(None))
    elif filter_by == 'without_team':
        base = base.filter(User.team_id == None)

    users = base.all()
    result = []

    for u in users:
        role      = 'No Team'
        team_name = '-'
        team_uid  = '-'

        if u.team_id and u.team_member_of:
            team_name = u.team_member_of.name
            team_uid  = u.team_member_of.team_id
            role = 'Leader' if u.team_member_of.leader_id == u.id else 'Member'

        # Apply post-filter
        if filter_by == 'leaders'          and role != 'Leader':   continue
        if filter_by == 'members'          and role != 'Member':   continue
        if filter_by == 'complete_teams'   and (not u.team_id or u.team_member_of.status != 'COMPLETE'):   continue
        if filter_by == 'incomplete_teams' and (not u.team_id or u.team_member_of.status != 'INCOMPLETE'): continue
        if filter_by == 'registered_teams' and (not u.team_id or u.team_member_of.status != 'REGISTERED'): continue

        result.append({
            'id':         u.id,
            'name':       u.name,
            'email':      u.email,
            'mobile':     u.mobile,
            'college':    u.college,
            'department': u.department,
            'year':       u.year,
            'skills':     u.skills or '',
            'github':     u.github or '',
            'linkedin':   u.linkedin or '',
            'team_id_num': u.team_id,
            'team_id':    team_uid,
            'team_name':  team_name,
            'role':       role
        })
    return jsonify(result)


@app.route('/api/admin/students/<int:id>', methods=['PUT'])
@admin_required
def api_update_student(id):
    user = db.session.get(User, id)
    if not user:
        return jsonify({'error': 'Student not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    prev_val = f"Name: {user.name}, Email: {user.email}, College: {user.college}"

    user.name       = data.get('name', user.name).strip()
    user.email      = data.get('email', user.email).strip().lower()
    user.mobile     = data.get('mobile', user.mobile).strip()
    user.college    = data.get('college', user.college).strip()
    user.department = data.get('department', user.department).strip()
    user.year       = data.get('year', user.year)
    user.skills     = data.get('skills', user.skills)
    user.github     = data.get('github', user.github) or None
    user.linkedin   = data.get('linkedin', user.linkedin) or None

    db.session.commit()

    new_val = f"Name: {user.name}, Email: {user.email}, College: {user.college}"
    log_audit(current_user.id, f'Admin Edited Student: {user.name}', 'Student', user.id, prev_val, new_val)

    return jsonify({'success': True, 'message': f'{user.name} updated successfully.'})


@app.route('/api/admin/teams', methods=['GET'])
@admin_required
def api_get_teams():
    teams = Team.query.order_by(Team.created_at.desc()).all()
    result = []
    for t in teams:
        result.append({
            'id':           t.id,
            'team_id':      t.team_id,
            'name':         t.name,
            'leader':       t.leader.name if t.leader else 'Unknown',
            'leader_email': t.leader.email if t.leader else '',
            'member_count': t.member_count(),
            'status':       t.status,
            'created_at':   format_ist(t.created_at)
        })
    return jsonify(result)


@app.route('/api/admin/teams/<int:id>', methods=['PUT'])
@admin_required
def api_update_team(id):
    team = db.session.get(Team, id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    prev_val = f"Name: {team.name}, Status: {team.status}"

    team.name   = data.get('name', team.name).strip()
    team.status = data.get('status', team.status)

    db.session.commit()

    new_val = f"Name: {team.name}, Status: {team.status}"
    log_audit(current_user.id, f'Admin Edited Team: {team.team_id}', 'Team', team.id, prev_val, new_val)

    return jsonify({'success': True, 'message': f'Team {team.team_id} updated.'})


@app.route('/api/admin/teams/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
@admin_required
def api_remove_member(team_id, user_id):
    team = db.session.get(Team, team_id)
    user = db.session.get(User, user_id)

    if not team or not user:
        return jsonify({'error': 'Team or member not found'}), 404

    if user.team_id != team.id:
        return jsonify({'error': 'This user is not in the specified team'}), 400

    if team.leader_id == user.id:
        return jsonify({'error': 'Cannot remove the Team Leader. Assign a new leader first.'}), 400

    user.team_id = None
    if team.status in ['COMPLETE', 'REGISTERED']:
        team.status = 'INCOMPLETE'

    db.session.commit()

    log_audit(
        current_user.id,
        f'Admin Removed Member: {user.name} from Team {team.team_id}',
        'Team', team.id,
        f'Member: {user.email}', 'Removed'
    )
    return jsonify({'success': True, 'message': f'{user.name} removed from team.'})


@app.route('/api/admin/teams/<int:id>', methods=['DELETE'])
@admin_required
def api_delete_team(id):
    """Permanently delete a team and all its member students from the database."""
    team = db.session.get(Team, id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    team_display_id = team.team_id
    team_name       = team.name

    # Collect member info before deletion for audit log
    member_info = [f'{m.name} ({m.email})' for m in team.members]

    # Delete all members (students) who belong to this team
    members_to_delete = list(team.members)  # copy list before deleting team
    for member in members_to_delete:
        db.session.delete(member)

    db.session.delete(team)
    db.session.commit()

    log_audit(
        current_user.id,
        f'Admin DELETED Team: {team_display_id} — "{team_name}" (all members deleted)',
        'Team', id,
        f'Deleted members: {", ".join(member_info) if member_info else "None"}',
        'Team and all members permanently deleted'
    )

    return jsonify({'success': True, 'message': f'Team {team_display_id} and all {len(member_info)} member(s) deleted successfully.'})


# ─────────────────────────────────────────────
# CSV EXPORT — always fresh from DB
# ─────────────────────────────────────────────

@app.route('/admin/export/students')
@admin_required
def export_students():
    users_fresh = User.query.filter_by(role='student').order_by(User.id).all()
    data = StringIO()
    writer = csv.writer(data)
    writer.writerow([
        'ID', 'Name', 'Email', 'Mobile', 'College', 'Department', 'Year',
        'Skills', 'GitHub', 'LinkedIn', 'Team ID', 'Team Name', 'Role'
    ])
    for u in users_fresh:
        role      = 'No Team'
        team_uid  = ''
        team_name = ''
        if u.team_id and u.team_member_of:
            team_uid  = u.team_member_of.team_id
            team_name = u.team_member_of.name
            role = 'Leader' if u.team_member_of.leader_id == u.id else 'Member'
        writer.writerow([
            u.id, u.name, u.email, u.mobile, u.college, u.department,
            u.year, u.skills or '', u.github or '', u.linkedin or '',
            team_uid, team_name, role
        ])

    log_audit(current_user.id, 'Admin Exported Students CSV')
    return Response(
        data.getvalue(), mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=medha2026_students.csv'}
    )


@app.route('/admin/export/teams')
@admin_required
def export_teams():
    teams_fresh = Team.query.order_by(Team.id).all()
    data = StringIO()
    writer = csv.writer(data)
    writer.writerow([
        'ID', 'Team ID', 'Name', 'Leader', 'Leader Email',
        'Member Count', 'Status', 'Created At (IST)'
    ])
    for t in teams_fresh:
        writer.writerow([
            t.id, t.team_id, t.name,
            t.leader.name  if t.leader else '',
            t.leader.email if t.leader else '',
            t.member_count(), t.status,
            format_ist(t.created_at)
        ])

    log_audit(current_user.id, 'Admin Exported Teams CSV')
    return Response(
        data.getvalue(), mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=medha2026_teams.csv'}
    )


# ─────────────────────────────────────────────
# DB INIT & SEED
# ─────────────────────────────────────────────

with app.app_context():
    db.create_all()
    # Seed default admin if not present
    admin_user = User.query.filter_by(email='MEDHA_ADMIN_2026').first()
    if not admin_user:
        admin_user = User(
            name='MEDHA_ADMIN_2026',
            email='MEDHA_ADMIN_2026',
            password_hash=generate_password_hash('medha2026admin'),
            mobile='0000000000',
            college='Admin',
            department='Admin',
            year='Admin',
            role='admin'
        )
        db.session.add(admin_user)
        db.session.commit()
        print('[MEDHA] Admin user seeded.')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
