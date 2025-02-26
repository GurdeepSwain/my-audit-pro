// src/components/AuditForm.js
import React, { useState } from 'react';
import questionsConfig from '../configs/layeredProcessAudit.json';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import IssueSubForm from './IssueSubForm';

// Fixed answer options for every question
const defaultRadioOptions = ["Satisfactory", "Not Satisfactory", "Not Applicable"];

// Helper function to compute ISO week (format "YYYY-W##")
// This is a basic implementation. For more robust handling, consider using a library.
const computeWeek = (dateString) => {
  const date = new Date(dateString);
  // Set to nearest Thursday: current date + 4 - current day number (treat Sunday as 7)
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const AuditForm = ({ auditType }) => {
  // Default subcategory is the first key in the JSON configuration.
  const defaultSubcategory = Object.keys(questionsConfig)[0];
  const [subcategory, setSubcategory] = useState(defaultSubcategory);
  // Nested answers: { sectionName: { questionId: (string | { answer, issue }) } }
  const [answers, setAnswers] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // For daily audits, track time-of-day ("M", "D", "A")
  const [timeOfDay, setTimeOfDay] = useState("M");
  // For weekly audits, track the subtype
  const [weeklySubType, setWeeklySubType] = useState("Quality Tech");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { currentUser } = useAuth();

  // The JSON configuration is structured by subcategory and then by section.
  const sections = questionsConfig[subcategory] || {};

  // When a radio button changes for a given question.
  // If "Not Satisfactory" is selected, store an object with { answer: "Not Satisfactory", issue: {} }.
  const handleAnswerChange = (sectionName, questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: value === "Not Satisfactory"
          ? { answer: "Not Satisfactory", issue: {} }
          : value
      }
    }));
  };

  // When fields in the inline issue subform change.
  const handleIssueChange = (sectionName, questionId, field, fieldValue) => {
    setAnswers(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: {
          ...prev[sectionName][questionId],
          issue: {
            ...prev[sectionName][questionId].issue,
            [field]: fieldValue
          }
        }
      }
    }));
  };

  // Auto-populated data for the issue subform.
  const getAutoData = (sectionName, questionId) => ({
    category: "Layered Process Audit",
    subcategory,
    section: sectionName,
    item: questionId,
    date
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    // Compute additional fields from the date.
    const computedMonth = date.slice(0, 7); // "YYYY-MM"
    const computedWeek = computeWeek(date);

    // Build the audit data object.
    const newAuditData = {
      auditType,
      date,
      subcategory,
      week: computedWeek,
      month: computedMonth,
      answers,
      completed: true,
      createdBy: {
        uid: currentUser.uid,
        email: currentUser.email
      },
      lastEditedBy: {
        uid: currentUser.uid,
        email: currentUser.email
      },
      createdAt: serverTimestamp()
    };

    if (auditType === 'daily') {
      newAuditData.timeOfDay = timeOfDay;
    }
    if (auditType === 'weekly') {
      newAuditData.weeklySubType = weeklySubType; // "Quality Tech" or "Operations Manager"
    }

    // Before submitting, check if an audit already exists with the same parameters.
    let existingQuery;
    if (auditType === 'daily') {
      existingQuery = query(
        collection(db, 'audits'),
        where('date', '==', date),
        where('timeOfDay', '==', timeOfDay),
        where('subcategory', '==', subcategory),
        where('auditType', '==', 'daily')
      );
    } else if (auditType === 'weekly') {
      // Check by week, subcategory, auditType and weeklySubType.
      existingQuery = query(
        collection(db, 'audits'),
        where('week', '==', computedWeek),
        where('subcategory', '==', subcategory),
        where('auditType', '==', 'weekly'),
        where('weeklySubType', '==', weeklySubType)
      );
    } else if (auditType === 'monthly') {
      existingQuery = query(
        collection(db, 'audits'),
        where('month', '==', computedMonth),
        where('subcategory', '==', subcategory),
        where('auditType', '==', 'monthly')
      );
    }

    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      setError('An audit already exists for these parameters.');
      setLoading(false);
      return;
    }

    try {
      // Submit the audit document to Firestore.
      const auditDocRef = await addDoc(collection(db, 'audits'), newAuditData);
      console.log(`Submitted ${auditType} Audit:`, newAuditData);
      console.log(`Audit ID: ${auditDocRef.id}`);

      // For every question answered as "Not Satisfactory", create an issue document.
      const issuePromises = [];
      for (const section in answers) {
        for (const questionId in answers[section]) {
          const ans = answers[section][questionId];
          if (typeof ans === 'object' && ans.answer === "Not Satisfactory") {
            const issueData = {
              category: "Layered Process Audit",
              subcategory,
              section,
              item: questionId,
              date,
              week: computedWeek,
              month: computedMonth,
              ...ans.issue,
              status: "Open", // default status
              createdBy: {
                uid: currentUser.uid,
                email: currentUser.email
              },
              createdAt: serverTimestamp(),
              linkedAuditId: auditDocRef.id
            };
            issuePromises.push(addDoc(collection(db, 'issues'), issueData));
          }
        }
      }
      await Promise.all(issuePromises);
      setSuccessMessage('Audit and related issues submitted successfully!');
      // Optionally, reset the form.
      setAnswers({});
    } catch (err) {
      console.error('Error submitting audit or issues:', err);
      setError('Error submitting audit: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>{auditType.charAt(0).toUpperCase() + auditType.slice(1)} Audit Form</h2>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        
        {/* Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Date: </label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        
        {/* Time of Day for Daily Audits */}
        {auditType === 'daily' && (
          <div style={{ marginBottom: '10px' }}>
            <label>Time of Day: </label>
            <select 
              value={timeOfDay} 
              onChange={(e) => setTimeOfDay(e.target.value)}
              required
            >
              <option value="M">Morning (M)</option>
              <option value="D">Day (D)</option>
              <option value="A">Afternoon (A)</option>
            </select>
          </div>
        )}

        {/* Weekly Sub-Type for Weekly Audits */}
        {auditType === 'weekly' && (
          <div style={{ marginBottom: '10px' }}>
            <label>Weekly Audit By: </label>
            <select 
              value={weeklySubType} 
              onChange={(e) => setWeeklySubType(e.target.value)}
              required
            >
              <option value="Quality Tech">Quality Tech</option>
              <option value="Operations Manager">Operations Manager</option>
            </select>
          </div>
        )}

        {/* Subcategory */}
        <div style={{ marginBottom: '10px' }}>
          <label>Subcategory: </label>
          <select 
            value={subcategory} 
            onChange={(e) => setSubcategory(e.target.value)}
            required
          >
            {Object.keys(questionsConfig).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
        
        {/* Render questions grouped by section */}
        {Object.entries(sections).map(([sectionName, questions]) => (
          <div key={sectionName} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd' }}>
            <h3>{sectionName}</h3>
            {questions.map((q, index) => {
              // Use the question's id for numbering (or fallback to index + 1)
              const questionNumber = q.id || index + 1;
              const sectionAnswers = answers[sectionName] || {};
              const currentAnswer = sectionAnswers[q.id];
              const selectedOption = typeof currentAnswer === 'object' ? currentAnswer.answer : currentAnswer || "";
              return (
                <div key={q.id} style={{ marginBottom: '15px' }}>
                  <label>
                    {questionNumber}. {q.question}
                  </label>
                  {q.type === "radio" && (
                    defaultRadioOptions.map((option) => (
                      <div key={option}>
                        <input
                          type="radio"
                          name={`section-${sectionName}-question-${q.id}`}
                          value={option}
                          checked={selectedOption === option}
                          onChange={(e) => handleAnswerChange(sectionName, q.id, e.target.value)}
                          required
                        />
                        {option}
                      </div>
                    ))
                  )}
                  {q.type === "number" && (
                    <input
                      type="number"
                      name={`section-${sectionName}-question-${q.id}`}
                      onChange={(e) => handleAnswerChange(sectionName, q.id, e.target.value)}
                      required
                    />
                  )}
                  {q.type === "textarea" && (
                    <textarea
                      name={`section-${sectionName}-question-${q.id}`}
                      onChange={(e) => handleAnswerChange(sectionName, q.id, e.target.value)}
                      required
                    />
                  )}
                  {/* Render the IssueSubForm if "Not Satisfactory" is selected */}
                  {selectedOption === "Not Satisfactory" && (
                    <IssueSubForm 
                      autoData={getAutoData(sectionName, q.id)}
                      issueData={typeof currentAnswer === 'object' ? currentAnswer.issue : {}}
                      onIssueChange={(field, value) => handleIssueChange(sectionName, q.id, field, value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : `Submit ${auditType.charAt(0).toUpperCase() + auditType.slice(1)} Audit`}
        </button>
      </form>
    </div>
  );
};

export default AuditForm;
