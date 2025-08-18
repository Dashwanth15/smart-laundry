import React, { useMemo, useState } from 'react';
import './App.css';
import './styles.css';

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

function Calendar() {
  const [activeDate, setActiveDate] = useState(new Date());

  const days = useMemo(() => buildMonthDays(activeDate), [activeDate]);
  const monthLabel = activeDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const goPrev = () => setActiveDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () => setActiveDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const today = new Date();
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <div className="calendar-page">
      <div className="calendar-card">
        <div className="calendar-header">
          <button onClick={goPrev} aria-label="Previous Month">‹</button>
          <h2>{monthLabel}</h2>
          <button onClick={goNext} aria-label="Next Month">›</button>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-cell calendar-dow">{d}</div>
          ))}
          {days.map((dateObj, idx) => (
            <div
              key={idx}
              className={`calendar-cell ${dateObj ? '' : 'calendar-empty'} ${dateObj && isSameDay(dateObj, today) ? 'calendar-today' : ''}`}
            >
              {dateObj ? dateObj.getDate() : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Calendar;


