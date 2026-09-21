import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', mobile: '',
    college: '', department: '', year: '', skills: '', github: '', linkedin: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            mobile: form.mobile,
            college: form.college,
            department: form.department,
            year: form.year,
            role: 'student'
          }
        }
      });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
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
              <h2>Student Registration</h2>
              <p className="subtitle">Join MEDHA 2026 Hackathon</p>
              {error && <div className="alert">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <form onSubmit={handleSubmit} className="auth-form" id="registerForm">
                <div className="form-section">
                  <h3>Personal Information</h3>
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input type="text" id="name" name="name" required placeholder="John Doe" value={form.name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input type="email" id="email" name="email" required placeholder="john@example.com" value={form.email} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password *</label>
                    <input type="password" id="password" name="password" required placeholder="Create a strong password" value={form.password} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mobile">Mobile Number *</label>
                    <input type="tel" id="mobile" name="mobile" required pattern="[0-9]{10}" placeholder="10-digit mobile number" value={form.mobile} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="college">College/University *</label>
                    <input type="text" id="college" name="college" required placeholder="Enter your college name" value={form.college} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="department">Course/Department *</label>
                    <input type="text" id="department" name="department" required placeholder="e.g., B.Tech Computer Science" value={form.department} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="year">Year of Study *</label>
                    <select id="year" name="year" required value={form.year} onChange={handleChange}>
                      <option value="" disabled>Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>
              <div className="auth-footer">
                <p>Already registered? <Link to="/login">Login here</Link></p>
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

export default Register;
