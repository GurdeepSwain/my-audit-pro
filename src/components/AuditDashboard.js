// src/components/AuditDashboard.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NavLink } from 'react-router-dom';

// Define your subcategories for "Layered Process Audit"
const subcategories = ["FIP 1", "FIP 2", "Conventional"];

// Helper function to compute ISO week (format "YYYY-W##")
// This is a basic implementation. For more robust handling, consider using a library like date-fns.
const computeWeek = (dateString) => {
  const date = new Date(dateString);
  // Set to nearest Thursday: current date + 4 - current day number (with Sunday as 7)
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const AuditDashboard = ({ selectedDate }) => {
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        // Compute week and month based on selectedDate
        const computedWeek = computeWeek(selectedDate);
        const computedMonth = selectedDate.slice(0, 7); // "YYYY-MM"
        
        // Build queries for daily, weekly, and monthly audits
        const dailyQuery = query(
          collection(db, 'audits'),
          where('date', '==', selectedDate),
          where('auditType', '==', 'daily')
        );
        const weeklyQuery = query(
          collection(db, 'audits'),
          where('week', '==', computedWeek),
          where('auditType', '==', 'weekly')
        );
        const monthlyQuery = query(
          collection(db, 'audits'),
          where('month', '==', computedMonth),
          where('auditType', '==', 'monthly')
        );

        // Run all queries concurrently
        const [dailySnapshot, weeklySnapshot, monthlySnapshot] = await Promise.all([
          getDocs(dailyQuery),
          getDocs(weeklyQuery),
          getDocs(monthlyQuery)
        ]);

        const fetchedAudits = [];
        dailySnapshot.forEach(doc => fetchedAudits.push({ id: doc.id, ...doc.data() }));
        weeklySnapshot.forEach(doc => fetchedAudits.push({ id: doc.id, ...doc.data() }));
        monthlySnapshot.forEach(doc => fetchedAudits.push({ id: doc.id, ...doc.data() }));

        setAudits(fetchedAudits);
      } catch (err) {
        setError("Error fetching audits: " + err.message);
      }
    };

    if (selectedDate) {
      fetchAudits();
    }
  }, [selectedDate]);

  // Prepare status objects for each audit type and subcategory.
  const dailyStatus = {};
  const weeklyStatus = {};
  const monthlyStatus = {};

  // Initialize daily and monthly statuses as before.
  subcategories.forEach(subcat => {
    dailyStatus[subcat] = { M: null, D: null, A: null };
    monthlyStatus[subcat] = null;
    // For weekly audits, initialize as an object with both types.
    weeklyStatus[subcat] = {
      "Quality Tech": null,
      "Operations Manager": null
    };
  });

  // Process each fetched audit document.
  audits.forEach(audit => {
    const { auditType, subcategory, timeOfDay, createdBy, lastEditedBy, weeklySubType } = audit;
    if (!subcategories.includes(subcategory)) return; // Skip if subcategory is not defined

    const auditInfo = { id: audit.id, createdBy, lastEditedBy };

    if (auditType === 'daily') {
      if (timeOfDay && !dailyStatus[subcategory][timeOfDay]) {
        dailyStatus[subcategory][timeOfDay] = auditInfo;
      }
    } else if (auditType === 'weekly') {
      // Use weeklySubType to differentiate the two types of weekly audits.
      if (weeklySubType === "Quality Tech" && !weeklyStatus[subcategory]["Quality Tech"]) {
        weeklyStatus[subcategory]["Quality Tech"] = auditInfo;
      } else if (weeklySubType === "Operations Manager" && !weeklyStatus[subcategory]["Operations Manager"]) {
        weeklyStatus[subcategory]["Operations Manager"] = auditInfo;
      }
    } else if (auditType === 'monthly') {
      if (!monthlyStatus[subcategory]) {
        monthlyStatus[subcategory] = auditInfo;
      }
    }
  });

  return (
    <div>
      <h2>Audit Dashboard for {selectedDate}</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      {/* Daily Audits Section */}
      <h3>Daily Audits</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Subcategory</th>
            <th>Morning (M)</th>
            <th>Day (D)</th>
            <th>Afternoon (A)</th>
          </tr>
        </thead>
        <tbody>
          {subcategories.map(subcat => (
            <tr key={subcat}>
              <td>{subcat}</td>
              <td>
                {dailyStatus[subcat].M ? (
                  <>
                    Completed by: {dailyStatus[subcat].M.createdBy.email}<br />
                    Last Edited: {dailyStatus[subcat].M.lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${dailyStatus[subcat].M.id}`}>Edit</NavLink>
                  </>
                ) : "Pending"}
              </td>
              <td>
                {dailyStatus[subcat].D ? (
                  <>
                    Completed by: {dailyStatus[subcat].D.createdBy.email}<br />
                    Last Edited: {dailyStatus[subcat].D.lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${dailyStatus[subcat].D.id}`}>Edit</NavLink>
                  </>
                ) : "Pending"}
              </td>
              <td>
                {dailyStatus[subcat].A ? (
                  <>
                    Completed by: {dailyStatus[subcat].A.createdBy.email}<br />
                    Last Edited: {dailyStatus[subcat].A.lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${dailyStatus[subcat].A.id}`}>Edit</NavLink>
                  </>
                ) : "Pending"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Weekly Audits Section */}
      <h3>Weekly Audits</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan="2">Subcategory</th>
            <th colSpan="2">Weekly Audit Status</th>
          </tr>
          <tr>
            <th>Quality Tech</th>
            <th>Operations Manager</th>
          </tr>
        </thead>
        <tbody>
          {subcategories.map(subcat => (
            <tr key={subcat}>
              <td>{subcat}</td>
              <td>
                {weeklyStatus[subcat]["Quality Tech"] ? (
                  <>
                    Completed by: {weeklyStatus[subcat]["Quality Tech"].createdBy.email}<br />
                    Last Edited: {weeklyStatus[subcat]["Quality Tech"].lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${weeklyStatus[subcat]["Quality Tech"].id}`}>Edit</NavLink>
                  </>
                ) : "Pending"}
              </td>
              <td>
                {weeklyStatus[subcat]["Operations Manager"] ? (
                  <>
                    Completed by: {weeklyStatus[subcat]["Operations Manager"].createdBy.email}<br />
                    Last Edited: {weeklyStatus[subcat]["Operations Manager"].lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${weeklyStatus[subcat]["Operations Manager"].id}`}>Edit</NavLink>
                  </>
                ) : "Pending"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Monthly Audits Section */}
      <h3>Monthly Audits</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Subcategory</th>
            <th>Status</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {subcategories.map(subcat => (
            <tr key={subcat}>
              <td>{subcat}</td>
              <td>{monthlyStatus[subcat] ? "Completed" : "Pending"}</td>
              <td>
                {monthlyStatus[subcat] && (
                  <>
                    Completed by: {monthlyStatus[subcat].createdBy.email}<br />
                    Last Edited: {monthlyStatus[subcat].lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${monthlyStatus[subcat].id}`}>Edit</NavLink>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditDashboard;
