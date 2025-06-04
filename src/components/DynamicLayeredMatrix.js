// src/components/DynamicLayeredMatrix.jsx

import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Days & time‐slots
const daysOfWeek     = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const dailyTimeSlots = ["M","D","A"];

// Firestore “Layered Process Audit” category ID
const CATEGORY_ID = 'nyz4qcXPvxPjwch0zTmM';

/**
 * Given an ISO‐week string (e.g. "2025-W22"), return an array of
 * seven date‐strings ("YYYY-MM-DD") corresponding to Sunday → Saturday of that week.
 */
const getDatesForWeekSunday = (weekString) => {
  if (!weekString) return [];
  const [year, w] = weekString.split("-W");
  const weekNum  = parseInt(w, 10);
  const jan4     = new Date(year, 0, 4);
  const offset   = (jan4.getDay() === 0 ? 1 : jan4.getDay() - 1);
  const mon1     = new Date(jan4);
  // Monday of Week 1:
  mon1.setDate(jan4.getDate() - offset + (weekNum - 1) * 7);
  // Sunday before that Monday:
  const sun = new Date(mon1);
  sun.setDate(mon1.getDate() - 1);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
};

/**
 * Look up answers[questionId] in the (flat) answers object first.
 * If not found, fall back to nested “section → questionId → answer” structure.
 */
const getAnswerForQuestion = (answers, questionId) => {
  if (!answers) return null;

  // 1) Directly check if answers is flat (answers[questionId] exists)
  if (answers[questionId] !== undefined) {
    const entry = answers[questionId];
    // If it’s an object (e.g. { answer: "...", issue: {...} }), return entry.answer
    return typeof entry === 'object' ? entry.answer : entry;
  }

  // 2) Otherwise, possibly “answers” is grouped by section:
  for (let sectionKey in answers) {
    const sectionValue = answers[sectionKey];
    if (sectionValue && sectionValue[questionId] !== undefined) {
      const entry = sectionValue[questionId];
      return typeof entry === 'object' ? entry.answer : entry;
    }
  }

  return null;
};

/** Firestore timestamp → locale time string, e.g. "9:45:12 AM" */
const formatTime = (ts) =>
  ts?.seconds ? new Date(ts.seconds * 1000).toLocaleTimeString() : '';

