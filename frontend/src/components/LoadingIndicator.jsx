import React from "react";

function LoadingIndicator() {
  return (
    <div className="loading-indicator">
      <div className="spinner"></div>
      <p>Generating memorandum... This may take 3 to 10 minutes. You can open and work on other tabs but do not close the window</p>
    </div>
  );
}

export default LoadingIndicator;
