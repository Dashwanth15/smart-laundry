import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './header.css';

function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile modal when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="brand">
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 50 50" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="brand-logo"
          >
            {/* Washing machine drum */}
            <circle cx="25" cy="25" r="20" fill="#1e3a8a" opacity="0.15"/>
            <circle cx="25" cy="25" r="16" fill="none" stroke="#1e3a8a" strokeWidth="2.5"/>
            
            {/* Inner drum holes */}
            <circle cx="25" cy="25" r="2" fill="#1e3a8a"/>
            <circle cx="18" cy="18" r="1.5" fill="#1e3a8a"/>
            <circle cx="32" cy="18" r="1.5" fill="#1e3a8a"/>
            <circle cx="18" cy="32" r="1.5" fill="#1e3a8a"/>
            <circle cx="32" cy="32" r="1.5" fill="#1e3a8a"/>
            <circle cx="25" cy="15" r="1.5" fill="#1e3a8a"/>
            <circle cx="25" cy="35" r="1.5" fill="#1e3a8a"/>
            <circle cx="15" cy="25" r="1.5" fill="#1e3a8a"/>
            <circle cx="35" cy="25" r="1.5" fill="#1e3a8a"/>
            
            {/* Water droplet accent - sky blue */}
            <path 
              d="M 42 12 C 42 12, 45 8, 45 5 C 45 3, 43.5 2, 42 2 C 40.5 2, 39 3, 39 5 C 39 8, 42 12, 42 12 Z" 
              fill="#38bdf8"
            />
            <path 
              d="M 42 12 C 42 12, 45 8, 45 5 C 45 3, 43.5 2, 42 2 C 40.5 2, 39 3, 39 5 C 39 8, 42 12, 42 12 Z" 
              fill="url(#waterGradient)"
            />
            
            {/* Gradient definition for water */}
            <defs>
              <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#7dd3fc', stopOpacity: 0.9}} />
                <stop offset="100%" style={{stopColor: '#38bdf8', stopOpacity: 1}} />
              </linearGradient>
              <radialGradient id="bubbleGradient">
                <stop offset="0%" style={{stopColor: '#7dd3fc', stopOpacity: 0.3}} />
                <stop offset="70%" style={{stopColor: '#38bdf8', stopOpacity: 0.5}} />
                <stop offset="100%" style={{stopColor: '#0ea5e9', stopOpacity: 0.2}} />
              </radialGradient>
            </defs>
            
            {/* Bubbles - sky blue with gradient */}
            <circle cx="8" cy="10" r="2.5" fill="url(#bubbleGradient)" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.9"/>
            <circle cx="12" cy="6" r="1.8" fill="url(#bubbleGradient)" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.8"/>
            <circle cx="6" cy="16" r="2" fill="url(#bubbleGradient)" stroke="#7dd3fc" strokeWidth="1.2" opacity="0.85"/>
            
            {/* Shine effect on water droplet */}
            <ellipse cx="42.5" cy="4" rx="1.2" ry="1.8" fill="white" opacity="0.6"/>
          </svg>
          <span className="brand-text">WashUp</span>
        </Link>
        
        <nav className="nav-links">
          {isAuthenticated && (
            <Link to="/calendar" className="nav-link">Calendar</Link>
          )}
          
          {!isAuthenticated ? (
            <Link to="/login" className="nav-link login-btn">Login</Link>
          ) : (
            <div className="profile-container" ref={profileRef}>
              <button
                className="profile-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen(!profileOpen);
                }}
                aria-label="User profile"
              >
                <div className="profile-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>

              {/* Profile Modal */}
              {profileOpen && (
                <div className="profile-modal">
                  <div className="profile-modal-header">
                    <div className="profile-modal-avatar">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="profile-modal-info">
                      <div className="profile-modal-name">{user?.name || 'User'}</div>
                      <div className="profile-modal-email">{user?.email || 'user@example.com'}</div>
                      {user?.role && <div className="profile-modal-role">{user.role}</div>}
                    </div>
                  </div>
                  
                  <div className="profile-modal-divider"></div>
                  
                  <div className="profile-modal-menu">
                    <Link 
                      to="/calendar" 
                      className="profile-modal-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V9H19V19Z" fill="currentColor"/>
                      </svg>
                      My Schedule
                    </Link>
                    
                    <Link 
                      to="/" 
                      className="profile-modal-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor"/>
                      </svg>
                      Home
                    </Link>
                    
                    <button 
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }} 
                      className="profile-modal-item logout-item"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