export default function DynamicLayeredMatrix({
  // (1) the Firestore‐ID of the chosen subcategory
  subcategoryId,
  // (2) the human‐readable name of the same subcategory (for display/csv header)
  subcategoryName,
  // (3) the chosen ISO‐week, e.g. "2025-W22"
  selectedWeek
}) {
  const [questions,    setQuestions]    = useState([]);
  const [loadingQ,     setLoadingQ]     = useState(true);
  const [dailyAudits,  setDailyAudits]  = useState([]);
  const [weeklyAudits, setWeeklyAudits] = useState([]);
  const [monthlyAudit, setMonthlyAudit] = useState(null);
  const [error,        setError]        = useState('');

  // ────────────────────────────────────────────────────────────────────────────
  // 1) Load questions for the chosen subcategory (ascending by "order" field).
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subcategoryId) {
      setQuestions([]);
      setLoadingQ(false);
      return;
    }
    setLoadingQ(true);

    (async () => {
      try {
        const q = query(
          collection(
            db,
            'auditCategories',
            CATEGORY_ID,
            'subcategories',
            subcategoryId,
            'questions'
          ),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setQuestions(list);
      } catch (e) {
        console.error("Error loading questions:", e);
        setError('Failed to load questions.');
      } finally {
        setLoadingQ(false);
      }
    })();
  }, [subcategoryId]);

  // ────────────────────────────────────────────────────────────────────────────
  // 2) Load all audit‐documents for the selected week + subcategoryId.
  //    We do three separate queries (daily / weekly / monthly).
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedWeek || !subcategoryId) {
      return;
    }

    (async () => {
      try {
        const weekDates  = getDatesForWeekSunday(selectedWeek);
        const monthGuess = weekDates[0]?.slice(0, 7) ?? "";

        // Daily audits for that week/subcategory:
        const dailyQ = query(
          collection(db, 'audits'),
          where('week', '==', selectedWeek),
          where('subcategory', '==', subcategoryId),
          where('auditType', '==', 'daily')
        );

        // Weekly audits for that week/subcategory:
        const weeklyQ = query(
          collection(db, 'audits'),
          where('week', '==', selectedWeek),
          where('subcategory', '==', subcategoryId),
          where('auditType', '==', 'weekly')
        );

        // Monthly audit for monthGuess/subcategory:
        const monthlyQ = query(
          collection(db, 'audits'),
          where('month', '==', monthGuess),
          where('subcategory', '==', subcategoryId),
          where('auditType', '==', 'monthly')
        );

        const [dSnap, wSnap, mSnap] = await Promise.all([
          getDocs(dailyQ),
          getDocs(weeklyQ),
          getDocs(monthlyQ)
        ]);

        setDailyAudits(
          dSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        );
        setWeeklyAudits(
          wSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        );
        setMonthlyAudit(
          mSnap.docs.length
            ? { id: mSnap.docs[0].id, ...mSnap.docs[0].data() }
            : null
        );
      } catch (e) {
        console.error("Error fetching audit data:", e);
        setError('Failed to fetch audit data.');
      }
    })();
  }, [selectedWeek, subcategoryId]);

  if (loadingQ) return <div>Loading questions…</div>;
  if (error)    return <div style={{ color: 'red' }}>{error}</div>;
  if (!questions.length) {
    return <div>No questions configured for “{subcategoryName}”.</div>;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Flatten the question list into a simple [ { questionId, questionText }, … ]
  // ────────────────────────────────────────────────────────────────────────────
  const questionRows = questions.map(q => ({
    questionId:   q.id,
    questionText: q.text
  }));
  const weekDates = getDatesForWeekSunday(selectedWeek);

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers to look up “mark” (√ / X / N/A) given a questionId:
  // ────────────────────────────────────────────────────────────────────────────
  const getDailyMark = (dayName, slot, qId) => {
    for (let da of dailyAudits) {
      if (da.timeOfDay === slot) {
        // date string e.g. "2025-05-29"
        const dt = new Date(da.date + 'T00:00:00');
        if (daysOfWeek[dt.getDay()] === dayName) {
          const v = getAnswerForQuestion(da.answers, qId);
          if (v === 'Satisfactory')     return '√';
          if (v === 'Not Satisfactory') return 'X';
          if (v === 'Not Applicable')   return 'N/A';
        }
      }
    }
    return '';
  };

  const getWeeklyMark = (type, qId) => {
    const doc = weeklyAudits.find(w => w.weeklySubType === type);
    if (doc?.answers) {
      const v = getAnswerForQuestion(doc.answers, qId);
      if (v === 'Satisfactory')     return '√';
      if (v === 'Not Satisfactory') return 'X';
      if (v === 'Not Applicable')   return 'N/A';
    }
    return '';
  };

  const getMonthlyMark = (qId) => {
    if (monthlyAudit?.answers) {
      const v = getAnswerForQuestion(monthlyAudit.answers, qId);
      if (v === 'Satisfactory')     return '√';
      if (v === 'Not Satisfactory') return 'X';
      if (v === 'Not Applicable')   return 'N/A';
    }
    return '';
  };

  // ────────────────────────────────────────────────────────────────────────────
  // CSV / PDF Export Helpers (identical logic, except header text uses subcategoryName)
  // ────────────────────────────────────────────────────────────────────────────
  const convertMatrixToCSV = () => {
    const totalDailyCols = daysOfWeek.length * dailyTimeSlots.length;
    const totalCols      = 1 + totalDailyCols + 3;
    const rows           = [];

    // Title‐row:
    const titleRow = Array(totalCols).fill('');
    titleRow[0] = `Layered Process Audit – ${subcategoryName}`;
    rows.push(titleRow.join(','));

    // Blank row:
    rows.push(Array(totalCols).fill('').join(','));

    // Header row #1
    const h1 = ['Audit Items'];
    for (let i = 0; i < totalDailyCols; i++) {
      h1.push('Layer 1 – Daily by Supervisors');
    }
    h1.push(
      'Weekly Audit by Quality Tech',
      'Weekly Audit by Operations Manager',
      'Monthly Audit by Site/Quality Manager'
    );
    rows.push(h1.join(','));

    // Header row #2 (Day names)
    const h2 = [''];
    daysOfWeek.forEach(day => {
      dailyTimeSlots.forEach(() => h2.push(day));
    });
    h2.push('','','');
    rows.push(h2.join(','));

    // Header row #3 (Actual dates)
    const h3 = [''];
    weekDates.forEach(dt => {
      dailyTimeSlots.forEach(() => h3.push(dt));
    });
    h3.push('','','');
    rows.push(h3.join(','));

    // Header row #4 (Time‐slots M, D, A)
    const h4 = [''];
    daysOfWeek.forEach(() => {
      dailyTimeSlots.forEach(slot => h4.push(slot));
    });
    h4.push('','','');
    rows.push(h4.join(','));

    // Data rows (questions × marks)
    questionRows.forEach((row, idx) => {
      const line = [`"${idx + 1}. ${row.questionText}"`];
      daysOfWeek.forEach(day => {
        dailyTimeSlots.forEach(slot => {
          line.push(`"${getDailyMark(day, slot, row.questionId)}"`);
        });
      });
      line.push(
        `"${getWeeklyMark('Quality Tech', row.questionId)}"`,
        `"${getWeeklyMark('Operations Manager', row.questionId)}"`,
        `"${getMonthlyMark(row.questionId)}"`
      );
      rows.push(line.join(','));
    });

    // Legend row
    rows.push('');
    rows.push(`"Legend: √ = Satisfactory, X = Not Satisfactory, N/A = Not Applicable"`);

    return rows.join('\n');
  };

  const handleDownloadCSV = () => {
    const blob = new Blob([convertMatrixToCSV()], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `LayeredAuditMatrix_${subcategoryName}_${selectedWeek}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPDF = () => {
    const input = document.getElementById('matrixTable');
    if (!input) return;

    html2canvas(input, { scale: 2 }).then(canvas => {
      const img = canvas.toDataURL('image/jpeg', 0.5);
      const pdf = new jsPDF('p','pt','a4');
      const w   = pdf.internal.pageSize.getWidth();
      const h   = pdf.internal.pageSize.getHeight();

      // Header text:
      pdf.setFontSize(12);
      pdf.text(
        `Category: Layered Process Audit\nSubcategory: ${subcategoryName}\nWeek: ${selectedWeek}`,
        20,
        30
      );

      const scaleFactor = Math.min(w / canvas.width, (h - 60) / canvas.height);
      pdf.addImage(
        img,
        'JPEG',
        (w - canvas.width * scaleFactor) / 2,
        60,
        canvas.width * scaleFactor,
        canvas.height * scaleFactor
      );
      pdf.save(`LayeredAuditMatrix_${subcategoryName}_${selectedWeek}.pdf`);
    }).catch(err => console.error('PDF export error:', err));
  };

  return (
    <div style={{ overflowX:'visible', width:'100%' }}>
      <h3>Layered Process Audit – {subcategoryName}</h3>
      <p>Week: {selectedWeek}</p>

      <table
        id="matrixTable"
        border="1"
        cellPadding="5"
        style={{ borderCollapse:'collapse', minWidth:'1200px' }}
      >
        <thead>
          <tr>
            <th rowSpan="4">Audit Items</th>
            <th colSpan={daysOfWeek.length * dailyTimeSlots.length}>
              Layer 1 – Daily by Supervisors
            </th>
            <th rowSpan="4">Weekly Audit by Quality Tech</th>
            <th rowSpan="4">Weekly Audit by Operations Manager</th>
            <th rowSpan="4">Monthly Audit by Site/Quality Manager</th>
          </tr>
          <tr>
            {daysOfWeek.map(day => (
              <th key={day} colSpan={dailyTimeSlots.length}>{day}</th>
            ))}
          </tr>
          <tr>
            {weekDates.map(dt => (
              <th key={dt} colSpan={dailyTimeSlots.length}>{dt}</th>
            ))}
          </tr>
          <tr>
            {daysOfWeek.map(() =>
              dailyTimeSlots.map(slot => (
                <th key={slot}>{slot}</th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {questionRows.map((row, idx) => (
            <tr key={row.questionId}>
              <td>{idx + 1}. {row.questionText}</td>
              {daysOfWeek.map(day =>
                dailyTimeSlots.map(slot => (
                  <td
                    key={`${day}-${slot}-${row.questionId}`}
                    style={{ textAlign: 'center' }}
                  >
                    {getDailyMark(day, slot, row.questionId)}
                  </td>
                ))
              )}
              <td style={{ textAlign: 'center' }}>
                {getWeeklyMark('Quality Tech', row.questionId)}
              </td>
              <td style={{ textAlign: 'center' }}>
                {getWeeklyMark('Operations Manager', row.questionId)}
              </td>
              <td style={{ textAlign: 'center' }}>
                {getMonthlyMark(row.questionId)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20 }}>
        <strong>Legend:</strong> √ = Satisfactory | X = Not Satisfactory | N/A = Not Applicable
      </div>
      <button onClick={handleDownloadCSV} style={{ marginRight: 10 }}>
        Download CSV
      </button>
      <button onClick={handleDownloadPDF}>
        Download PDF
      </button>
    </div>
  );
}
