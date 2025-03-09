// src/components/IssuesDashboard.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { NavLink } from 'react-router-dom';

const subcategories = ["FIP 1", "FIP 2", "Conventional"];
const statusOptions = ["Open", "In Progress", "Resolved"];
const sortOptions = [
  { value: 'createdAt_asc', label: 'Created At (Oldest)' },
  { value: 'createdAt_desc', label: 'Created At (Newest)' }
];

const IssuesDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter state variables
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc");

  // Helper function to format Firestore Timestamps to a local date/time string.
  const formatTimestamp = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    return timestamp || "";
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      let issuesRef = collection(db, 'issues');
      let qConstraints = [];

      // Apply filters if selected.
      if (selectedWeek) {
        qConstraints.push(where('week', '==', selectedWeek));
      }
      if (selectedSubcategory) {
        qConstraints.push(where('subcategory', '==', selectedSubcategory));
      }
      if (selectedStatus) {
        qConstraints.push(where('status', '==', selectedStatus));
      }

      // Add ordering based on sortBy option.
      const [field, order] = sortBy.split('_');
      qConstraints.push(orderBy(field, order));

      const q = query(issuesRef, ...qConstraints);
      const issuesSnapshot = await getDocs(q);
      const fetchedIssues = [];
      issuesSnapshot.forEach(doc => {
        fetchedIssues.push({ id: doc.id, ...doc.data() });
      });
      setIssues(fetchedIssues);
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError("Error fetching issues: " + err.message);
    }
    setLoading(false);
  };

  // Fetch issues whenever any filter or sort option changes.
  useEffect(() => {
    fetchIssues();
  }, [selectedWeek, selectedSubcategory, selectedStatus, sortBy]);

  return (
    <div style={{  overflowX: 'visible', width: '100vh'}}>
      <h2>Issues Dashboard</h2>
      
      {/* Filter & Sorting Section */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Filter & Sort Issues</h4>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label>Week: </label>
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            />
          </div>
          <div>
            <label>Subcategory: </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
            >
              <option value="">All</option>
              {subcategories.map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Status: </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Sort By: </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Display total count */}
      <p><strong>Total Issues: {issues.length}</strong></p>

      {loading && <div>Loading issues...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <table className='table table-bordered border-black table-hover' border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', justifyContent: 'center', alignItems:'center' }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Section #</th>
            <th>Item #</th>
            <th>Date</th>
            <th>Week</th>
            <th>Location</th>
            <th>Problem Description</th>
            <th>Owner</th>
            <th>Countermeasure</th>
            <th>Target Date</th>
            <th>Initials</th>
            <th>Completion Date</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Last Edited At</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, index) => (
            <tr key={issue.id}>
              <td>{index + 1}</td>
              <td>{issue.category}</td>
              <td>{issue.subcategory}</td>
              <td>{issue.section}</td>
              <td>{issue.item}</td>
              <td>{issue.date}</td>
              <td>{issue.week || "-"}</td>
              <td>{issue.location}</td>
              <td>{issue.problemDescription}</td>
              <td>{issue.owner}</td>
              <td>{issue.countermeasure}</td>
              <td>{issue.targetDate}</td>
              <td>{issue.initials}</td>
              <td>{issue.completionDate}</td>
              <td>{issue.status}</td>
              <td>{issue.createdAt ? formatTimestamp(issue.createdAt) : "-"}</td>
              <td>{issue.lastEditedAt ? formatTimestamp(issue.lastEditedAt) : "-"}</td>
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
