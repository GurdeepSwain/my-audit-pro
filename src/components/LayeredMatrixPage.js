// src/components/LayeredMatrixPage.js
import React, { useState } from 'react';
import DynamicLayeredMatrix from './DynamicLayeredMatrix';

function LayeredMatrixPage() {
  // Local state for subcategory and selected week
  const [subcategory, setSubcategory] = useState("FIP 2"); // default
  const [selectedWeek, setSelectedWeek] = useState("2025-W09"); // default example

  return (
    <div style={{ padding: '20px' }}>
      <h2>Layered Process Audit Matrix</h2>
      
      <div style={{ marginBottom: '10px' }}>
        <label>Subcategory: </label>
        <select 
          value={subcategory} 
          onChange={(e) => setSubcategory(e.target.value)}
        >
          <option value="FIP 1">FIP 1</option>
          <option value="FIP 2">FIP 2</option>
          <option value="Conventional">Conventional</option>
        </select>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Select Week: </label>
        <input 
          type="week" 
          value={selectedWeek} 
          onChange={(e) => setSelectedWeek(e.target.value)} 
        />
      </div>

      {/* Pass these values as props to the DynamicLayeredMatrix */}
      <DynamicLayeredMatrix 
        selectedWeek={selectedWeek} 
        subcategory={subcategory} 
      />
    </div>
  );
}

export default LayeredMatrixPage;
