-- Run this in the Supabase SQL Editor

-- 1. Create custom types
CREATE TYPE team_status AS ENUM ('INCOMPLETE', 'COMPLETE', 'REGISTERED');

-- 2. Create tables
CREATE TABLE public.teams (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(20) UNIQUE NOT NULL, -- e.g. MEDHA-T-1234
    name VARCHAR(100) NOT NULL,
    leader_id UUID REFERENCES auth.users(id), -- Will point to auth.users (the leader)
    status team_status DEFAULT 'INCOMPLETE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id), -- Same ID as auth.users
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    college VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    skills TEXT,
    github VARCHAR(100),
    linkedin VARCHAR(100),
    team_id INTEGER REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    action VARCHAR(255) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    previous_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Users policies
-- Users can view their own profile, or any user can view members of their team, and admins can view all.
-- But to keep things simple and avoid complex recursion, we allow authenticated users to view all other users (often needed for team building).
CREATE POLICY "Users can view all other users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- A user can update their own profile, admins can update any.
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- A user can insert their own profile upon signup
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Teams policies
-- Anyone can view teams
CREATE POLICY "Anyone can view teams"
    ON public.teams FOR SELECT
    TO authenticated
    USING (true);

-- Any authenticated user can create a team
CREATE POLICY "Authenticated users can create a team"
    ON public.teams FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = leader_id);

-- Only the team leader or an admin can update the team
CREATE POLICY "Team leader can update team"
    ON public.teams FOR UPDATE
    TO authenticated
    USING (auth.uid() = leader_id);

CREATE POLICY "Admins can update any team"
    ON public.teams FOR UPDATE
    TO authenticated
    USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
    
CREATE POLICY "Admins can delete any team"
    ON public.teams FOR DELETE
    TO authenticated
    USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

-- Audit logs policies
-- Only admins can read/write audit logs
CREATE POLICY "Admins can select audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );


-- 5. Function to automatically create a profile after Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, mobile, college, department, year, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'mobile',
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'year',
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
