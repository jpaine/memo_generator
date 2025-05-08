// src/components/UrlInput.jsx
import React from "react";

function UrlInput({ url, setUrl }) {
  return (
    <div className="input-group">
      <label htmlFor="url">
        <i className="fas fa-link"></i>
        Website URL (For blog posts or news articles relevant to the company. Limit to 1)
      </label>
      <input
        type="url"
        id="url"
        name="url"
        placeholder="e.g., https://example.com/news-article"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
    </div>
  );
}

export default UrlInput;