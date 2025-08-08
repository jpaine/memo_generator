import React, { useState, useEffect, useCallback } from "react";

const FileUpload = ({ documents, setDocuments }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const detectOCRRequirement = (file) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const scannedPdfIndicators = ['scan', 'scanned', 'image'];
    
    if (imageTypes.includes(file.type)) {
      return true;
    }
    
    if (file.type === 'application/pdf') {
      // Check filename for indicators
      const fileName = file.name.toLowerCase();
      return scannedPdfIndicators.some(indicator => fileName.includes(indicator));
    }
    
    return false;
  };

  const handleFileSelection = (files) => {
    const fileArray = Array.from(files);
    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB per file
    const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total
    
    // Check individual file sizes
    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum 8MB per file.`);
      return;
    }
    
    // Check total size
    const currentSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const newSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_TOTAL_SIZE) {
      alert('Total file size would exceed 15MB limit. Please upload fewer or smaller files.');
      return;
    }
    
    const processedFiles = fileArray.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      requiresOCR: detectOCRRequirement(file),
      status: 'ready'
    }));

    setUploadedFiles(prev => [...prev, ...processedFiles]);
    
    // Update parent component
    const allFiles = [...uploadedFiles, ...processedFiles];
    const regularFiles = allFiles.filter(f => !f.requiresOCR).map(f => f.file);
    const ocrFiles = allFiles.filter(f => f.requiresOCR).map(f => f.file);
    
    setDocuments({ regular: regularFiles, ocr: ocrFiles });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileSelection(files);
  }, [uploadedFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (fileId) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    
    const regularFiles = updatedFiles.filter(f => !f.requiresOCR).map(f => f.file);
    const ocrFiles = updatedFiles.filter(f => f.requiresOCR).map(f => f.file);
    
    setDocuments({ regular: regularFiles, ocr: ocrFiles });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-header">
        <h3>📎 Upload Documents</h3>
        <p>Upload your files and we'll automatically detect if OCR is needed</p>
      </div>

      <div 
        className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="drop-zone-content">
          <div className="upload-icon">📁</div>
          <p className="drop-text">
            Drop your files here or 
            <br/>
            <label htmlFor="file-input" className="browse-link">browse your files</label>
          </p>
          <p className="file-types">Supports PDF, DOCX, Images (JPG, PNG, GIF)</p>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp"
            onChange={(e) => handleFileSelection(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-list">
          <h4>📋 Uploaded Files ({uploadedFiles.length})</h4>
          {uploadedFiles.map(file => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-details">
                  <span className="file-size">{formatFileSize(file.size)}</span>
                  <span className={`file-processing ${file.requiresOCR ? 'ocr' : 'regular'}`}>
                    {file.requiresOCR ? '🔍 OCR Required' : '📄 Text Extraction'}
                  </span>
                </div>
              </div>
              <button 
                className="remove-file-btn"
                onClick={() => removeFile(file.id)}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;