import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const AdminLogin = () => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Intercept the fixed Admin ID and map it to a valid Supabase email
      let loginEmail = form.email;
      if (form.email === 'MEDHA_ADMIN_2026') {
        loginEmail = 'admin@medha2026.com';
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: form.password,
      });

      if (error) {
        setError(error.message || 'Invalid credentials.');
      } else if (data.user) {
        // Fetch role to ensure it's an admin
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (profile?.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          await supabase.auth.signOut();
          setError('Access denied. Admin privileges required.');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-body">
      <div className="auth-container">
        <div className="auth-card glass-card admin-auth-card">
          <div className="admin-auth-header">
            <i className="fas fa-shield-alt"></i>
            <h2>Admin Secure Login</h2>
          </div>
          {error && <div className="flash-messages"><div className="alert alert-warning">{error}</div></div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Admin ID</label>
              <input type="text" id="email" name="email" required placeholder="Enter Admin ID"
                value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" name="password" required placeholder="Enter password"
                value={form.password} onChange={handleChange} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Logging in...' : 'Secure Login'}
            </button>
          </form>
          <div className="auth-footer">
            <p><Link to="/"><i className="fas fa-arrow-left"></i> Back to main site</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
