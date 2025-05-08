// src/components/MemorandumDisplay.jsx
import React from "react";

function MemorandumDisplay({
  result,
  cleanHtml,
  showDownload,
  handleDownload,
}) {
  return (
    <div className="result-container">
      <h2>Generated Memorandum</h2>
      <div
        className="memorandum"
        dangerouslySetInnerHTML={{ __html: cleanHtml(result) }}
      ></div>
      {showDownload && (
        <button
          id="downloadBtn"
          className="btn btn-success"
          onClick={handleDownload}
        >
          <i className="fas fa-download"></i> Download Memorandum
        </button>
      )}
    </div>
  );
}

export default MemorandumDisplay;
