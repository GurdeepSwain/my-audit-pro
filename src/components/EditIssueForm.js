// src/components/EditIssueForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const EditIssueForm = () => {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [issueData, setIssueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch the issue document on component mount
  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const issueDocRef = doc(db, 'issues', issueId);
        const issueDoc = await getDoc(issueDocRef);
        if (issueDoc.exists()) {
          setIssueData(issueDoc.data());
        } else {
          setError('Issue not found');
        }
      } catch (err) {
        setError('Error fetching issue: ' + err.message);
      }
      setLoading(false);
    };
    fetchIssue();
  }, [issueId]);

  // Handle input changes for each field.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setIssueData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const issueDocRef = doc(db, 'issues', issueId);
      
      // Prepare the updated data.
      const updatedData = {
        ...issueData,
        lastEditedBy: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
        lastEditedAt: serverTimestamp()
      };
      
      // Update the editedBy array:
      // If editedBy already exists, add the current user if not already in it.
      if (currentUser) {
        if (issueData.editedBy && Array.isArray(issueData.editedBy)) {
          const alreadyExists = issueData.editedBy.some(user => user.uid === currentUser.uid);
          if (!alreadyExists) {
            updatedData.editedBy = [...issueData.editedBy, { uid: currentUser.uid, email: currentUser.email }];
          }
        } else {
          updatedData.editedBy = [{ uid: currentUser.uid, email: currentUser.email }];
        }
      }

      await updateDoc(issueDocRef, updatedData);
      setSuccessMessage('Issue updated successfully!');
      // After a short delay, navigate back to the Issues Dashboard.
      setTimeout(() => {
        navigate('/issues');
      }, 2000);
    } catch (err) {
      setError('Error updating issue: ' + err.message);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading issue data...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h2>Edit Issue</h2>
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        {/* Category (read-only) */}
        <div style={{ marginBottom: '10px' }}>
          <label>Category: </label>
          <input type="text" name="category" value={issueData.category || ''} readOnly />
        </div>
        {/* Subcategory */}
        <div style={{ marginBottom: '10px' }}>
          <label>Subcategory: </label>
          <input type="text" name="subcategory" value={issueData.subcategory || ''} onChange={handleChange} required />
        </div>
        {/* Section # */}
        <div style={{ marginBottom: '10px' }}>
          <label>Section #: </label>
          <input type="text" name="section" value={issueData.section || ''} onChange={handleChange} required />
        </div>
        {/* Item # */}
        <div style={{ marginBottom: '10px' }}>
          <label>Item #: </label>
          <input type="text" name="item" value={issueData.item || ''} onChange={handleChange} required />
        </div>
        {/* Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Date: </label>
          <input type="date" name="date" value={issueData.date || ''} onChange={handleChange} required />
        </div>
        {/* Location */}
        <div style={{ marginBottom: '10px' }}>
          <label>Location: </label>
          <input type="text" name="location" value={issueData.location || ''} onChange={handleChange} required />
        </div>
        {/* Problem Description */}
        <div style={{ marginBottom: '10px' }}>
          <label>Problem Description: </label>
          <textarea name="problemDescription" value={issueData.problemDescription || ''} onChange={handleChange} required />
        </div>
        {/* Owner */}
        <div style={{ marginBottom: '10px' }}>
          <label>Owner: </label>
          <input type="text" name="owner" value={issueData.owner || ''} onChange={handleChange} required />
        </div>
        {/* Countermeasure */}
        <div style={{ marginBottom: '10px' }}>
          <label>Countermeasure: </label>
          <textarea name="countermeasure" value={issueData.countermeasure || ''} onChange={handleChange} required />
        </div>
        {/* Target Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Target Date: </label>
          <input type="date" name="targetDate" value={issueData.targetDate || ''} onChange={handleChange} required />
        </div>
        {/* Initials */}
        <div style={{ marginBottom: '10px' }}>
          <label>Initials: </label>
          <input type="text" name="initials" value={issueData.initials || ''} onChange={handleChange} required />
        </div>
        {/* Completion Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Completion Date: </label>
          <input type="date" name="completionDate" value={issueData.completionDate || ''} onChange={handleChange} />
        </div>
        {/* Status */}
        <div style={{ marginBottom: '10px' }}>
          <label>Status: </label>
          <select name="status" value={issueData.status || 'Open'} onChange={handleChange} required>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Issue'}
        </button>
      </form>
    </div>
  );
};

export default EditIssueForm;
