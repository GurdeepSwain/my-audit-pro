// src/components/EditAuditForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import IssueSubForm from './IssueSubForm';

const defaultRadioOptions = [
  "Satisfactory",
  "Not Satisfactory",
  "Not Applicable"
];

// Compute ISO week "YYYY-W##"
function computeWeek(dateString) {
  const date = new Date(dateString);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export default function EditAuditForm() {
  const { auditId } = useParams();
  const navigate    = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [date, setDate]         = useState('');
  const [timeOfDay, setTimeOfDay]       = useState('M');
  const [weeklySubType, setWeeklySubType] = useState('Quality Tech');
  const [subcategory, setSubcategory]   = useState('');
  const [config, setConfig]     = useState([]);      // [{id,text,type,options,order},…]
  const [answers, setAnswers]   = useState({});      // { [qId]: string | {answer,issue} }
  const [missingQ, setMissingQ] = useState(null);
  const questionRefs            = useRef({});

  function getQuestionRef(id) {
    if (!questionRefs.current[id]) {
      questionRefs.current[id] = React.createRef();
    }
    return questionRefs.current[id];
  }

  useEffect(() => {
    async function load() {
      try {
        const ref = doc(db, 'audits', auditId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Audit not found');
          window.alert('Audit not found');
        } else {
          const data = snap.data();
          setDate(data.date);
          setTimeOfDay(data.timeOfDay || 'M');
          setWeeklySubType(data.weeklySubType || 'Quality Tech');
          setSubcategory(data.subcategory);
          const cfg = (data.config || [])
            .slice()
            .sort((a,b) => a.order - b.order);
          setConfig(cfg);
          setAnswers(data.answers || {});
        }
      } catch (e) {
        setError('Error loading audit: ' + e.message);
        window.alert('Error loading audit: ' + e.message);
      }
      setLoading(false);
    }
    load();
  }, [auditId]);

  function handleAnswerChange(qId, value) {
    setAnswers(prev => ({
      ...prev,
      [qId]:
        value === 'Not Satisfactory'
          ? { answer: 'Not Satisfactory', issue: prev[qId]?.issue || {} }
          : value
    }));
  }

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

  function validateAll() {
    return config.find(q => !answers[q.id])?.id || null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMissingQ(null);

    const miss = validateAll();
    if (miss) {
      setMissingQ(miss);
      window.alert('Please answer all questions before submitting.');
      const r = getQuestionRef(miss);
      setTimeout(() => {
        if (r.current) r.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }

    const month = date.slice(0,7);
    const week  = computeWeek(date);

    const payload = {
      date,
      week,
      month,
      answers,
      lastEditedBy: {
        uid: currentUser.uid,
        email: currentUser.email
      },
      lastEditedAt: serverTimestamp()
    };
    if (timeOfDay)    payload.timeOfDay    = timeOfDay;
    if (weeklySubType) payload.weeklySubType = weeklySubType;

    try {
      const auditRef = doc(db, 'audits', auditId);
      await updateDoc(auditRef, payload);

      // create/update issues
      const issueOps = [];
      config.forEach(q => {
        const ans = answers[q.id];
        if (typeof ans === 'object' && ans.answer === 'Not Satisfactory') {
          const base = {
            category:   'Layered Process Audit',
            subcategory,
            item:       q.id,
            date,
            week,
            month,
            ...ans.issue,
            status:    'Open',
            lastEditedBy: {
              uid: currentUser.uid,
              email: currentUser.email
            },
            linkedAuditId: auditId
          };

          if (ans.issue.issueId) {
            // update existing
            const iRef = doc(db, 'issues', ans.issue.issueId);
            issueOps.push(updateDoc(iRef, base));
          } else {
            // create new
            issueOps.push(
              (async () => {
                const newRef = await addDoc(collection(db, 'issues'), {
                  ...base,
                  createdBy: {
                    uid: currentUser.uid,
                    email: currentUser.email
                  },
                  createdAt: serverTimestamp()
                });
                // store new issueId
                await updateDoc(auditRef, {
                  [`answers.${q.id}.issue.issueId`]: newRef.id
                });
              })()
            );
          }
        }
      });
      await Promise.all(issueOps);

      window.alert('Audit updated successfully!');
      navigate('/audit');
    } catch (e) {
      setError('Error updating audit: ' + e.message);
      window.alert('Error updating audit: ' + e.message);
    }
  }

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: 'auto' }}>
      <h2>Edit Audit</h2>
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

        {/* Time of Day */}
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

        {/* Weekly Sub‐Type */}
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

        {/* Subcategory (read‐only) */}
        <div style={{ marginBottom: 20 }}>
          <label>Subcategory:</label>
          <input type="text" value={subcategory} readOnly />
        </div>

        {/* Questions */}
        {config.map((q, i) => {
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
                backgroundColor: isMissing ? 'rgba(255,0,0,0.1)' : 'transparent'
              }}
            >
              <label>
                {i + 1}. {q.text}
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
                  onIssueChange={(field, val) =>
                    handleIssueChange(q.id, field, val)
                  }
                />
              )}
            </div>
          );
        })}

        <button type="submit">Update Audit</button>
      </form>
    </div>
  );
}
