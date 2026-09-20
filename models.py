from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class Team(db.Model):
    __tablename__ = 'teams'
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.String(20), unique=True, nullable=False) # e.g. MEDHA26-A7F3
    name = db.Column(db.String(100), nullable=False)
    leader_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    status = db.Column(db.String(20), default='INCOMPLETE') # INCOMPLETE, COMPLETE, REGISTERED
    created_at = db.Column(db.DateTime, default=None)

    # Relationships
    leader = db.relationship('User', foreign_keys=[leader_id], backref='led_team')
    members = db.relationship('User', foreign_keys='User.team_id', backref='team_member_of')

    def member_count(self):
        return len(self.members)
        
    def is_complete(self):
        return self.member_count() == 4

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    mobile = db.Column(db.String(20), nullable=False)
    college = db.Column(db.String(150), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    year = db.Column(db.String(20), nullable=False)
    skills = db.Column(db.String(300), nullable=True)
    github = db.Column(db.String(150), nullable=True)
    linkedin = db.Column(db.String(150), nullable=True)
    role = db.Column(db.String(20), default='student') # student, admin
    
    # Team association
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=True)

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(255), nullable=False)
    target_type = db.Column(db.String(50), nullable=True) # 'Student' or 'Team'
    target_id = db.Column(db.Integer, nullable=True)
    previous_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=None)
    
    admin = db.relationship('User', foreign_keys=[admin_id])
