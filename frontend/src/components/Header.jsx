import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="brand">
          WashUp
        </Link>
        <nav className="nav-links">
          <Link to="/login" className="nav-link">Login</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
