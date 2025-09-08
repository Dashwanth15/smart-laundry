import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './header.css';

function Header() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <header className="header">
      <div className="header-content" ref={containerRef}>
        <button
          className="menu-button"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={open ? "M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z" : "M3 18V16H21V18H3ZM3 13V11H21V13H3ZM3 8V6H21V8H3Z"} 
              fill="#2c3e50" />
          </svg>
        </button>

        <Link to="/" className="brand">
          Smart Laundry Portal - Wash Up!
        </Link>
        <nav className="nav-links">
          {!isAuthenticated ? (
            <Link to="/login" className="nav-link login-btn">Login</Link>
          ) : (
            <button onClick={logout} className="nav-link login-btn">Logout</button>
          )}
        </nav>

        <div className={`menu-panel ${open ? 'open' : ''}`} role="menu">
          <div className="menu-header">
            <h3>Menu</h3>
          </div>
          <div className="menu-items">
            <Link to="/" className="menu-item" onClick={() => setOpen(false)}>Home</Link>
            {!isAuthenticated ? (
              <Link to="/login" className="menu-item" onClick={() => setOpen(false)}>Login</Link>
            ) : (
              <button onClick={() => { logout(); setOpen(false); }} className="menu-item">Logout</button>
            )}
            <Link to="/about" className="menu-item" onClick={() => setOpen(false)}>About</Link>
          </div>
        </div>
        
        {/* Overlay to darken the rest of the page when menu is open */}
        <div 
          className={`menu-overlay ${open ? 'open' : ''}`} 
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}

export default Header;
