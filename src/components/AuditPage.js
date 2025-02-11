import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AuditDashboard from './AuditDashboard';

const AuditPage = () => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <h1>Audit Entry Dashboard</h1>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="datePicker" style={{ marginRight: '10px' }}>
          Select Date:
        </label>
        <input
          id="datePicker"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>
      <AuditDashboard selectedDate={selectedDate} />
      <div style={{ marginTop: '20px' }}>
        <h2>Audit Forms</h2>
        <ul>
          <li>
            <NavLink to="/daily">Daily Audit</NavLink>
          </li>
          <li>
            <NavLink to="/weekly">Weekly Audit</NavLink>
          </li>
          <li>
            <NavLink to="/monthly">Monthly Audit</NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AuditPage;
