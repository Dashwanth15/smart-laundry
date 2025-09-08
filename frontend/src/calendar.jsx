import React, { useMemo, useState } from 'react';
import './App.css';
import './styles.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function buildMonthDays(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstOfMonth.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startDayOfWeek; i += 1) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    days.push(new Date(year, month, d));
  }
  // Pad trailing blanks so the grid completes full weeks (multiples of 7)
  const remainder = days.length % 7;
  if (remainder !== 0) {
    const toAdd = 7 - remainder;
    for (let i = 0; i < toAdd; i += 1) days.push(null);
  }
  return days;
}

function getDayType(date) {
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 0) return 'holiday'; // Sunday
  if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) return 'boys'; // Monday, Wednesday, Friday
  if (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6) return 'girls'; // Tuesday, Thursday, Saturday
  
  return 'normal';
}

function getDayTypeLabel(dayType) {
  switch (dayType) {
    case 'holiday': return 'Holiday';
    case 'boys': return 'Boys';
    case 'girls': return 'Girls';
    default: return '';
  }
}

function Calendar() {
  const [activeDate, setActiveDate] = useState(new Date());

  const days = useMemo(() => buildMonthDays(activeDate), [activeDate]);
  const monthLabel = activeDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const goPrev = () => setActiveDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setActiveDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const today = new Date();
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Get current month info
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const isCurrentMonth = activeDate.getMonth() === currentMonth && activeDate.getFullYear() === currentYear;

  const handleDateClick = (dateObj) => {
    if (!dateObj) return;
    
    const dayType = getDayType(dateObj);
    if (dayType === 'holiday') {
      toast.info('Holidays are not available for batch scheduling', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      return;
    }
    
    // Format date for URL - use local date to avoid timezone issues
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const dayTypeParam = dayType;
    
    // Redirect to batch page with date and day type
    window.location.href = `/batch/${dateString}/${dayTypeParam}`;
  };

  return (
    <div className="calendar-page">
      <ToastContainer />
      <div className="calendar-card">
        <div className="calendar-header">
          <button onClick={goPrev} aria-label="Previous Month">‹</button>
          <h2>{monthLabel}</h2>
          <button onClick={goNext} aria-label="Next Month">›</button>
        </div>

        {/* Month information */}
        <div className="month-info">
          <div className="current-month-indicator">
            {isCurrentMonth ? (
              <span className="current-month-badge">Current Month</span>
            ) : (
              <span className="other-month-badge">
                {activeDate.getMonth() > currentMonth ? 'Future Month' : 'Past Month'}
              </span>
            )}
          </div>
          <div className="month-stats">
            <div className="stat-item">
              <span className="stat-label">Total Days:</span>
              <span className="stat-value">{days.filter(d => d !== null).length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Holidays:</span>
              <span className="stat-value">{days.filter(d => d && getDayType(d) === 'holiday').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Boys Days:</span>
              <span className="stat-value">{days.filter(d => d && getDayType(d) === 'boys').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Girls Days:</span>
              <span className="stat-value">{days.filter(d => d && getDayType(d) === 'girls').length}</span>
            </div>
          </div>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-cell calendar-dow">{d}</div>
          ))}
          {days.map((dateObj, idx) => {
            if (!dateObj) {
              return (
                <div key={idx} className="calendar-cell calendar-empty"></div>
              );
            }

            const dayType = getDayType(dateObj);
            const dayTypeLabel = getDayTypeLabel(dayType);
            const isToday = isSameDay(dateObj, today);
            const isClickable = dayType !== 'holiday';

            return (
              <div
                key={idx}
                className={`calendar-cell ${dayType} ${isToday ? 'calendar-today' : ''} ${isClickable ? 'calendar-clickable' : ''}`}
                onClick={() => handleDateClick(dateObj)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div className="day-number">{dateObj.getDate()}</div>
                {dayTypeLabel && (
                  <div className="day-type-label">{dayTypeLabel}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color holiday"></div>
            <span>Holidays (Sundays)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color boys"></div>
            <span>Boys (Mon, Wed, Fri)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color girls"></div>
            <span>Girls (Tue, Thu, Sat)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calendar;


