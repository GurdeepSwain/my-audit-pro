import React, { useState, useEffect } from 'react';

const LayeredProcessAuditForm = () => {
  const [config, setConfig] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [answers, setAnswers] = useState({});

  // Load the configuration file for "Layered Process Audit"
  useEffect(() => {
    import('../configs/layeredProcessAudit.json')
      .then((module) => {
        setConfig(module.default);
        const keys = Object.keys(module.default);
        if (keys.length > 0) {
          setSelectedSubCategory(keys[0]); // default to first subcategory
        }
      })
      .catch((err) => console.error('Error loading configuration:', err));
  }, []);

  const handleChange = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can process or submit the answers, for example, saving to Firestore
    console.log('Layered Process Audit Answers for', selectedSubCategory, answers);
  };

  if (!config) return <div>Loading questions...</div>;

  const subcategories = Object.keys(config);
  const questions = config[selectedSubCategory] || [];

  return (
    <div>
      <h1>Layered Process Audit</h1>
      <div style={{ marginBottom: '20px' }}>
        <label>Select Subcategory: </label>
        <select
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
        >
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>
      <form onSubmit={handleSubmit}>
        {questions.map((q) => (
          <div key={q.id} style={{ marginBottom: '15px' }}>
            <label>{q.question}</label>
            {q.type === 'radio' && q.options && (
              q.options.map((option) => (
                <div key={option}>
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={option}
                    onChange={(e) => handleChange(q.id, e.target.value)}
                  />
                  {option}
                </div>
              ))
            )}
            {q.type === 'number' && (
              <input
                type="number"
                name={`question-${q.id}`}
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}
            {q.type === 'textarea' && (
              <textarea
                name={`question-${q.id}`}
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}
          </div>
        ))}
        <button type="submit">Submit Audit</button>
      </form>
    </div>
  );
};

export default LayeredProcessAuditForm;
