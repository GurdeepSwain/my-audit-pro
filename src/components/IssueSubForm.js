// src/components/IssueSubForm.js
import React from 'react';

const IssueSubForm = ({ autoData, issueData, onIssueChange }) => {
  return (
    <div style={{ marginTop: '5px', border: '1px dashed #ccc', padding: '10px' }}>
      <h4>Issue Details</h4>
      <p>
        <strong>Category:</strong> {autoData.category}<br />
        <strong>Subcategory:</strong> {autoData.subcategory}<br />
        <strong>Section:</strong> {autoData.section}<br />
        <strong>Item (Question):</strong> {autoData.item}<br />
        <strong>Date:</strong> {autoData.date}
      </p>
      <div style={{ marginBottom: '5px' }}>
        <label>Location:</label>
        <input
          type="text"
          value={issueData.location || ""}
          onChange={(e) => onIssueChange("location", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label>Problem Description:</label>
        <textarea
          value={issueData.problemDescription || ""}
          onChange={(e) => onIssueChange("problemDescription", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label>Owner:</label>
        <input
          type="text"
          value={issueData.owner || ""}
          onChange={(e) => onIssueChange("owner", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label>Countermeasure:</label>
        <textarea
          value={issueData.countermeasure || ""}
          onChange={(e) => onIssueChange("countermeasure", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label>Target Date:</label>
        <input
          type="date"
          value={issueData.targetDate || ""}
          onChange={(e) => onIssueChange("targetDate", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label>Initials:</label>
        <input
          type="text"
          value={issueData.initials || ""}
          onChange={(e) => onIssueChange("initials", e.target.value)}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label>Completion Date:</label>
        <input
          type="date"
          value={issueData.completionDate || ""}
          onChange={(e) => onIssueChange("completionDate", e.target.value)}
        />
      </div>
    </div>
  );
};

export default IssueSubForm;
