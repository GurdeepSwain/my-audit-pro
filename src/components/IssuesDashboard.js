// src/components/IssuesDashboard.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NavLink } from 'react-router-dom';

const IssuesDashboard = () => {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const issuesSnapshot = await getDocs(collection(db, 'issues'));
        const fetchedIssues = [];
        issuesSnapshot.forEach(doc => {
          fetchedIssues.push({ id: doc.id, ...doc.data() });
        });
        setIssues(fetchedIssues);
      } catch (err) {
        console.error("Error fetching issues:", err);
      }
    };
    fetchIssues();
  }, []);

  // Helper function to format Firestore Timestamps to a local date/time string.
  const formatTimestamp = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    return timestamp || "";
  };

  return (
    <div style={{ maxWidth: '1000px', margin: 'auto', padding: '20px' }}>
      <h2>Issues Dashboard</h2>
      <table className='table table-bordered border-black table-hover' border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Section #</th>
            <th>Item #</th>
            <th>Date</th>
            <th>Location</th>
            <th>Problem Description</th>
            <th>Owner</th>
            <th>Countermeasure</th>
            <th>Target Date</th>
            <th>Initials</th>
            <th>Completion Date</th>
            <th>Status</th>
            {/* <th>Linked Audit ID</th>
            <th>Created By</th>
            <th>Created At</th>
            <th>Last Edited By</th>
            <th>Last Edited At</th> */}
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {issues.map(issue => (
            <tr key={issue.id}>
              <td>{issue.category}</td>
              <td>{issue.subcategory}</td>
              <td>{issue.section}</td>
              <td>{issue.item}</td>
              <td>{issue.date}</td>
              <td>{issue.location}</td>
              <td>{issue.problemDescription}</td>
              <td>{issue.owner}</td>
              <td>{issue.countermeasure}</td>
              <td>{issue.targetDate}</td>
              <td>{issue.initials}</td>
              <td>{issue.completionDate}</td>
              <td>{issue.status}</td>
              {/* <td>{issue.linkedAuditId || "-"}</td>
              <td>{issue.createdBy ? issue.createdBy.email : "-"}</td>
              <td>{formatTimestamp(issue.createdAt)}</td>
              <td>{issue.lastEditedBy ? issue.lastEditedBy.email : "-"}</td>
              <td>{formatTimestamp(issue.lastEditedAt)}</td> */}
              <td>
                <NavLink to={`/edit-issue/${issue.id}`}>Edit</NavLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IssuesDashboard;
