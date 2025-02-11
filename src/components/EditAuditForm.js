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

const EditAuditForm = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the audit document by auditId from Firestore
  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const auditDocRef = doc(db, 'audits', auditId);
        const auditDoc = await getDoc(auditDocRef);
        if (auditDoc.exists()) {
          setAuditData(auditDoc.data());
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

  // Update top-level fields (e.g., date, timeOfDay)
  const handleChange = (field, value) => {
    setAuditData(prev => ({ ...prev, [field]: value }));
  };

  // Update nested answers.
  // We assume answers are stored as: { "Section Name": { "questionId": (string | { answer, issue }) } }
  // When "Not Satisfactory" is selected, we store an object { answer: "Not Satisfactory", issue: {} }.
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
      // First update the audit document
      const auditDocRef = doc(db, 'audits', auditId);
      await updateDoc(auditDocRef, {
        ...auditData,
        lastEditedBy: {
          uid: currentUser.uid,
          email: currentUser.email
        },
        lastEditedAt: serverTimestamp()
      });

      // Iterate over the nested answers to process issues.
      // For each "Not Satisfactory" answer, update or create an issue document.
      const issuePromises = [];
      if (auditData.answers) {
        for (const section in auditData.answers) {
          for (const qId in auditData.answers[section]) {
            const answerValue = auditData.answers[section][qId];
            if (typeof answerValue === 'object' && answerValue.answer === "Not Satisfactory") {
              // Build issue data object
              const issueData = {
                category: "Layered Process Audit",
                subcategory: auditData.subcategory,
                section: section,
                item: qId,
                date: auditData.date,
                ...answerValue.issue,
                status: "Open", // default status
                updatedAt: serverTimestamp(),
                linkedAuditId: auditId,
                lastEditedBy: {
                  uid: currentUser.uid,
                  email: currentUser.email
                }
              };

              // Check if an issue already exists (if an issueId is stored)
              if (answerValue.issue && answerValue.issue.issueId) {
                // Update the existing issue document
                const issueDocRef = doc(db, 'issues', answerValue.issue.issueId);
                issuePromises.push(updateDoc(issueDocRef, issueData));
              } else {
                // Create a new issue document and store its ID back in the auditData
                const createIssue = async () => {
                  const issueDocRef = await addDoc(collection(db, 'issues'), {
                    ...issueData,
                    createdAt: serverTimestamp(),
                    createdBy: {
                      uid: currentUser.uid,
                      email: currentUser.email
                    }
                  });
                  // Update the nested answer to store the generated issueId
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
      navigate('/dashboard');
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
        {/* Subcategory (read-only) */}
        <div style={{ marginBottom: '10px' }}>
          <label>Subcategory:</label>
          <input 
            type="text"
            value={auditData.subcategory || ""}
            readOnly
          />
        </div>
        {/* Render the questions by section */}
        {Object.entries(sections).map(([sectionName, questions]) => (
          <div key={sectionName} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd' }}>
            <h3>{sectionName}</h3>
            {questions.map((q) => {
              // Retrieve the current answer for this question from auditData.answers.
              const sectionAnswers = auditData.answers?.[sectionName] || {};
              const currentAnswer = sectionAnswers[q.id];
              // Determine the selected option: if currentAnswer is an object, use currentAnswer.answer; otherwise, use the string.
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
                          onChange={(e) => handleNestedAnswerChange(sectionName, q.id, e.target.value)}
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
        <button type="submit">Update Audit</button>
      </form>
    </div>
  );
};

export default EditAuditForm;
