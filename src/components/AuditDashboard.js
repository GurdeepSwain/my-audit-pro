// src/components/AuditDashboard.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { NavLink } from 'react-router-dom';

// Replace with your Firestore document ID for "Layered Process Audit"
const CATEGORY_ID = 'nyz4qcXPvxPjwch0zTmM';

// Compute ISO week "YYYY-W##"
const computeWeek = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

// Format Firestore timestamp into a human time string
const formatTime = (timestamp) => {
  if (!timestamp?.seconds) return '';
  return new Date(timestamp.seconds * 1000).toLocaleTimeString();
};

export default function AuditDashboard({ selectedDate }) {
  const [subcategories, setSubcategories] = useState([]);
  const [audits, setAudits] = useState([]);
  const [error, setError] = useState('');

  // 1) Load subcategories dynamically from Firestore
  useEffect(() => {
    (async () => {
      try {
        const q = query(
          collection(db, 'auditCategories', CATEGORY_ID, 'subcategories'),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        setSubcategories(
          snap.docs.map(d => ({ id: d.id, name: d.data().name }))
        );
      } catch (e) {
        console.error(e);
        setError('Failed to load configuration.');
      }
    })();
  }, []);

  // 2) Fetch audits for the selected date
  useEffect(() => {
    if (!selectedDate) return;

    (async () => {
      try {
        const week  = computeWeek(selectedDate);
        const month = selectedDate.slice(0, 7);

        const dailyQ = query(
          collection(db, 'audits'),
          where('auditType', '==', 'daily'),
          where('date', '==', selectedDate)
        );
        const weeklyQ = query(
          collection(db, 'audits'),
          where('auditType', '==', 'weekly'),
          where('week', '==', week)
        );
        const monthlyQ = query(
          collection(db, 'audits'),
          where('auditType', '==', 'monthly'),
          where('month', '==', month)
        );

        const [dSnap, wSnap, mSnap] = await Promise.all([
          getDocs(dailyQ),
          getDocs(weeklyQ),
          getDocs(monthlyQ)
        ]);

        const all = [];
        dSnap.forEach(d => all.push({ id: d.id, ...d.data() }));
        wSnap.forEach(d => all.push({ id: d.id, ...d.data() }));
        mSnap.forEach(d => all.push({ id: d.id, ...d.data() }));
        setAudits(all);
      } catch (e) {
        console.error(e);
        setError('Error fetching audits: ' + e.message);
      }
    })();
  }, [selectedDate]);

  // 3) Compute status objects once audits & subcategories are loaded
  const { dailyStatus, weeklyStatus, monthlyStatus } = useMemo(() => {
    const daily   = {};
    const weekly  = {};
    const monthly = {};

    subcategories.forEach(({ id }) => {
      daily[id]   = { M: null, D: null, A: null };
      weekly[id]  = { 'Quality Tech': null, 'Operations Manager': null };
      monthly[id] = null;
    });

    audits.forEach(a => {
      const info = {
        id:          a.id,
        createdBy:   a.createdBy,
        lastEditedBy:a.lastEditedBy,
        createdAt:   a.createdAt
      };
      const subId = a.subcategory;
      if (!daily[subId]) return; // skip unknown

      if (a.auditType === 'daily' && a.timeOfDay) {
        daily[subId][a.timeOfDay] ||= info;
      }
      if (a.auditType === 'weekly' && weekly[subId]?.[a.weeklySubType] === null) {
        weekly[subId][a.weeklySubType] = info;
      }
      if (a.auditType === 'monthly' && monthly[subId] === null) {
        monthly[subId] = info;
      }
    });

    return { dailyStatus: daily, weeklyStatus: weekly, monthlyStatus: monthly };
  }, [audits, subcategories]);

  return (
    <div>
      <h2>Audit Dashboard for {selectedDate}</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Daily Audits */}
      <h3>Daily Audits</h3>
      <table className='table table-bordered border-black' style={{ width: '100%', borderCollapse: 'collapse' }} border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Subcategory</th>
            <th>Morning (M)</th>
            <th>Day (D)</th>
            <th>Afternoon (A)</th>
          </tr>
        </thead>
        <tbody>
          {subcategories.map(({ id, name }) => {
            const ds = dailyStatus[id];
            return (
              <tr key={id}>
                <td>{name}</td>
                {['M','D','A'].map(slot => (
                  <td key={slot}>
                    {ds[slot] ? (
                      <>
                        Completed by: {ds[slot].createdBy.email}<br/>
                        Last Edited: {ds[slot].lastEditedBy.email}<br/>
                        Created at: {formatTime(ds[slot].createdAt)}<br/>
                        <NavLink to={`/edit-audit/${ds[slot].id}`}>Edit</NavLink>
                      </>
                    ) : "Pending"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Weekly Audits */}
      <h3>Weekly Audits</h3>
      <table className='table table-bordered border-black' style={{ width: '100%', borderCollapse: 'collapse' }} border="1" cellPadding="8">
        <thead>
          <tr>
            <th rowSpan="2">Subcategory</th>
            <th colSpan="2">Weekly Audit</th>
          </tr>
          <tr>
            <th>Quality Tech</th>
            <th>Operations Manager</th>
          </tr>
        </thead>
        <tbody>
          {subcategories.map(({ id, name }) => {
            const ws = weeklyStatus[id];
            return (
              <tr key={id}>
                <td>{name}</td>
                {['Quality Tech','Operations Manager'].map(type => (
                  <td key={type}>
                    {ws[type] ? (
                      <>
                        Completed by: {ws[type].createdBy.email}<br/>
                        Last Edited: {ws[type].lastEditedBy.email}<br/>
                        Created at: {formatTime(ws[type].createdAt)}<br/>
                        <NavLink to={`/edit-audit/${ws[type].id}`}>Edit</NavLink>
                      </>
                    ) : "Pending"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Monthly Audits */}
      <h3>Monthly Audits</h3>
      <table className='table table-bordered border-black' style={{ width: '100%', borderCollapse: 'collapse' }} border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Subcategory</th>
            <th>Status</th>
            <th>Details / Edit</th>
          </tr>
        </thead>
        <tbody>
          {subcategories.map(({ id, name }) => {
            const ms = monthlyStatus[id];
            return (
              <tr key={id}>
                <td>{name}</td>
                <td>{ms ? "Completed" : "Pending"}</td>
                <td>
                  {ms && (
                    <>
                      Completed by: {ms.createdBy.email}<br/>
                      Last Edited: {ms.lastEditedBy.email}<br/>
                      Created at: {formatTime(ms.createdAt)}<br/>
                      <NavLink to={`/edit-audit/${ms.id}`}>Edit</NavLink>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
