// src/components/RangeAuditDashboard.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NavLink } from 'react-router-dom';
import questionsConfig from '../configs/layeredProcessAudit.json';

// Helper function to compute ISO week (format "YYYY-W##")
// Basic implementation; for more robust handling consider using a library.
const computeWeek = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay() === 0 ? 7 : date.getDay(); // treat Sunday as 7
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const RangeAuditDashboard = () => {
  const [auditType, setAuditType] = useState("daily"); // "daily", "weekly", or "monthly"
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handler to fetch audits based on selected audit type and range.
  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const auditsRef = collection(db, 'audits');
      let q;
      if (auditType === "daily") {
        q = query(
          auditsRef,
          where('date', '>=', start),
          where('date', '<=', end),
          where('auditType', '==', 'daily')
        );
      } else if (auditType === "weekly") {
        q = query(
          auditsRef,
          where('week', '>=', start),
          where('week', '<=', end),
          where('auditType', '==', 'weekly')
        );
      } else if (auditType === "monthly") {
        q = query(
          auditsRef,
          where('month', '>=', start),
          where('month', '<=', end),
          where('auditType', '==', 'monthly')
        );
      }
      const snapshot = await getDocs(q);
      const fetchedAudits = [];
      snapshot.forEach(doc => {
        fetchedAudits.push({ id: doc.id, ...doc.data() });
      });
      setAudits(fetchedAudits);
    } catch (err) {
      setError("Error fetching audits: " + err.message);
    }
    setLoading(false);
  };

  // Convert JSON data to CSV format.
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(","));
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header] !== undefined ? row[header] : "";
        const escaped = (''+val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    });
    return csvRows.join("\n");
  };

  // Download audits as CSV.
  const handleDownload = () => {
    const csvData = convertToCSV(audits);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute('download', `${auditType}-audits.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render range input fields based on auditType.
  const renderRangeInputs = () => {
    if (auditType === "daily") {
      return (
        <>
          <label>Start Date: </label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <label style={{ marginLeft: '10px' }}>End Date: </label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </>
      );
    } else if (auditType === "weekly") {
      return (
        <>
          <label>Start Week: </label>
          <input type="week" value={start} onChange={(e) => setStart(e.target.value)} />
          <label style={{ marginLeft: '10px' }}>End Week: </label>
          <input type="week" value={end} onChange={(e) => setEnd(e.target.value)} />
        </>
      );
    } else if (auditType === "monthly") {
      return (
        <>
          <label>Start Month: </label>
          <input type="month" value={start} onChange={(e) => setStart(e.target.value)} />
          <label style={{ marginLeft: '10px' }}>End Month: </label>
          <input type="month" value={end} onChange={(e) => setEnd(e.target.value)} />
        </>
      );
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Range Audit Dashboard</h2>
      <div>
        <label>Select Audit Type: </label>
        <select 
          value={auditType} 
          onChange={(e) => { 
            setAuditType(e.target.value); 
            setStart(""); 
            setEnd(""); 
          }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div style={{ marginTop: '10px' }}>
        {renderRangeInputs()}
      </div>
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleSearch} disabled={loading || !start || !end}>Search</button>
      </div>
      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      {loading && <div>Loading audits...</div>}
      {audits.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Audit Results</h3>
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Audit Type</th>
                <th>Subcategory</th>
                <th>Additional Info</th>
                <th>Audit Content</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(audit => (
                <tr key={audit.id}>
                  <td>{audit.id}</td>
                  <td>{audit.date}</td>
                  <td>{audit.auditType}</td>
                  <td>{audit.subcategory}</td>
                  <td>
                    {audit.auditType === 'daily' && audit.timeOfDay && <>Time: {audit.timeOfDay}</>}
                    {audit.auditType === 'weekly' && audit.week && <>Week: {audit.week}</>}
                    {audit.auditType === 'monthly' && audit.month && <>Month: {audit.month}</>}
                  </td>
                  <td>{getAuditContentSummary(audit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleDownload} style={{ marginTop: '10px' }}>Download CSV</button>
        </div>
      )}
    </div>
  );
};

export default RangeAuditDashboard;

// Helper function to build a summary of the audit content.
const getAuditContentSummary = (audit) => {
  if (!audit.answers || !audit.subcategory) return "";
  const config = questionsConfig[audit.subcategory];
  if (!config) return "";
  let summaryArr = [];
  for (const section in audit.answers) {
    const questions = config[section];
    if (!questions) continue;
    let sectionSummary = `Section ${section}: `;
    for (const qId in audit.answers[section]) {
      const answerVal = audit.answers[section][qId];
      let answerText = "";
      if (typeof answerVal === "object") {
        answerText = answerVal.answer;
        if (answerVal.answer === "Not Satisfactory" && answerVal.issue && answerVal.issue.problemDescription) {
          answerText += ` (Issue: ${answerVal.issue.problemDescription})`;
        }
      } else {
        answerText = answerVal;
      }
      const questionObj = questions.find(q => q.id.toString() === qId);
      if (questionObj) {
        sectionSummary += `${questionObj.question}: ${answerText}; `;
      }
    }
    summaryArr.push(sectionSummary);
  }
  return summaryArr.join(" | ");
};
