import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';
import './styles.css';

function Batch() {
  const { date, dayType } = useParams();
  const navigate = useNavigate();

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleStaffClick = () => {
    navigate(`/batch/${date}/${dayType}/staff`);
  };

  const handleBoysGirlsClick = () => {
    const batchType = dayType === 'boys' ? 'boys' : 'girls';
    navigate(`/batch/${date}/${dayType}/${batchType}`);
  };

  const handleBackToCalendar = () => {
    navigate('/calendar');
  };

  return (
    <div className="batch-page">
      <div className="batch-card">
        <div className="batch-header">
          <button onClick={handleBackToCalendar} className="back-button">
            ← Back to Calendar
          </button>
          <h2>Select Batch Type for {formatDate(date)}</h2>
        </div>

        <div className="date-info">
          <div className={`day-type-badge ${dayType}`}>
            {dayType === 'boys' ? 'Boys Day' : 'Girls Day'}
          </div>
          <p className="date-display">{formatDate(date)}</p>
        </div>

        <div className="batch-options">
          <div className="batch-option staff" onClick={handleStaffClick}>
            <div className="option-icon">👥</div>
            <h3>Staff</h3>
            <p>Manage staff batches</p>
          </div>
          
          <div className="batch-option students" onClick={handleBoysGirlsClick}>
            <div className="option-icon">
              {dayType === 'boys' ? '👨‍🎓' : '👩‍🎓'}
            </div>
            <h3>{dayType === 'boys' ? 'Boys' : 'Girls'}</h3>
            <p>Manage {dayType === 'boys' ? 'boys' : 'girls'} batches</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Batch;
