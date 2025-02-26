import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import questionsConfig from '../configs/layeredProcessAudit.json';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import IssueSubForm from './IssueSubForm';

const defaultRadioOptions = ["Satisfactory", "Not Satisfactory", "Not Applicable"];

// Simple helper to compute ISO week (YYYY-W##)
const computeWeek = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

const AuditForm = ({ auditType }) => {
  const defaultSubcategory = Object.keys(questionsConfig)[0];
  const [subcategory, setSubcategory] = useState(defaultSubcategory);
  const [answers, setAnswers] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDay, setTimeOfDay] = useState("M");
  const [weeklySubType, setWeeklySubType] = useState("Quality Tech");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // We'll store a ref for each question, so we can scroll if it's missing.
  const questionRefs = useRef({});

  // We’ll store the first missing question's ID (so we can highlight it).
  const [missingQuestion, setMissingQuestion] = useState(null);

  const sections = questionsConfig[subcategory] || {};

  // For each question, we create or reuse a ref object so we can scroll to it.
  // We'll call this function in the render loop below.
  const getQuestionRef = (qId) => {
    if (!questionRefs.current[qId]) {
      questionRefs.current[qId] = React.createRef();
    }
    return questionRefs.current[qId];
  };

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
    setMissingQuestion(null);

    // Collect all questions
    const allQuestions = [];
    for (const [sectionName, questionArray] of Object.entries(sections)) {
      questionArray.forEach(q => {
        allQuestions.push({ sectionName, questionId: q.id });
      });
    }

    // Validate: find the first question that is unanswered
    let firstMissing = null;
    for (const qObj of allQuestions) {
      const { sectionName, questionId } = qObj;
      const sectionAnswers = answers[sectionName] || {};
      const answerVal = sectionAnswers[questionId];
      if (!answerVal) {
        firstMissing = { sectionName, questionId };
        break;
      }
    }

    if (firstMissing) {
      // We found a missing question: highlight + scroll
      setMissingQuestion(firstMissing.questionId);
      setError('Please answer all questions before submitting.');
      // Scroll to that question
      setTimeout(() => {
        const ref = questionRefs.current[firstMissing.questionId];
        if (ref && ref.current) {
          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      setLoading(false);
      return;
    }

    // Compute week & month
    const computedMonth = date.slice(0, 7);
    const computedWeek = computeWeek(date);

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
      newAuditData.weeklySubType = weeklySubType;
    }

    // Check for existing audit
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

    try {
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        setError('An audit already exists for these parameters.');
        setLoading(false);
        return;
      }

      // Add the audit doc
      const auditDocRef = await addDoc(collection(db, 'audits'), newAuditData);

      // For each "Not Satisfactory" => create an issue
      const issuePromises = [];
      for (const sectionName in answers) {
        for (const questionId in answers[sectionName]) {
          const ans = answers[sectionName][questionId];
          if (typeof ans === 'object' && ans.answer === "Not Satisfactory") {
            const issueData = {
              category: "Layered Process Audit",
              subcategory,
              section: sectionName,
              item: questionId,
              date,
              week: computedWeek,
              month: computedMonth,
              ...ans.issue,
              status: "Open",
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

      alert('Audit completed successfully!');
      navigate('/audit');
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
        
        {Object.entries(sections).map(([sectionName, questions]) => (
          <div key={sectionName} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd' }}>
            <h3>{sectionName}</h3>
            {questions.map((q, index) => {
              const questionNumber = q.id || index + 1;
              const sectionAnswers = answers[sectionName] || {};
              const currentAnswer = sectionAnswers[q.id];
              const selectedOption = typeof currentAnswer === 'object' ? currentAnswer.answer : currentAnswer || "";

              // We'll get a ref for this question
              const qRef = getQuestionRef(q.id);

              // If this question is the missing question, we'll highlight it.
              const isMissing = missingQuestion === q.id;

              return (
                <div
                  key={q.id}
                  ref={qRef}
                  style={{
                    marginBottom: '15px',
                    // highlight if missing
                    backgroundColor: isMissing ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                    padding: isMissing ? '8px' : '0'
                  }}
                >
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
                          onChange={(e) => handleAnswerChange(sectionName, q.id, e.target.value)}
                          required
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`flexRadioDefault~${q.id + option}`}
                        >
                          {option}
                        </label>
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
