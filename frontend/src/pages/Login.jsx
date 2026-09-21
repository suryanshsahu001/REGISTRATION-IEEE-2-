import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';

const Login = () => {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // The checkAuth inside AuthContext handles fetching the profile from 'users'
        // But to ensure we wait for it to load, we can call checkAuth directly, 
        // though the subscription also triggers it. Let's just navigate.
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar user={null} onLogout={() => {}} />
      <main className="main-content">
        <div className="container">
          <div className="auth-container">
            <div className="auth-card glass-card">
              <h2>Welcome Back</h2>
              <p className="subtitle">Login to your dashboard</p>
              {error && <div className="alert">{error}</div>}
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email" id="email" name="email" required
                    placeholder="Enter your registered email"
                    value={form.email} onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password" id="password" name="password" required
                    placeholder="Enter your password"
                    value={form.password} onChange={handleChange}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
              <div className="auth-footer">
                <p>Don't have an account? <Link to="/register">Register here</Link></p>
              </div>
            </div>
          </div>
        </div>
      </main>
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

export default Login;
