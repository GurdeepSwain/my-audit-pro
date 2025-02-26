// src/components/DynamicLayeredMatrix.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import questionsConfig from '../configs/layeredProcessAudit.json';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Days of the week & timeslots for daily audits
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dailyTimeSlots = ["M", "D", "A"];

/**
 * Given an ISO week string (e.g., "2025-W09"), returns an array of date strings
 * (YYYY-MM-DD) for Sunday through Saturday of that week.
 */
const getDatesForWeekSunday = (weekString) => {
  const [year, weekPart] = weekString.split("-W");
  const weekNumber = parseInt(weekPart, 10);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay();
  const diffToMonday = jan4Day === 0 ? 1 : jan4Day - 1;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - diffToMonday);
  const monday = new Date(mondayWeek1);
  monday.setDate(monday.getDate() + (weekNumber - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

/**
 * Helper function to search through the nested answers object to find the answer
 * for a given questionId. Assumes answers are grouped by section.
 */
const getAnswerForQuestion = (answers, questionId) => {
  if (!answers) return null;
  for (const section in answers) {
    if (answers[section] && answers[section][questionId] !== undefined) {
      const answerEntry = answers[section][questionId];
      return typeof answerEntry === 'object' ? answerEntry.answer : answerEntry;
    }
  }
  return null;
};

function DynamicLayeredMatrix({ selectedWeek, subcategory }) {
  const [dailyAudits, setDailyAudits] = useState([]);
  const [weeklyAudits, setWeeklyAudits] = useState([]);
  const [monthlyAudit, setMonthlyAudit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const weekDates = getDatesForWeekSunday(selectedWeek);
        // Derive month from the first day (Sunday)
        const guessedMonth = weekDates[0].slice(0, 7);

        // Build queries for daily, weekly, and monthly audits.
        const dailyQ = query(
          collection(db, 'audits'),
          where('week', '==', selectedWeek),
          where('subcategory', '==', subcategory),
          where('auditType', '==', 'daily')
        );
        const weeklyQ = query(
          collection(db, 'audits'),
          where('week', '==', selectedWeek),
          where('subcategory', '==', subcategory),
          where('auditType', '==', 'weekly')
        );
        const monthlyQ = query(
          collection(db, 'audits'),
          where('month', '==', guessedMonth),
          where('subcategory', '==', subcategory),
          where('auditType', '==', 'monthly')
        );

        const [dailySnap, weeklySnap, monthlySnap] = await Promise.all([
          getDocs(dailyQ),
          getDocs(weeklyQ),
          getDocs(monthlyQ)
        ]);

        const dailyData = [];
        dailySnap.forEach(doc => dailyData.push({ id: doc.id, ...doc.data() }));

        const weeklyData = [];
        weeklySnap.forEach(doc => weeklyData.push({ id: doc.id, ...doc.data() }));

        let monthlyDoc = null;
        monthlySnap.forEach(doc => {
          monthlyDoc = { id: doc.id, ...doc.data() };
        });

        setDailyAudits(dailyData);
        setWeeklyAudits(weeklyData);
        setMonthlyAudit(monthlyDoc);
      } catch (err) {
        console.error("Error fetching matrix data:", err);
        setError("Error fetching matrix data: " + err.message);
      }
    };
    if (selectedWeek && subcategory) {
      fetchData();
    }
  }, [selectedWeek, subcategory]);

  // Get questions from the config.
  const sections = questionsConfig[subcategory] || {};
  const questionRows = [];
  Object.entries(sections).forEach(([_, questions]) => {
    questions.forEach((q) => {
      questionRows.push({
        questionId: q.id,
        questionText: q.question
      });
    });
  });

  const weekDates = getDatesForWeekSunday(selectedWeek);

  /**
   * For each daily audit document, look up the answer for the given questionId.
   */
  const getDailyMark = (dayName, slot, questionId) => {
    for (let da of dailyAudits) {
      if (da.timeOfDay === slot) {
        // Append "T00:00:00" to ensure proper local date interpretation.
        const dt = new Date(da.date + "T00:00:00");
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        if (dayNames[dt.getDay()] === dayName) {
          const ansVal = getAnswerForQuestion(da.answers, questionId);
          if (ansVal === "Satisfactory") return "√";
          if (ansVal === "Not Satisfactory") return "X";
          if (ansVal === "Not Applicable") return "N/A";
        }
      }
    }
    return "";
  };

  /**
   * For weekly audits, use the same logic as daily audits.
   */
  const getWeeklyMark = (questionId) => {
    for (let wa of weeklyAudits) {
      const ansVal = getAnswerForQuestion(wa.answers, questionId);
      if (ansVal === "Satisfactory") return "√";
      if (ansVal === "Not Satisfactory") return "X";
      if (ansVal === "Not Applicable") return "N/A";
    }
    return "";
  };

  /**
   * For monthly audits, use the same logic as daily audits.
   */
  const getMonthlyMark = (questionId) => {
    if (monthlyAudit) {
      const ansVal = getAnswerForQuestion(monthlyAudit.answers, questionId);
      if (ansVal === "Satisfactory") return "√";
      if (ansVal === "Not Satisfactory") return "X";
      if (ansVal === "Not Applicable") return "N/A";
    }
    return "";
  };

  // Convert matrix data to CSV format.
  const convertMatrixToCSV = () => {
    let csvRows = [];
    const totalDailyCols = daysOfWeek.length * dailyTimeSlots.length;
    const totalCols = 1 + totalDailyCols + 3;

    // Row 0: Title row.
    let titleRow = Array(totalCols).fill("");
    titleRow[0] = `Layered Process Audit – ${subcategory}`;
    csvRows.push(titleRow.join(","));

    // Row 1: Blank row.
    csvRows.push(Array(totalCols).fill("").join(","));

    // Row 2: Header row.
    let headerRow2 = [];
    headerRow2.push("Audit Items");
    for (let i = 0; i < totalDailyCols; i++) {
      headerRow2.push("Layer 1 - Daily by Supervisors");
    }
    headerRow2.push("Weekly Audit by Quality Tech", "Weekly Audit by Operations Manager", "Monthly Audit by Site/Quality Manager");
    csvRows.push(headerRow2.join(","));

    // Row 3: Day names.
    let headerRow3 = [""];
    daysOfWeek.forEach(day => {
      dailyTimeSlots.forEach(() => {
        headerRow3.push(day);
      });
    });
    headerRow3.push("", "", "");
    csvRows.push(headerRow3.join(","));

    // Row 4: Actual dates.
    let headerRow4 = [""];
    weekDates.forEach(dateStr => {
      dailyTimeSlots.forEach(() => {
        headerRow4.push(dateStr);
      });
    });
    headerRow4.push("", "", "");
    csvRows.push(headerRow4.join(","));

    // Row 5: Timeslot labels.
    let headerRow5 = [""];
    daysOfWeek.forEach(() => {
      dailyTimeSlots.forEach(slot => {
        headerRow5.push(slot);
      });
    });
    headerRow5.push("", "", "");
    csvRows.push(headerRow5.join(","));

    // Data rows for each question.
    questionRows.forEach((row, idx) => {
      let csvRow = [];
      csvRow.push(`"${idx + 1}. ${row.questionText}"`);
      daysOfWeek.forEach(day => {
        dailyTimeSlots.forEach(slot => {
          csvRow.push(`"${getDailyMark(day, slot, row.questionId)}"`);
        });
      });
      csvRow.push(`"${getWeeklyMark(row.questionId)}"`);
      csvRow.push(`"${getWeeklyMark(row.questionId)}"`);
      csvRow.push(`"${getMonthlyMark(row.questionId)}"`);
      csvRows.push(csvRow.join(","));
    });

    // Legend row.
    csvRows.push("");
    csvRows.push(`"Legend: √ = Satisfactory, X = Not Satisfactory, N/A = Not Applicable"`);
    return csvRows.join("\n");
  };

  const handleDownloadCSV = () => {
    const csvData = convertMatrixToCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute('download', `LayeredAuditMatrix_${subcategory}_${selectedWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF download using jsPDF and html2canvas.
  const handleDownloadPDF = () => {
    const input = document.getElementById("matrixTable");
    if (!input) return;
    
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.5);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add header text: Category, Subcategory, and Week.
      const headerText = `Category: Layered Process Audit\nSubcategory: ${subcategory}\nWeek: ${selectedWeek}`;
      pdf.setFontSize(12);
      pdf.text(headerText, 20, 30);

      // Calculate image dimensions.
      const scale = Math.min(pdfWidth / canvas.width, (pdfHeight - 60) / canvas.height); // Leave space for header
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = 60; // Start below header text

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`LayeredAuditMatrix_${subcategory}_${selectedWeek}.pdf`);
    }).catch((err) => {
      console.error("Error generating PDF:", err);
    });
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <h3>Layered Process Audit – {subcategory}</h3>
      <p>Week: {selectedWeek}</p>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <table id="matrixTable" border="1" cellPadding="5" style={{ borderCollapse: 'collapse', minWidth: '1200px' }}>
        <thead>
          <tr>
            <th rowSpan="4" style={{ backgroundColor: '#f0f0f0' }}>Audit Items</th>
            <th colSpan={daysOfWeek.length * dailyTimeSlots.length} style={{ backgroundColor: '#f0f0f0' }}>
              Layer 1 - Daily by Supervisors
            </th>
            <th rowSpan="4" style={{ backgroundColor: '#f0f0f0', minWidth: '100px' }}>
              Weekly Audit by Quality Tech
            </th>
            <th rowSpan="4" style={{ backgroundColor: '#f0f0f0', minWidth: '100px' }}>
              Weekly Audit by Operations Manager
            </th>
            <th rowSpan="4" style={{ backgroundColor: '#f0f0f0', minWidth: '120px' }}>
              Monthly Audit by Site/Quality Manager
            </th>
          </tr>
          <tr>
            {daysOfWeek.map((day) => (
              <th key={day} colSpan={dailyTimeSlots.length} style={{ backgroundColor: '#fafafa' }}>
                {day}
              </th>
            ))}
          </tr>
          <tr>
            {weekDates.map((dateStr, idx) => (
              <th key={`date-${idx}`} colSpan={dailyTimeSlots.length} style={{ backgroundColor: '#f5f5f5', fontSize: '0.9em' }}>
                {dateStr}
              </th>
            ))}
          </tr>
          <tr>
            {daysOfWeek.map(() =>
              dailyTimeSlots.map((slot) => (
                <th key={slot} style={{ backgroundColor: '#fafafa' }}>
                  {slot}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {questionRows.map((row, idx) => (
            <tr key={`${row.questionId}-${idx}`}>
              <td>{idx + 1}. {row.questionText}</td>
              {daysOfWeek.map((day) =>
                dailyTimeSlots.map((slot) => (
                  <td key={`${day}-${slot}-${idx}`} style={{ textAlign: 'center' }}>
                    {getDailyMark(day, slot, row.questionId)}
                  </td>
                ))
              )}
              <td style={{ textAlign: 'center' }}>{getWeeklyMark(row.questionId)}</td>
              <td style={{ textAlign: 'center' }}>{getWeeklyMark(row.questionId)}</td>
              <td style={{ textAlign: 'center' }}>{getMonthlyMark(row.questionId)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '20px' }}>
        <p><strong>Legend:</strong></p>
        <p>√ = Satisfactory &nbsp; | &nbsp; X = Not Satisfactory &nbsp; | &nbsp; N/A = Not Applicable</p>
      </div>

      <button onClick={handleDownloadCSV} style={{ marginTop: '20px', marginRight: '10px' }}>Download CSV</button>
      <button onClick={handleDownloadPDF} style={{ marginTop: '20px' }}>Download PDF</button>
    </div>
  );
}

export default DynamicLayeredMatrix;
