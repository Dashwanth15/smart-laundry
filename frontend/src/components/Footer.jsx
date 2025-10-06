import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section footer-brand">
          <div className="footer-logo">
            <svg 
              width="30" 
              height="30" 
              viewBox="0 0 50 50" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
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
            <span className="footer-brand-text">WashUp</span>
          </div>
          <p className="footer-tagline">Your trusted laundry service partner</p>
        </div>

        {/* <div className="footer-section">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/calendar">Schedule</Link></li>
          </ul>
        </div> */}

        <div className="footer-section">
          <h3 className="footer-title">Contact</h3>
          <ul className="footer-links">
            <li>📧 support@washup.com</li>
            <li>📞 +91 9330000333</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Hours</h3>
          <ul className="footer-links">
            <li>Mon-Sat: 8AM - 8PM</li>
            <li>Sun: Closed</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} WashUp. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="#privacy">Privacy Policy</a>
          <span>•</span>
          <a href="#terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
