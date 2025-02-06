// src/components/Dashboard.js
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AuditCategorySelector from './AuditCategorySelector';

const Dashboard = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');

  // Callback to capture selected category and sub-category
  const handleCategorySelection = (category, subCategory) => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
    console.log('Dashboard: Selected', category, '-', subCategory);
    // Optionally, filter audit summaries or data here based on the selected category.
  };

  return (
    <div style={componentStyles.card}>
      <h1>Dashboard</h1>
      <p>Overview and statistics will appear here.</p>
      
      <div style={componentStyles.filterSection}>
        <h4>Filter Audits by Category:</h4>
        <AuditCategorySelector onSelectionChange={handleCategorySelection} />
      </div>
      
      <div style={componentStyles.summary}>
        <p>
          <strong>Selected Category:</strong> {selectedCategory} - {selectedSubCategory}
        </p>
        {/* You can add additional summary or filtered data here */}
      </div>

      <ul style={componentStyles.list}>
        <li><NavLink to="/daily-audit">Daily Audit Entry</NavLink></li>
        <li><NavLink to="/weekly-audit">Weekly Audit Entry</NavLink></li>
      </ul>
    </div>
  );
};

const componentStyles = {
  card: {
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    maxWidth: '800px',
    margin: 'auto'
  },
  filterSection: {
    marginBottom: '20px'
  },
  summary: {
    marginBottom: '20px',
    fontStyle: 'italic'
  },
  list: {
    listStyleType: 'none',
    padding: 0
  }
};

export default Dashboard;
