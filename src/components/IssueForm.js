// src/components/IssueForm.js
import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const IssueForm = () => {
  const { currentUser } = useAuth(); // to capture user details (if needed)
  // Define initial state for the issue fields.
  const [formData, setFormData] = useState({
    category: "Layered Process Audit", // fixed in our example
    subcategory: "FIP 1",              // default subcategory
    section: "1",                      // default section number (options: 1,2,3)
    item: "",
    date: new Date().toISOString().split("T")[0],
    location: "",
    problemDescription: "",
    owner: "",
    countermeasure: "",
    targetDate: "",
    initials: "",
    completionDate: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle input changes for each field
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    // Build the issue data with additional metadata (e.g., user details)
    const issueData = {
      ...formData,
      createdBy: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
      createdAt: serverTimestamp(),
      status: "Open"  // You can track status ("Open", "In Progress", "Resolved", etc.)
    };

    try {
      const docRef = await addDoc(collection(db, 'issues'), issueData);
      console.log("Issue submitted with ID:", docRef.id);
      setSuccessMessage('Issue submitted successfully!');
      // Optionally reset the form (or navigate away)
      setFormData({
        category: "Layered Process Audit",
        subcategory: "FIP 1",
        section: "1",
        item: "",
        date: new Date().toISOString().split("T")[0],
        location: "",
        problemDescription: "",
        owner: "",
        countermeasure: "",
        targetDate: "",
        initials: "",
        completionDate: ""
      });
    } catch (err) {
      console.error('Error submitting issue:', err);
      setError('Error submitting issue: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h2>New Issue Entry</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        {/* Category is fixed */}
        <div style={{ marginBottom: '10px' }}>
          <label>Category: </label>
          <input type="text" name="category" value={formData.category} readOnly />
        </div>
        {/* Subcategory selection */}
        <div style={{ marginBottom: '10px' }}>
          <label>Subcategory: </label>
          <select name="subcategory" value={formData.subcategory} onChange={handleChange} required>
            <option value="FIP 1">FIP 1</option>
            <option value="FIP 2">FIP 2</option>
            <option value="Conventional">Conventional</option>
          </select>
        </div>
        {/* Section number (1,2,3) */}
        <div style={{ marginBottom: '10px' }}>
          <label>Section #: </label>
          <select name="section" value={formData.section} onChange={handleChange} required>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
        {/* Item number (question/item number) */}
        <div style={{ marginBottom: '10px' }}>
          <label>Item #: </label>
          <input type="text" name="item" value={formData.item} onChange={handleChange} required />
        </div>
        {/* Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Date: </label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </div>
        {/* Location */}
        <div style={{ marginBottom: '10px' }}>
          <label>Location: </label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} required />
        </div>
        {/* Problem Description */}
        <div style={{ marginBottom: '10px' }}>
          <label>Problem Description: </label>
          <textarea name="problemDescription" value={formData.problemDescription} onChange={handleChange} required />
        </div>
        {/* Owner */}
        <div style={{ marginBottom: '10px' }}>
          <label>Owner: </label>
          <input type="text" name="owner" value={formData.owner} onChange={handleChange} required />
        </div>
        {/* Countermeasure */}
        <div style={{ marginBottom: '10px' }}>
          <label>Countermeasure: </label>
          <textarea name="countermeasure" value={formData.countermeasure} onChange={handleChange} required />
        </div>
        {/* Target Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Target Date: </label>
          <input type="date" name="targetDate" value={formData.targetDate} onChange={handleChange} required />
        </div>
        {/* Initials */}
        <div style={{ marginBottom: '10px' }}>
          <label>Initials: </label>
          <input type="text" name="initials" value={formData.initials} onChange={handleChange} required />
        </div>
        {/* Completion Date */}
        <div style={{ marginBottom: '10px' }}>
          <label>Completion Date: </label>
          <input type="date" name="completionDate" value={formData.completionDate} onChange={handleChange} />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Issue'}
        </button>
      </form>
    </div>
  );
};

export default IssueForm;
