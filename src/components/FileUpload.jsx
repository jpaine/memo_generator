// src/components/FileUpload.jsx

import React, { useState, useEffect } from "react";

function FileUpload({
  documents,
  setDocuments,
  ocrDocuments,
  setOcrDocuments,
}) {
  const [documentsSelected, setDocumentsSelected] = useState(0);
  const [ocrDocumentsSelected, setOcrDocumentsSelected] = useState(0);

  useEffect(() => {
    console.log("Documents updated:", documents);
    setDocumentsSelected(documents ? documents.length : 0);
  }, [documents]);

  useEffect(() => {
    console.log("OCR Documents updated:", ocrDocuments);
    setOcrDocumentsSelected(ocrDocuments ? ocrDocuments.length : 0);
  }, [ocrDocuments]);

  const handleDocumentsChange = (e) => {
    console.log("Documents change event:", e.target.files);
    setDocuments(e.target.files);
  };

  const handleOcrDocumentsChange = (e) => {
    console.log("OCR Documents change event:", e.target.files);
    setOcrDocuments(e.target.files);
  };

  return (
    <div className="input-row">
      <div className="input-group">
        <label htmlFor="documents">
          <i className="fas fa-file-upload"></i>
          Upload Documents (For files with text format that don't require OCR.)
        </label>
        <div className="file-input-wrapper">
          <input
            type="file"
            id="documents"
            name="documents"
            multiple
            onChange={handleDocumentsChange}
            style={{ display: "none" }}
          />
          <label htmlFor="documents" className="file-input-text">
            {documentsSelected > 0
              ? `${documentsSelected} file(s) selected`
              : "Choose files"}
          </label>
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="ocrDocuments">
          <i className="fas fa-file-image"></i>
          Upload Documents (For files that require OCR to extract content.)
        </label>
        <div className="file-input-wrapper">
          <input
            type="file"
            id="ocrDocuments"
            name="ocrDocuments"
            multiple
            onChange={handleOcrDocumentsChange}
            style={{ display: "none" }}
          />
          <label htmlFor="ocrDocuments" className="file-input-text">
            {ocrDocumentsSelected > 0
              ? `${ocrDocumentsSelected} file(s) selected`
              : "Choose files"}
          </label>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;