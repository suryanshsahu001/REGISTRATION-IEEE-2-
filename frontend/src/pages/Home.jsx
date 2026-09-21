import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <div className="container">
          <div className="hero-split">
            <div className="hero-left">
              <h2 className="event-title">MEDHA 2026</h2>
              <h1 className="main-title">HACKATHON</h1>
              <p className="tagline">Build. Innovate. Transform.</p>
              <div className="hero-actions">
                <Link to="/register" className="btn btn-primary">Register Now</Link>
                <Link to="/login" className="btn btn-outline">Login</Link>
              </div>
            </div>
            <div className="hero-right">
              <div className="guidelines-card glass-card">
                <div className="guidelines-header">
                  <i className="fas fa-clipboard-list"></i>
                  <h3>Registration Guidelines</h3>
                </div>
                <ul className="guidelines-list">
                  <li>
                    <span className="g-num">1</span>
                    <div><strong>Team Creation:</strong> Only the <em>Team Leader</em> can create a team and add members.</div>
                  </li>
                  <li>
                    <span className="g-num">2</span>
                    <div><strong>Unique Registration:</strong> Each <em>email ID and phone number</em> can be registered only once.</div>
                  </li>
                  <li>
                    <span className="g-num">3</span>
                    <div><strong>Team Verification:</strong> Your <em>Team ID</em> will be verified at the registration desk for identification.</div>
                  </li>
                  <li>
                    <span className="g-num">4</span>
                    <div><strong>Final Team:</strong> Once a team is created, <em>team details cannot be changed later</em>.</div>
                  </li>
                  <li>
                    <span className="g-num">5</span>
                    <div><strong>Queries:</strong> For any assistance, please contact us at the <em>official email provided below</em>.</div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="how-it-works">
            <h3>Registration Process</h3>
            <div className="process-flow">
              <div className="step">
                <div className="step-icon"><i className="fas fa-user-plus"></i></div>
                <div className="step-text">Register</div>
              </div>
              <div className="step-arrow"><i className="fas fa-arrow-right"></i></div>
              <div className="step">
                <div className="step-icon"><i className="fas fa-users"></i></div>
                <div className="step-text">Create Team</div>
              </div>
              <div className="step-arrow"><i className="fas fa-arrow-right"></i></div>
              <div className="step">
                <div className="step-icon"><i className="fas fa-id-card"></i></div>
                <div className="step-text">Get Team ID</div>
              </div>
              <div className="step-arrow"><i className="fas fa-arrow-right"></i></div>
              <div className="step">
                <div className="step-icon"><i className="fas fa-user-friends"></i></div>
                <div className="step-text">Add 3 Members</div>
              </div>
              <div className="step-arrow"><i className="fas fa-arrow-right"></i></div>
              <div className="step final-step">
                <div className="step-icon"><i className="fas fa-flag-checkered"></i></div>
                <div className="step-text">Complete Team</div>
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

export default Home;
