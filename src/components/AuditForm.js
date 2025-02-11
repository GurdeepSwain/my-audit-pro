// src/components/AuditForm.js
import React, { useState } from 'react';
import questionsConfig from '../configs/layeredProcessAudit.json';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import IssueSubForm from './IssueSubForm';

// Fixed answer options for every question
const defaultRadioOptions = ["Satisfactory", "Not Satisfactory", "Not Applicable"];

const AuditForm = ({ auditType }) => {
  // Default subcategory is the first key in the JSON configuration.
  const defaultSubcategory = Object.keys(questionsConfig)[0];
  const [subcategory, setSubcategory] = useState(defaultSubcategory);
  // Nested answers: { sectionName: { questionId: (string | { answer, issue }) } }
  const [answers, setAnswers] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // For daily audits, track time-of-day ("M", "D", "A")
  const [timeOfDay, setTimeOfDay] = useState("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { currentUser } = useAuth();

  // The JSON configuration is structured by subcategory and then by section.
  const sections = questionsConfig[subcategory] || {};

  // When a radio button changes for a given question.
  const handleAnswerChange = (sectionName, questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: value === "Not Satisfactory"
          ? { answer: "Not Satisfactory", issue: {} } // initialize issue object
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

    // Build the audit data object.
    const auditData = {
      auditType,
      date,
      subcategory,
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
      auditData.timeOfDay = timeOfDay;
    }

    try {
      // Submit the audit document to Firestore.
      const auditDocRef = await addDoc(collection(db, 'audits'), auditData);
      console.log(`Submitted ${auditType} Audit:`, auditData);
      console.log(`Audit ID: ${auditDocRef.id}`);

      // Now, for every question answered as "Not Satisfactory", create an issue document.
      const issuePromises = [];
      // Loop over each section in answers.
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
              // Spread any additional details provided in the issue subform.
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
        <div style={{ marginBottom: '10px' }}>
          <label>Date: </label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
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
            {questions.map((q) => {
              const sectionAnswers = answers[sectionName] || {};
              const currentAnswer = sectionAnswers[q.id];
              const selectedOption = typeof currentAnswer === 'object' ? currentAnswer.answer : currentAnswer || "";
              return (
                <div key={q.id} style={{ marginBottom: '15px' }}>
                  <label>{q.question}</label>
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
                  {/* If the selected option is "Not Satisfactory", render the IssueSubForm */}
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
