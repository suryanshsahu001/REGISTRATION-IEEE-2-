# MEDHA 2026 — Hackathon Registration System

A full-stack team registration portal built with Flask + SQLite for the MEDHA 2026 Hackathon.

## Features

- **Student Registration** — Name, email, phone, college, department, year
- **Team Creation** — Leader creates team, directly adds up to 3 members
- **Unique Team ID** — Auto-generated `MEDHA26-XXXXXX` ID for each team
- **Admin Panel** — Secure admin login, manage students & teams, audit logs, CSV export
- **Security** — Server-side auth, session hardening, duplicate email/phone enforcement

## Tech Stack

- **Backend:** Python / Flask
- **Database:** SQLite via Flask-SQLAlchemy
- **Auth:** Flask-Login
- **Frontend:** HTML, Vanilla CSS, JavaScript

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/suryanshsahu001/REGISTRATION-IEEE-2-.git
cd REGISTRATION-IEEE-2-

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

The app will be available at **http://127.0.0.1:5000**

## Environment Variables (Production)

| Variable | Description |
|---|---|
| `MEDHA_SECRET_KEY` | Flask secret key (override the default) |
| `DATABASE_URL` | Database URI (default: `sqlite:///hackathon.db`) |

## Default Admin Credentials

Set up via the database seeding script or create manually.

> ⚠️ Change admin credentials before deploying to production.
