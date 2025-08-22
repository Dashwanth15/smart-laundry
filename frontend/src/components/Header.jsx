import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Header() {
  const location = useLocation();
  const hideLogin = location.pathname === '/calendar' || location.pathname.startsWith('/batch/');
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="brand">
          Smart Laundry Portal - Wash Up!
        </Link>
        <nav className="nav-links">
          {!hideLogin && (
            <Link to="/login" className="nav-link login-btn">Login</Link>
          )}
          {(location.pathname === '/calendar' || location.pathname.startsWith('/batch/')) && (
            <Link to="/calendar" className="nav-link">Calendar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
