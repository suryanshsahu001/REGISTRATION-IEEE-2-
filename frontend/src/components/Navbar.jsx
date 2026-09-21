import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => (
  <nav className="navbar">
    <div className="nav-container">
      <div className="nav-logos">
        <Link to="/" className="nav-logo-link">
          <img src="/adypu_logo.jpeg" alt="ADYPU" className="nav-logo-img" />
        </Link>
        <div className="logo-divider">|</div>
        <Link to="/" className="nav-logo-link">
          <img src="/ieee_logo.png" alt="IEEE Maharashtra Section" className="nav-logo-img" />
        </Link>
        <div className="logo-divider">|</div>
        <Link to="/" className="nav-logo-link">
          <img src="/medha_logo.jpeg" alt="MEDHA 2026" className="nav-logo-img medha-logo" />
        </Link>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        {user && user.role !== 'admin' ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button className="btn-login" onClick={onLogout}>Logout</button>
          </>
        ) : !user ? (
          <>
            <Link to="/register">Register</Link>
            <Link to="/login" className="btn-login">Login</Link>
          </>
        ) : null}
        <Link to="/admin/login" className="btn-admin-login" title="Organiser Access">
          <i className="fas fa-shield-alt"></i> Admin
        </Link>
      </div>
    </div>
  </nav>
);

export default Navbar;
