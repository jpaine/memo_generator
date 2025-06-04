import React, { useState } from "react";

const MultiUrlInput = ({ urls, setUrls }) => {
  const [urlInputs, setUrlInputs] = useState([
    { id: 1, value: "", type: "company", placeholder: "Company website URL" },
    { id: 2, value: "", type: "news", placeholder: "News article URL" },
    { id: 3, value: "", type: "other", placeholder: "Additional resource URL" }
  ]);

  const urlTypes = [
    { value: "company", label: "🏢 Company Website", icon: "🏢" },
    { value: "news", label: "📰 News Article", icon: "📰" },
    { value: "product", label: "🛍️ Product Page", icon: "🛍️" },
    { value: "social", label: "📱 Social Media", icon: "📱" },
    { value: "blog", label: "📝 Blog Post", icon: "📝" },
    { value: "other", label: "🔗 Other", icon: "🔗" }
  ];

  const updateUrl = (id, field, value) => {
    const updated = urlInputs.map(input => 
      input.id === id ? { ...input, [field]: value } : input
    );
    setUrlInputs(updated);
    
    // Update parent component with non-empty URLs
    const validUrls = updated
      .filter(input => input.value.trim())
      .map(input => ({
        url: input.value,
        type: input.type
      }));
    setUrls(validUrls);
  };

  const addUrlInput = () => {
    const newId = Math.max(...urlInputs.map(u => u.id)) + 1;
    setUrlInputs([...urlInputs, {
      id: newId,
      value: "",
      type: "other",
      placeholder: "Additional URL"
    }]);
  };

  const removeUrlInput = (id) => {
    if (urlInputs.length > 1) {
      const updated = urlInputs.filter(input => input.id !== id);
      setUrlInputs(updated);
      
      const validUrls = updated
        .filter(input => input.value.trim())
        .map(input => ({
          url: input.value,
          type: input.type
        }));
      setUrls(validUrls);
    }
  };

  const getTypeIcon = (type) => {
    const typeObj = urlTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : "🔗";
  };

  return (
    <div className="multi-url-container">
      <div className="url-header">
        <h3>🌐 Website URLs</h3>
        <p>Add multiple URLs for comprehensive analysis</p>
      </div>

      <div className="url-inputs-list">
        {urlInputs.map(input => (
          <div key={input.id} className="url-input-row">
            <div className="url-type-selector">
              <select
                value={input.type}
                onChange={(e) => updateUrl(input.id, 'type', e.target.value)}
                className="url-type-select"
              >
                {urlTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label.replace(/^[^\s]+ /, '')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="url-input-wrapper">
              <span className="url-icon">{getTypeIcon(input.type)}</span>
              <input
                type="url"
                value={input.value}
                onChange={(e) => updateUrl(input.id, 'value', e.target.value)}
                placeholder={input.placeholder}
                className="url-input"
              />
              {urlInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrlInput(input.id)}
                  className="remove-url-btn"
                  title="Remove this URL"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addUrlInput}
        className="add-url-btn"
        disabled={urlInputs.length >= 8}
      >
        ➕ Add Another URL
      </button>

      {urls.length > 0 && (
        <div className="url-summary">
          <h4>📊 URLs to Process ({urls.length})</h4>
          <div className="url-preview-list">
            {urls.map((urlObj, index) => (
              <div key={index} className="url-preview">
                <span className="url-preview-icon">{getTypeIcon(urlObj.type)}</span>
                <span className="url-preview-text">{urlObj.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiUrlInput;