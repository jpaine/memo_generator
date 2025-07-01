import React from 'react';

function ErrorMessage({ error }) {
  // Consistent contact message used across all error types
  const contactMessage = "If you continue to experience issues, please email veer.dosi@goldengate.vc.";

  // Handle cases where error is undefined or null
  if (!error) {
    return (
      <div className="error-message">
        <p>An unexpected error occurred.</p>
        <p>{contactMessage}</p>
      </div>
    );
  }

  const errorString = String(error);

  // Handle rate limit errors (429)
  if (errorString.includes("429") || errorString.toLowerCase().includes("rate limit")) {
    return (
      <div className="error-message">
        <p>Daily OpenAI credits exceeded, try tomorrow or message veer.dosi@goldengate.vc.</p>
      </div>
    );
  }

  // Handle bad request errors (400)
  if (errorString.includes("400") || errorString.toLowerCase().includes("bad request")) {
    return (
      <div className="error-message">
        <p>Please check your uploaded documents. Either no documents were uploaded or they are in an incorrect format.</p>
        <p>{contactMessage}</p>
      </div>
    );
  }

  // Handle gateway timeout errors (504)
  if (errorString.includes("504") || 
      errorString.toLowerCase().includes("gateway timeout") ||
      errorString.includes("Request failed with status code 504")) {  // Add this condition
    return (
      <div className="error-message">
        <p>Our system timed out while processing your request, likely due to a temporary issue. A retry often resolves this. If you're analyzing large documents, consider reducing their content.</p>
        <p>{contactMessage}</p>
      </div>
    );
  }

  // For all other errors, display the error message with the contact information
  return (
    <div className="error-message">
      <p>{errorString}</p>
      <p>{contactMessage}</p>
    </div>
  );
}

export default ErrorMessage;
