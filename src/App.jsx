import React, { useState } from "react";
import axios from "axios";

import FileUpload from "./components/FileUpload";
import DealTerms from "./components/DealTerms";
import FounderInfo from "./components/FounderInfo";
import MemorandumDisplay from "./components/MemorandumDisplay";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import UrlInput from "./components/UrlInput";
import CompanyLogo from './components/CompanyLogo';
import EmailInput from "./components/EmailInput";

function App() {
  // State variables
  const [email, setEmail] = useState("");
  const [founderCount, setFounderCount] = useState(1);
  const maxFounders = 3;
  const [memorandumContent, setMemorandumContent] = useState("");
  const [documents, setDocuments] = useState(null);
  const [ocrDocuments, setOcrDocuments] = useState(null);
  const [currentRound, setCurrentRound] = useState("");
  const [proposedValuation, setProposedValuation] = useState("");
  const [valuationDate, setValuationDate] = useState("");
  const [linkedInUrls, setLinkedInUrls] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [moderationDetails, setModerationDetails] = useState(null);
  const [showDownload, setShowDownload] = useState(false);
  const [traceId, setTraceId] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [url, setUrl] = useState("");

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check email
    if (!email) {
      setError("Please fill in the Email Address.");
      return;
    }

    // Check date
    if (!valuationDate) {
      setError("Please fill in the Analysis Date.");
      return;
    }

    // Check documents
    const hasDocuments = documents && documents.length > 0;
    const hasOcrDocuments = ocrDocuments && ocrDocuments.length > 0;

    if (!hasDocuments && !hasOcrDocuments) {
      setError("Please upload at least one document (either regular or OCR document).");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);

    if (documents) {
      for (let i = 0; i < documents.length; i++) {
        formData.append("documents", documents[i]);
      }
    }

    if (ocrDocuments) {
      for (let i = 0; i < ocrDocuments.length; i++) {
        formData.append("ocrDocuments", ocrDocuments[i]);
      }
    }

    formData.append("currentRound", currentRound.replace(/,/g, ""));
    formData.append("proposedValuation", proposedValuation.replace(/,/g, ""));
    formData.append("valuationDate", valuationDate);
    linkedInUrls.forEach((url) => {
      formData.append("linkedInUrls[]", url);
    });
    formData.append("url", url);

    setLoading(true);
    setResult("");
    setShowDownload(false);
    setError("");
    setModerationDetails(null);
    setTraceId("");
    setShowFeedback(false);
    setFeedbackSubmitted(false);

    try {
      const response = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setMemorandumContent(response.data.memorandum);
      setResult(response.data.memorandum);
      setShowDownload(true);
      setTraceId(response.data.traceId);
      setShowFeedback(true);
    } catch (error) {
      console.error("Error:", error);

      if (error.response?.data?.error === "Content moderation check failed") {
        setError(error.response.data.error);
        setModerationDetails({
          categories: error.response.data.categories,
          details: error.response.data.details
        });
      } else {
        setError(error.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle feedback submission
  const sendFeedback = async (value) => {
    try {
      await axios.post("/feedback", {
        traceId: traceId,
        value: value,
      });
      setShowFeedback(false);
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error("Feedback error:", error);
      alert("An error occurred while submitting feedback.");
    }
  };

  // Handle memorandum download
  const handleDownload = async () => {
    try {
      const response = await fetch("/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: memorandumContent }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = "investment_memorandum.docx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      alert(
        "An error occurred while downloading the memorandum: " + error.message,
      );
    }
  };

  // Clean up HTML content
  const cleanHtml = (html) => {
    let cleanedHtml = html
      .replace(/^\s*```html\s*/, "")
      .replace(/\s*```\s*$/, "");
    cleanedHtml = cleanedHtml
      .replace(/(\r\n|\n|\r)/gm, "")
      .replace(/\s+/g, " ");
    cleanedHtml = cleanedHtml.replace(/<\/li>\s*<li>/g, "</li><li>");
    cleanedHtml = cleanedHtml.replace(/<\/h2>\s*<p>/g, "</h2><p>");
    return cleanedHtml;
  };

  // Handle document changes
  const handleDocumentsChange = (files) => {
    console.log("Setting documents:", files);
    setDocuments(files);
  };

  // Handle OCR document changes
  const handleOcrDocumentsChange = (files) => {
    console.log("Setting OCR documents:", files);
    setOcrDocuments(files);
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Flybridge Investment Memorandum Generator</h1>
      <div className="content-wrapper">
        <CompanyLogo />
        <div className="description">
          <br /><br />
          <p className="intro-text">
            <strong>
              Flybridge is an early stage venture capital fund investing in our AI powered future. 
              If you want to learn more you can visit our{' '}
              <a 
                href="https://www.flybridge.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flybridge-link"
              >
                website
              </a>
              .
            </strong>
          </p>
          <p>
            <strong>Tool Overview</strong>
          </p>
          <p>
            The Flybridge memo generator is an AI powered platform designed to quickly transform
            decks, business plans, and call notes into a first-draft VC
            investment memo. For Founders, we hope this will provide insights
            into how a VC firm might look at your business and streamline the
            process of presenting your company to investors by generating a
            draft memorandum based on the provided context. We recommend giving
            the tool as much context as possible to get the most accurate and
            helpful output (Limit to o1 context window token limits). One of the best practices is to record your pitch
            and upload the text transcript along with any supporting materials.
          </p>
          <p>
            <strong>Limitations</strong>
          </p>
          <p>
            The memo generator produces a strong initial draft addressing key investor considerations. However, it serves as a starting point rather than a fully polished memorandum, as human input is essential to refine nuance and exercise judgment. Additionally, the tool's reasoning is influenced by the limitations of OpenAI's o1 model and may reflect biases present in the input data. It is intended for informational purposes only. By submitting your data, you acknowledge that it may be reviewed by a Flybridge team member but will not be shared externally.
          </p>
          <p>
            <strong>Disclaimer</strong>
          </p>
          <p>
            By submitting your data, you acknowledge that it may be reviewed by a Flybridge team member but will not be shared externally.
          </p>
           <br /><br />
            <p>
              You can find the Github repo and see source code in this{' '}
              <a 
                href="https://github.com/dforwardfeed/memo_generator" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flybridge-link"
              >
                link
              </a>
            </p>
        </div>
        <form onSubmit={handleSubmit} className="form-container">
          <EmailInput email={email} setEmail={setEmail} />
          <FileUpload
            documents={documents}
            setDocuments={handleDocumentsChange}
            ocrDocuments={ocrDocuments}
            setOcrDocuments={handleOcrDocumentsChange}
          />
          <DealTerms
            currentRound={currentRound}
            setCurrentRound={setCurrentRound}
            proposedValuation={proposedValuation}
            setProposedValuation={setProposedValuation}
            valuationDate={valuationDate}
            setValuationDate={setValuationDate}
          />
          <FounderInfo
            founderCount={founderCount}
            setFounderCount={setFounderCount}
            maxFounders={maxFounders}
            linkedInUrls={linkedInUrls}
            setLinkedInUrls={setLinkedInUrls}
          />
          <UrlInput url={url} setUrl={setUrl} />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Generating..." : "Generate Memorandum"}
          </button>
        </form>

        {loading && <LoadingIndicator />}

        {error && <ErrorMessage error={error} moderationDetails={moderationDetails} />}

        {result && (
          <div>
            <MemorandumDisplay
              result={result}
              cleanHtml={cleanHtml}
              showDownload={showDownload}
              handleDownload={handleDownload}
            />

            {/* Feedback Section */}
            {showFeedback && !feedbackSubmitted && (
              <div className="feedback-section">
                <h3>Please provide your feedback:</h3>
                <button
                  className="btn btn-success"
                  style={{ marginRight: "10px" }}
                  onClick={() => sendFeedback(1)}
                >
                  👍
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => sendFeedback(-1)}
                >
                  👎
                </button>
              </div>
            )}

            {feedbackSubmitted && (
              <div className="feedback-section">
                <h3>Thank you for your feedback!</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;