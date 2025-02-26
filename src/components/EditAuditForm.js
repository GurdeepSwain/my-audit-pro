// src/components/EditAuditForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import questionsConfig from '../configs/layeredProcessAudit.json';
import IssueSubForm from './IssueSubForm';

// Fixed answer options for every question
const defaultRadioOptions = ["Satisfactory", "Not Satisfactory", "Not Applicable"];

// Helper function to compute ISO week (format "YYYY-W##")
// Basic implementation. For more robust handling, consider using a date library.
const computeWeek = (dateString) => {
  const date = new Date(dateString);
  // Set to nearest Thursday: current date + 4 - current day number (with Sunday as 7)
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const EditAuditForm = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [auditData, setAuditData] = useState(null);
  const [weeklySubType, setWeeklySubType] = useState("Quality Tech"); // For weekly audits
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the audit document by auditId from Firestore
  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const auditDocRef = doc(db, 'audits', auditId);
        const auditDoc = await getDoc(auditDocRef);
        if (auditDoc.exists()) {
          const data = auditDoc.data();
          setAuditData(data);
          if(data.auditType === 'weekly'){
            setWeeklySubType(data.weeklySubType || "Quality Tech");
          }
        } else {
          setError('Audit not found');
        }
      } catch (err) {
        setError('Error fetching audit data: ' + err.message);
      }
      setLoading(false);
    };
    fetchAudit();
  }, [auditId]);

  // Update top-level fields (e.g., date, timeOfDay, weeklySubType)
  const handleChange = (field, value) => {
    setAuditData(prev => ({ ...prev, [field]: value }));
  };

  // Update nested answers.
  // We assume answers are stored as: { "Section Name": { "questionId": (string | { answer, issue }) } }
  const handleNestedAnswerChange = (section, qId, selectedOption) => {
    setAuditData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [section]: {
          ...prev.answers?.[section],
          [qId]:
            selectedOption === "Not Satisfactory"
              ? { answer: "Not Satisfactory", issue: prev.answers?.[section]?.[qId]?.issue || {} }
              : selectedOption
        }
      }
    }));
  };

  // Update issue details when "Not Satisfactory" is selected.
  const handleNestedIssueChange = (section, qId, field, fieldValue) => {
    setAuditData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [section]: {
          ...prev.answers?.[section],
          [qId]: {
            ...prev.answers?.[section]?.[qId],
            issue: {
              ...prev.answers?.[section]?.[qId]?.issue,
              [field]: fieldValue
            }
          }
        }
      }
    }));
  };

  // Helper to get auto-populated data for the issue subform.
  const getAutoData = (sectionName, questionId) => ({
    category: "Layered Process Audit",
    subcategory: auditData.subcategory,
    section: sectionName,
    item: questionId,
    date: auditData.date
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Compute additional fields from the date.
      const computedMonth = auditData.date.slice(0, 7); // "YYYY-MM"
      const computedWeek = computeWeek(auditData.date);
      
      // Prepare updated auditData with week, month and, if weekly, weeklySubType.
      const updatedAuditData = {
        ...auditData,
        week: computedWeek,
        month: computedMonth,
        lastEditedBy: {
          uid: currentUser.uid,
          email: currentUser.email
        },
        lastEditedAt: serverTimestamp()
      };
      if(auditData.auditType === 'daily'){
        // timeOfDay is already stored in auditData.
      }
      if(auditData.auditType === 'weekly'){
        updatedAuditData.weeklySubType = weeklySubType;
      }
      
      // First update the audit document.
      const auditDocRef = doc(db, 'audits', auditId);
      await updateDoc(auditDocRef, updatedAuditData);

      // Now iterate over the nested answers to process issues.
      const issuePromises = [];
      if (auditData.answers) {
        for (const section in auditData.answers) {
          for (const qId in auditData.answers[section]) {
            const answerValue = auditData.answers[section][qId];
            if (typeof answerValue === 'object' && answerValue.answer === "Not Satisfactory") {
              // Build issue data object.
              const issueData = {
                category: "Layered Process Audit",
                subcategory: auditData.subcategory,
                section: section,
                item: qId,
                date: auditData.date,
                week: computedWeek,
                month: computedMonth,
                ...answerValue.issue,
                status: "Open", // default status
                updatedAt: serverTimestamp(),
                linkedAuditId: auditId,
                lastEditedBy: {
                  uid: currentUser.uid,
                  email: currentUser.email
                }
              };
              if (answerValue.issue && answerValue.issue.issueId) {
                const issueDocRef = doc(db, 'issues', answerValue.issue.issueId);
                issuePromises.push(updateDoc(issueDocRef, issueData));
              } else {
                const createIssue = async () => {
                  const issueDocRef = await addDoc(collection(db, 'issues'), {
                    ...issueData,
                    createdAt: serverTimestamp(),
                    createdBy: {
                      uid: currentUser.uid,
                      email: currentUser.email
                    }
                  });
                  // Update nested answer to store the generated issueId.
                  setAuditData(prev => ({
                    ...prev,
                    answers: {
                      ...prev.answers,
                      [section]: {
                        ...prev.answers[section],
                        [qId]: {
                          ...prev.answers[section][qId],
                          issue: {
                            ...prev.answers[section][qId].issue,
                            issueId: issueDocRef.id
                          }
                        }
                      }
                    }
                  }));
                };
                issuePromises.push(createIssue());
              }
            }
          }
        }
      }
      await Promise.all(issuePromises);
      
      alert('Audit updated successfully!');
      navigate('/audit');
    } catch (err) {
      setError('Error updating audit: ' + err.message);
    }
  };

  if (loading) return <div>Loading audit data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  // Determine the question configuration based on the audit's subcategory.
  const subcatKey = auditData.subcategory;
  const sections = questionsConfig[subcatKey] || {};

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <h2>Edit Audit</h2>
      <form onSubmit={handleSubmit}>
        {/* Date Field */}
        <div style={{ marginBottom: '10px' }}>
          <label>Date:</label>
          <input 
            type="date"
            value={auditData.date || ""}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </div>
        {/* Time of Day for Daily Audits */}
        {auditData.auditType === 'daily' && (
          <div style={{ marginBottom: '10px' }}>
            <label>Time of Day:</label>
            <select 
              value={auditData.timeOfDay || "M"}
              onChange={(e) => handleChange('timeOfDay', e.target.value)}
              required
            >
              <option value="M">Morning (M)</option>
              <option value="D">Day (D)</option>
              <option value="A">Afternoon (A)</option>
            </select>
          </div>
        )}
        {/* Weekly Audit Subtype */}
        {auditData.auditType === 'weekly' && (
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
        {/* Subcategory (read-only) */}
        <div style={{ marginBottom: '10px' }}>
          <label>Subcategory:</label>
          <input 
            type="text"
            value={auditData.subcategory || ""}
            readOnly
          />
        </div>
        {/* Render questions grouped by section */}
        {Object.entries(sections).map(([sectionName, questions]) => (
          <div key={sectionName} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd' }}>
            <h3>{sectionName}</h3>
            {questions.map((q, index) => {
              // Use the question's id if available; otherwise, fallback to index + 1.
              const questionNumber = q.id || index + 1;
              const sectionAnswers = auditData.answers?.[sectionName] || {};
              const currentAnswer = sectionAnswers[q.id];
              const selectedOption = typeof currentAnswer === 'object' ? currentAnswer.answer : currentAnswer || "";
              return (
                <div key={q.id} style={{ marginBottom: '15px' }}>
                  <label>
                    {questionNumber}. {q.question}
                  </label>
                  {q.type === "radio" && (
                    defaultRadioOptions.map((option) => (
                      <div className="form-check" key={option}>
                        <input
                          className="form-check-input"
                          id={`flexRadioDefault~${q.id + option}`}
                          type="radio"
                          name={`section-${sectionName}-question-${q.id}`}
                          value={option}
                          checked={selectedOption === option}
                          onChange={(e) => handleNestedAnswerChange(sectionName, q.id, e.target.value)}
                          required
                        />
                        <label className="form-check-label" for={`flexRadioDefault~${q.id + option}`}>
                        {option}
                        </label>
                      </div>
                    ))
                  )}
                  {q.type === "number" && (
                    <input
                      type="number"
                      name={`section-${sectionName}-question-${q.id}`}
                      value={selectedOption}
                      onChange={(e) => handleNestedAnswerChange(sectionName, q.id, e.target.value)}
                      required
                    />
                  )}
                  {q.type === "textarea" && (
                    <textarea
                      name={`section-${sectionName}-question-${q.id}`}
                      value={selectedOption}
                      onChange={(e) => handleNestedAnswerChange(sectionName, q.id, e.target.value)}
                      required
                    />
                  )}
                  {/* Render the IssueSubForm if "Not Satisfactory" is selected */}
                  {selectedOption === "Not Satisfactory" && (
                    <IssueSubForm 
                      autoData={getAutoData(sectionName, q.id)}
                      issueData={(currentAnswer && typeof currentAnswer === 'object' && currentAnswer.issue) ? currentAnswer.issue : {}}
                      onIssueChange={(field, value) => handleNestedIssueChange(sectionName, q.id, field, value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <button type="submit" disabled={loading}>Update Audit</button>
      </form>
    </div>
  );
};

export default EditAuditForm;
