import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './breadcrumb.css';

function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Don't show breadcrumb on home page
  if (location.pathname === '/') {
    return null;
  }

  // Function to format breadcrumb labels
  const formatLabel = (label) => {
    // Check if it's a date (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
      const date = new Date(label);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // Capitalize first letter and replace hyphens with spaces
    return label
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Custom breadcrumb items for batch routes
  const getBreadcrumbItems = () => {
    // Check if it's a batch route
    if (pathnames[0] === 'batch' && pathnames.length >= 3) {
      const date = pathnames[1];
      const dayType = pathnames[2]; // 'boys' or 'girls'
      const batchType = pathnames[3]; // 'staff', 'students', etc. (optional)
      
      const items = [
        {
          label: 'Calendar',
          path: '/calendar',
          isLast: false
        },
        {
          label: formatLabel(dayType),
          path: `/batch/${date}/${dayType}`,
          isLast: !batchType
        }
      ];
      
      // Add batch type if it exists
      if (batchType) {
        items.push({
          label: formatLabel(batchType),
          path: `/batch/${date}/${dayType}/${batchType}`,
          isLast: true
        });
      }
      
      return items;
    }
    
    // Default breadcrumb for other routes
    return pathnames.map((name, index) => ({
      label: formatLabel(name),
      path: `/${pathnames.slice(0, index + 1).join('/')}`,
      isLast: index === pathnames.length - 1
    }));
  };

  const breadcrumbItems = getBreadcrumbItems();

  // Check if we're on a batch route to show day type badge
  const isBatchRoute = pathnames[0] === 'batch' && pathnames.length >= 3;
  const dayType = isBatchRoute ? pathnames[2] : null;
  
  const getDayTypeIcon = () => {
    if (dayType === 'boys') return '👨‍🎓';
    if (dayType === 'girls') return '👩‍🎓';
    return null;
  };

  return (
    <nav className={`breadcrumb-container ${isScrolled ? 'scrolled' : ''}`} aria-label="breadcrumb">
      <div className="breadcrumb-wrapper">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">
              <span className="breadcrumb-icon">🏠</span>
              Home
            </Link>
          </li>
          {breadcrumbItems.map((item, index) => (
            <li key={item.path} className={`breadcrumb-item ${item.isLast ? 'active' : ''}`}>
              <span className="breadcrumb-separator">/</span>
              {item.isLast ? (
                <span>{item.label}</span>
              ) : (
                <Link to={item.path}>{item.label}</Link>
              )}
            </li>
          ))}
        </ol>
        
        {isBatchRoute && (
          <div className="day-type-badge-container">
            <span className="day-type-icon">{getDayTypeIcon()}</span>
            <span className={`day-type-badge ${dayType}`}>
              {dayType === 'boys' ? 'Boys Day' : 'Girls Day'}
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Breadcrumb;
