import React from "react";

function MemorandumDisplay({
  result,
  cleanHtml,
  showDownload,
  handleDownload,
  handleDownloadWord,
  handleDownloadPDF,
}) {
  return (
    <div className="result-container">
      <h2>Generated Memorandum</h2>
      <div
        className="memorandum"
        dangerouslySetInnerHTML={{ __html: cleanHtml(result) }}
      ></div>
      {showDownload && (
        <div className="download-buttons" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadWord || handleDownload}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-file-word"></i> Download as Word
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDownloadPDF}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#dc3545',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-file-pdf"></i> Download as PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default MemorandumDisplay;
