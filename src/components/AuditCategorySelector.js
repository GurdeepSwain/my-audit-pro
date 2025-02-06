// src/components/AuditCategorySelector.js
import React, { useState } from 'react';

// Define audit categories and sub-categories as a constant object.
// You can later move this to a separate JSON file or store it in Firebase if needed.
const auditCategories = {
  Production: ['Machine Maintenance', 'Line Efficiency', 'Production Downtime'],
  Safety: ['Work Environment', 'Equipment Safety', 'PPE Compliance'],
  Quality: ['Product Quality', 'Defect Rate', 'Quality Control Processes']
};

const AuditCategorySelector = ({ onSelectionChange }) => {
  const categories = Object.keys(auditCategories);
  
  // Set the initial category and sub-category based on the first category available.
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(auditCategories[categories[0]][0]);

  // Handle change for category dropdown
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    // Reset sub-category to the first available option for the new category.
    const firstSubCategory = auditCategories[newCategory][0];
    setSelectedSubCategory(firstSubCategory);
    // Notify parent of the selection change if a callback is provided.
    onSelectionChange && onSelectionChange(newCategory, firstSubCategory);
  };

  // Handle change for sub-category dropdown
  const handleSubCategoryChange = (e) => {
    const newSubCategory = e.target.value;
    setSelectedSubCategory(newSubCategory);
    onSelectionChange && onSelectionChange(selectedCategory, newSubCategory);
  };

  return (
    <div style={styles.container}>
      <div style={styles.field}>
        <label style={styles.label}>Audit Category:</label>
        <select
          value={selectedCategory}
          onChange={handleCategoryChange}
          style={styles.select}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Sub-Category:</label>
        <select
          value={selectedSubCategory}
          onChange={handleSubCategoryChange}
          style={styles.select}
        >
          {auditCategories[selectedCategory].map((subCategory) => (
            <option key={subCategory} value={subCategory}>
              {subCategory}
            </option>
          ))}
        </select>
      </div>
      <div style={styles.selectionDisplay}>
        <strong>Selected:</strong> {selectedCategory} - {selectedSubCategory}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    maxWidth: '400px',
    margin: '20px auto'
  },
  field: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  select: {
    width: '100%',
    padding: '8px',
    fontSize: '16px'
  },
  selectionDisplay: {
    marginTop: '15px',
    fontStyle: 'italic'
  }
};

export default AuditCategorySelector;
