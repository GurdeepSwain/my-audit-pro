// src/components/AuditDashboard.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NavLink } from 'react-router-dom';

// Define your subcategories for "Layered Process Audit"
const subcategories = ["FIP 1", "FIP 2", "Conventional"];

const AuditDashboard = ({ selectedDate }) => {
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    const fetchAudits = async () => {
      // Assume selectedDate is a string in YYYY-MM-DD format
      const auditsQuery = query(
        collection(db, 'audits'),
        where('date', '==', selectedDate)
      );
      const snapshot = await getDocs(auditsQuery);
      const fetchedAudits = [];
      snapshot.forEach(doc => {
        fetchedAudits.push({ id: doc.id, ...doc.data() });
      });
      setAudits(fetchedAudits);
    };

    fetchAudits();
  }, [selectedDate]);

  // Instead of booleans, store audit details (id and user info) for each completed audit.
  const dailyStatus = {};
  const weeklyStatus = {};
  const monthlyStatus = {};

  // Initialize status objects for each subcategory.
  subcategories.forEach(subcat => {
    dailyStatus[subcat] = { M: null, D: null, A: null };
    weeklyStatus[subcat] = null;
    monthlyStatus[subcat] = null;
  });

  // Process each fetched audit document.
  audits.forEach(audit => {
    const { auditType, subcategory, timeOfDay, createdBy, lastEditedBy } = audit;
    if (!subcategories.includes(subcategory)) return; // Skip if subcategory is not defined

    const auditInfo = { id: audit.id, createdBy, lastEditedBy };

    if (auditType === 'daily') {
      if (timeOfDay && !dailyStatus[subcategory][timeOfDay]) {
        dailyStatus[subcategory][timeOfDay] = auditInfo;
      }
    } else if (auditType === 'weekly') {
      if (!weeklyStatus[subcategory]) {
        weeklyStatus[subcategory] = auditInfo;
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
      
      {/* Daily Audits Section */}
      <h3>Daily Audits</h3>
      <table border="1" cellPadding="8">
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
      <table border="1" cellPadding="8">
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
              <td>{weeklyStatus[subcat] ? "Completed" : "Pending"}</td>
              <td>
                {weeklyStatus[subcat] && (
                  <>
                    Completed by: {weeklyStatus[subcat].createdBy.email}<br />
                    Last Edited: {weeklyStatus[subcat].lastEditedBy.email}<br />
                    <NavLink to={`/edit-audit/${weeklyStatus[subcat].id}`}>Edit</NavLink>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Monthly Audits Section */}
      <h3>Monthly Audits</h3>
      <table border="1" cellPadding="8">
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
