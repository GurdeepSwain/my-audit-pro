// src/components/DailyAuditEntry.js
import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import AuditCategorySelector from './AuditCategorySelector';

const DailyAuditEntry = () => {
  // Form state for each field
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [equipmentInspection, setEquipmentInspection] = useState('');
  const [safetyCompliance, setSafetyCompliance] = useState('');
  
  // States for category selection
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  
  // States for handling loading, errors, and success messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Callback for the AuditCategorySelector component
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
      // Create a new audit entry document in the "audits" collection
      await addDoc(collection(db, "audits"), {
        type: "daily",
        date, // audit date
        category, // selected audit category
        subCategory, // selected sub-category
        equipmentInspection,
        safetyCompliance,
        createdAt: serverTimestamp() // record creation time
      });
      setSuccessMsg("Audit entry submitted successfully!");
      
      // Optionally reset some fields after successful submission:
      setEquipmentInspection('');
      setSafetyCompliance('');
    } catch (err) {
      setError("Error submitting audit: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <h1>Daily Audit Entry</h1>
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label>Date:</label>
          <input 
            type="date" 
            style={styles.input} 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        
        {/* Category and Sub-Category Selector */}
        <AuditCategorySelector onSelectionChange={handleCategorySelection} />
        
        <div style={styles.formGroup}>
          <label>Inspection of Equipment:</label>
          <input 
            type="text" 
            style={styles.input} 
            placeholder="Enter details" 
            value={equipmentInspection}
            onChange={(e) => setEquipmentInspection(e.target.value)}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label>Safety Compliance:</label>
          <input 
            type="text" 
            style={styles.input} 
            placeholder="Enter details" 
            value={safetyCompliance}
            onChange={(e) => setSafetyCompliance(e.target.value)}
          />
        </div>
        
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Submitting..." : "Submit Audit"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  card: {
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    maxWidth: '800px',
    margin: 'auto'
  },
  formGroup: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    boxSizing: 'border-box'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default DailyAuditEntry;
