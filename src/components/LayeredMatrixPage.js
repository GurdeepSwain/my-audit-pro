// src/components/LayeredMatrixPage.jsx
import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import DynamicLayeredMatrix from './DynamicLayeredMatrix';

const CATEGORY_ID = 'nyz4qcXPvxPjwch0zTmM';  // your "Layered Process Audit" doc ID

export default function LayeredMatrixPage() {
  const [subs, setSubs] = useState([]);
  const [selectedSub, setSelectedSub] = useState('');
  const [week,       setWeek]       = useState(() => {
    // default to today's ISO week: "YYYY-Www"
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  });

  // 1) load subcategories from Firestore
  useEffect(() => {
    (async () => {
      const q = query(
        collection(db, 'auditCategories', CATEGORY_ID, 'subcategories'),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id:   d.id,
        name: d.data().name
      }));
      setSubs(list);
      if (list.length) setSelectedSub(list[0].id);
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Layered Process Audit Matrix</h1>

      {/* Subcategory selector */}
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 8 }}>Subcategory:</label>
        <select
          value={selectedSub}
          onChange={e => setSelectedSub(e.target.value)}
        >
          {subs.map(sc => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Week picker */}
      <div style={{ marginBottom: 30 }}>
        <label style={{ marginRight: 8 }}>Select Week:</label>
        <input
          type="week"
          value={week}
          onChange={e => setWeek(e.target.value)}
        />
      </div>

      {/* Render the matrix */}
      {selectedSub && week && (
        <DynamicLayeredMatrix
          subcategoryId   ={selectedSub}
          subcategoryName ={subs.find(s=>s.id===selectedSub)?.name}
          selectedWeek    ={week}
        />
      )}
    </div>
  );
}
