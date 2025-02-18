// src/components/LayeredAuditMatrix.js
import React from 'react';

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Example items for Section #1
const section1Items = [
  "Are all Quality Standards present for parts that are running",
  "Are all Pack Standards present for parts that are running",
  "Are the work stations neat clean and orderly (5S)",
  "Are all the necessary tools provided to perform the daily task?",
  // ... etc.
];

// Example items for Section #2
const section2Items = [
  "Are all external customer issues tracked on Natural Work Team board",
  "Are all Quality Alerts posted on the boards"
];

// Example items for Section #3
const section3Items = [
  "Are LPA's being performed by all layers of management?"
];

// Utility arrays for daily columns
const dailyTimeSlots = ["M", "D", "A"];

const LayeredAuditMatrix = () => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', minWidth: '1200px' }}>
        <thead>
          {/* Top Header Row */}
          <tr>
            <th rowSpan="3" style={{ backgroundColor: '#f0f0f0' }}>Audit Items</th>
            <th colSpan={daysOfWeek.length * dailyTimeSlots.length} style={{ backgroundColor: '#f0f0f0' }}>
              Layer 1 - Daily by Supervisors
            </th>
            <th rowSpan="3" style={{ backgroundColor: '#f0f0f0', minWidth: '100px' }}>
              Weekly Audit by Quality Tech
            </th>
            <th rowSpan="3" style={{ backgroundColor: '#f0f0f0', minWidth: '100px' }}>
              Weekly Audit by Operations Manager
            </th>
            <th rowSpan="3" style={{ backgroundColor: '#f0f0f0', minWidth: '120px' }}>
              Monthly Audit by Site/Quality Manager
            </th>
          </tr>

          {/* Second Header Row: Days of the Week */}
          <tr>
            {daysOfWeek.map((day) => (
              <th key={day} colSpan={dailyTimeSlots.length} style={{ backgroundColor: '#fafafa' }}>
                {day}
              </th>
            ))}
          </tr>

          {/* Third Header Row: M, D, A */}
          <tr>
            {daysOfWeek.map((day) =>
              dailyTimeSlots.map((slot) => (
                <th key={`${day}-${slot}`} style={{ backgroundColor: '#fafafa' }}>
                  {slot}
                </th>
              ))
            )}
          </tr>
        </thead>

        <tbody>
          {/* Section #1 Header Row */}
          <tr style={{ backgroundColor: '#e0e0e0' }}>
            <td colSpan={1 + (daysOfWeek.length * dailyTimeSlots.length) + 3}>
              <strong>Section #1: WORK STATION SPECIFIC</strong>
            </td>
          </tr>
          {/* Section #1 Items */}
          {section1Items.map((item, idx) => (
            <tr key={`sec1-item-${idx}`}>
              <td>{item}</td>
              {/* Daily columns */}
              {daysOfWeek.map((day) =>
                dailyTimeSlots.map((slot) => (
                  <td key={`${day}-${slot}-sec1-${idx}`}>
                    {/* Placeholder: you might replace with a dropdown or input for √, X, or N/A */}
                    <span style={{ color: 'green' }}>√</span>
                  </td>
                ))
              )}
              {/* Weekly/Monthly placeholders */}
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center' }}>-</td>
            </tr>
          ))}

          {/* Section #2 Header Row */}
          <tr style={{ backgroundColor: '#e0e0e0' }}>
            <td colSpan={1 + (daysOfWeek.length * dailyTimeSlots.length) + 3}>
              <strong>Section #2: QUALITY SYSTEM SPECIFIC (VOICE OF THE CUSTOMER/NATURAL WORK TEAM EXIT CRITERIA)</strong>
            </td>
          </tr>
          {/* Section #2 Items */}
          {section2Items.map((item, idx) => (
            <tr key={`sec2-item-${idx}`}>
              <td>{item}</td>
              {/* Daily columns */}
              {daysOfWeek.map((day) =>
                dailyTimeSlots.map((slot) => (
                  <td key={`${day}-${slot}-sec2-${idx}`}>
                    <span style={{ color: 'green' }}>√</span>
                  </td>
                ))
              )}
              {/* Weekly/Monthly placeholders */}
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center' }}>-</td>
            </tr>
          ))}

          {/* Section #3 Header Row */}
          <tr style={{ backgroundColor: '#e0e0e0' }}>
            <td colSpan={1 + (daysOfWeek.length * dailyTimeSlots.length) + 3}>
              <strong>Section #3: MANUFACTURING SYSTEM SPECIFIC (PART-PRODUCT/PROCESS/SYSTEM)</strong>
            </td>
          </tr>
          {/* Section #3 Items */}
          {section3Items.map((item, idx) => (
            <tr key={`sec3-item-${idx}`}>
              <td>{item}</td>
              {/* Daily columns */}
              {daysOfWeek.map((day) =>
                dailyTimeSlots.map((slot) => (
                  <td key={`${day}-${slot}-sec3-${idx}`}>
                    <span style={{ color: 'green' }}>√</span>
                  </td>
                ))
              )}
              {/* Weekly/Monthly placeholders */}
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center' }}>-</td>
              <td style={{ textAlign: 'center' }}>-</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '20px' }}>
        <p><strong>Legend:</strong></p>
        <p>√ = Satisfactory &nbsp; | &nbsp; X = Not Satisfactory &nbsp; | &nbsp; N/A = Not Applicable</p>
      </div>
    </div>
  );
};

export default LayeredAuditMatrix;
