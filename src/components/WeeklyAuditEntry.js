// src/components/WeeklyAuditEntry.js
import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import AuditCategorySelector from './AuditCategorySelector';

const WeeklyAuditEntry = () => {
  // State for week selection and audit overview
  const [week, setWeek] = useState('');
  const [overview, setOverview] = useState('');
  
  // States for category and sub-category selection
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  
  // States for handling loading, errors, and success messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Callback for AuditCategorySelector to capture selected category & sub-category
  const handleCategorySelection = (selectedCategory, selectedSubCategory) => {
    setCategory(selectedCategory);
    setSubCategory(selectedSubCategory);
  };

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Create a new document in the "audits" collection with type "weekly"
      await addDoc(collection(db, "audits"), {
        type: "weekly",
        week,           // Selected week (from <input type="week" />)
        category,       // Selected audit category
        subCategory,    // Selected sub-category
        overview,       // Weekly summary or overview text
        createdAt: serverTimestamp()  // Record creation time
      });
      setSuccessMsg("Weekly audit entry submitted successfully!");
      
      // Optionally reset fields after successful submission
      setOverview('');
      setWeek('');
    } catch (err) {
      setError("Error submitting audit: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <h1>Weekly Audit Entry</h1>
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label>Select Week:</label>
          <input 
            type="week" 
            style={styles.input} 
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            required
          />
        </div>
        
        {/* Audit Category and Sub-Category Selector */}
        <AuditCategorySelector onSelectionChange={handleCategorySelection} />
        
        <div style={styles.formGroup}>
          <label>Overview:</label>
          <textarea 
            style={styles.input} 
            placeholder="Enter weekly summary"
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Submitting..." : "Submit Weekly Report"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  card: {
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    maxWidth: "800px",
    margin: "auto"
  },
  formGroup: {
    marginBottom: "15px"
  },
  input: {
    width: "100%",
    padding: "8px",
    marginTop: "5px",
    boxSizing: "border-box"
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  }
};

export default WeeklyAuditEntry;
