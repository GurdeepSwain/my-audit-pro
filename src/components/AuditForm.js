// src/components/AuditForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import IssueSubForm from './IssueSubForm';

const defaultRadioOptions = [
  "Satisfactory",
  "Not Satisfactory",
  "Not Applicable"
];
const CATEGORY_ID = 'nyz4qcXPvxPjwch0zTmM'; // ← replace with your doc ID

function computeWeek(dateString) {
  const date = new Date(dateString);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export default function AuditForm({ auditType }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState([]);
  const [subcategory,  setSubcategory]  = useState('');
  const [questions,    setQuestions]    = useState([]);
  const [answers,      setAnswers]      = useState({});
  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [timeOfDay,    setTimeOfDay]    = useState('M');
  const [weeklySubType,setWeeklySubType]= useState('Quality Tech');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [successMsg,   setSuccessMsg]   = useState('');

  const questionRefs = useRef({});
  const [missingQ,    setMissingQ]     = useState(null);

  function getQuestionRef(id) {
    if (!questionRefs.current[id]) questionRefs.current[id] = React.createRef();
    return questionRefs.current[id];
  }

  // Load subcategories on mount
  useEffect(() => {
    (async () => {
      const q = query(
        collection(db, 'auditCategories', CATEGORY_ID, 'subcategories'),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubcategories(subs);
      if (subs.length) setSubcategory(subs[0].id);
    })();
  }, []);

  // Load questions whenever subcategory changes
  useEffect(() => {
    if (!subcategory) return;
    (async () => {
      const q = query(
        collection(
          db,
          'auditCategories',
          CATEGORY_ID,
          'subcategories',
          subcategory,
          'questions'
        ),
        orderBy('order', 'asc')
      );
      const snap = await getDocs(q);
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, [subcategory]);

  // Handle answer selection
  function handleAnswerChange(qId, val) {
    setAnswers(prev => ({
      ...prev,
      [qId]: val === 'Not Satisfactory'
        ? { answer: 'Not Satisfactory', issue: prev[qId]?.issue || {} }
        : val
    }));
  }
  // Handle issue subform changes
  function handleIssueChange(qId, field, val) {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        issue: {
          ...prev[qId].issue,
          [field]: val
        }
      }
    }));
  }

  // Ensure every question has an answer
  function validateAll() {
    return questions.find(q => !answers[q.id])?.id || null;
  }

  // Submit handler with popups
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); setSuccessMsg(''); setMissingQ(null);

    // Validate
    const miss = validateAll();
    if (miss) {
      setMissingQ(miss);
      window.alert('Please answer all questions before submitting.');
      setLoading(false);
      return;
    }

    // Compute month/week
    const month = date.slice(0,7);
    const week  = computeWeek(date);

    // Snapshot question metadata so historical audits stay frozen
    const configSnapshot = questions.map(q => ({
      id:      q.id,
      text:    q.text,
      type:    q.type,
      options: q.options || [],
      order:   q.order
    }));
    const chosenSub = subcategories.find(sc => sc.id === subcategory)

    // Build payload
    const payload = {
      auditType,
      date,
      month,
      week,
      subcategory,
      subcategoryName: chosenSub?.name || subcategory,
      config:      configSnapshot,
      answers,
      completed:   true,
      createdBy:   { uid: currentUser.uid, email: currentUser.email },
      lastEditedBy:{ uid: currentUser.uid, email: currentUser.email },
      createdAt:   serverTimestamp()
    };
    if (auditType === 'daily')   payload.timeOfDay    = timeOfDay;
    if (auditType === 'weekly')  payload.weeklySubType = weeklySubType;

    // Check duplicates
    let dupQuery;
    if (auditType === 'daily') {
      dupQuery = query(
        collection(db,'audits'),
        where('auditType','==','daily'),
        where('date','==',date),
        where('timeOfDay','==',timeOfDay),
        where('subcategory','==',subcategory)
      );
    } else if (auditType === 'weekly') {
      dupQuery = query(
        collection(db,'audits'),
        where('auditType','==','weekly'),
        where('week','==',week),
        where('weeklySubType','==',weeklySubType),
        where('subcategory','==',subcategory)
      );
    } else {
      dupQuery = query(
        collection(db,'audits'),
        where('auditType','==','monthly'),
        where('month','==',month),
        where('subcategory','==',subcategory)
      );
    }
    const dupSnap = await getDocs(dupQuery);
    if (!dupSnap.empty) {
      window.alert('An audit already exists for these parameters.');
      setLoading(false);
      return;
    }

    // Try submitting
    try {
      const docRef = await addDoc(collection(db,'audits'), payload);

      // Create any issues
      const issuePromises = [];
      questions.forEach(q => {
        const ans = answers[q.id];
        if (typeof ans === 'object' && ans.answer === 'Not Satisfactory') {
          issuePromises.push(
            addDoc(collection(db,'issues'), {
              category:   'Layered Process Audit',
              subcategory,
              subcategoryName: chosenSub?.name || subcategory,
              item:       q.id,
              date,
              week,
              month,
              ...ans.issue,
              status:    'Open',
              createdBy: { uid: currentUser.uid, email: currentUser.email },
              createdAt: serverTimestamp(),
              linkedAuditId: docRef.id
            })
          );
        }
      });
      await Promise.all(issuePromises);

      window.alert('Audit and related issues submitted successfully!');
      navigate('/audit');
    } catch (err) {
      console.error(err);
      window.alert('Error submitting audit: ' + err.message);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>
        {auditType.charAt(0).toUpperCase() + auditType.slice(1)} Audit Form
      </h2>
      <form onSubmit={handleSubmit}>
        {/* Date */}
        <div style={{ marginBottom: 10 }}>
          <label>Date: </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        {/* Daily / Weekly controls */}
        {auditType === 'daily' && (
          <div style={{ marginBottom: 10 }}>
            <label>Time of Day: </label>
            <select
              value={timeOfDay}
              onChange={e => setTimeOfDay(e.target.value)}
              required
            >
              <option value="M">Morning</option>
              <option value="D">Day</option>
              <option value="A">Afternoon</option>
            </select>
          </div>
        )}
        {auditType === 'weekly' && (
          <div style={{ marginBottom: 10 }}>
            <label>Weekly Audit By: </label>
            <select
              value={weeklySubType}
              onChange={e => setWeeklySubType(e.target.value)}
              required
            >
              <option value="Quality Tech">Quality Tech</option>
              <option value="Operations Manager">Operations Manager</option>
            </select>
          </div>
        )}

        {/* Subcategory selector */}
        <div style={{ marginBottom: 10 }}>
          <label>Subcategory: </label>
          <select
            value={subcategory}
            onChange={e => setSubcategory(e.target.value)}
            required
          >
            {subcategories.map(sc => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => {
          const ref       = getQuestionRef(q.id);
          const isMissing = missingQ === q.id;
          const ans       = answers[q.id];
          const selected  = typeof ans === 'object' ? ans.answer : ans || '';

          return (
            <div
              key={q.id}
              ref={ref}
              style={{
                marginBottom: 15,
                padding: isMissing ? 8 : 0,
                background: isMissing ? 'rgba(255,0,0,0.1)' : 'transparent'
              }}
            >
              <label>
                {idx + 1}. {q.text}
              </label>

              {q.type === 'radio' &&
                defaultRadioOptions.map(opt => (
                  <div key={opt}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={selected === opt}
                      onChange={() => handleAnswerChange(q.id, opt)}
                      required
                    />
                    <span style={{ marginLeft: 4 }}>{opt}</span>
                  </div>
                ))}

              {q.type === 'number' && (
                <input
                  type="number"
                  value={selected}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  required
                />
              )}

              {q.type === 'textarea' && (
                <textarea
                  value={selected}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                  required
                />
              )}

              {selected === 'Not Satisfactory' && (
                <IssueSubForm
                  autoData={{
                    category:   'Layered Process Audit',
                    subcategory,
                    item:       q.id,
                    date
                  }}
                  issueData={ans?.issue || {}}
                  onIssueChange={(field, val) => handleIssueChange(q.id, field, val)}
                />
              )}
            </div>
          );
        })}

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting…' : `Submit ${auditType.charAt(0).toUpperCase() + auditType.slice(1)} Audit`}
        </button>
      </form>
    </div>
  );
}
