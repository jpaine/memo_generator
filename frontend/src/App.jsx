import React, { useState } from "react";
import axios from "axios";

import FileUpload from "./components/FileUpload";
import DealTerms from "./components/DealTerms";
import FounderInfo from "./components/FounderInfo";
import MemorandumDisplay from "./components/MemorandumDisplay";
import LoadingIndicator from "./components/LoadingIndicator";
import ErrorMessage from "./components/ErrorMessage";
import MultiUrlInput from "./components/MultiUrlInput";
import CompanyLogo from './components/CompanyLogo';
// import EmailInput from "./components/EmailInput";

function App() {
  // State variables
  // const [email, setEmail] = useState("");
  const [founderCount, setFounderCount] = useState(1);
  const maxFounders = 3;
  const [memorandumContent, setMemorandumContent] = useState("");
  const [documents, setDocuments] = useState({ regular: [], ocr: [] });
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
  const [urls, setUrls] = useState([]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check email
    // if (!email) {
    //   setError("Please fill in the Email Address.");
    //   return;
    // }

    // Check date
    if (!valuationDate) {
      setError("Please fill in the Analysis Date.");
      return;
    }

    // Check documents
    const hasDocuments = documents.regular && documents.regular.length > 0;
    const hasOcrDocuments = documents.ocr && documents.ocr.length > 0;

    if (!hasDocuments && !hasOcrDocuments) {
      setError("Please upload at least one document.");
      return;
    }

    const formData = new FormData();
    // formData.append("email", email);

    if (documents.regular) {
      for (let i = 0; i < documents.regular.length; i++) {
        formData.append("documents", documents.regular[i]);
      }
    }

    if (documents.ocr) {
      for (let i = 0; i < documents.ocr.length; i++) {
        formData.append("ocrDocuments", documents.ocr[i]);
      }
    }

    formData.append("currentRound", currentRound.replace(/,/g, ""));
    formData.append("proposedValuation", proposedValuation.replace(/,/g, ""));
    formData.append("valuationDate", valuationDate);
    linkedInUrls.forEach((url) => {
      formData.append("linkedInUrls[]", url);
    });
    
    // Send multiple URLs
    urls.forEach((urlObj) => {
      formData.append("urls[]", JSON.stringify(urlObj));
    });

    setLoading(true);
    setResult("");
    setShowDownload(false);
    setError("");
    setModerationDetails(null);
    setTraceId("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setMemorandumContent(response.data.memorandum);
      setResult(response.data.memorandum);
      setShowDownload(true);
      setTraceId(response.data.traceId);
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

  // Handle memorandum download (Word)
  const handleDownloadWord = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/download/word`, {
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
      console.error("Word download error:", error);
      alert(
        "An error occurred while downloading the Word document: " + error.message,
      );
    }
  };

  // Handle memorandum download (PDF)
  const handleDownloadPDF = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/download/pdf`, {
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
      a.download = "investment_memorandum.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("PDF download error:", error);
      alert(
        "An error occurred while downloading the PDF document: " + error.message,
      );
    }
  };

  // Legacy download function (for backward compatibility)
  const handleDownload = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/download`, {
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
      <h1 className="app-title">Golden Gate Investment Memorandum Generator</h1>
      <div className="content-wrapper">
        <CompanyLogo />
        <div className="description">
          <br /><br />
          <p className="intro-text">
            <strong>
              Golden Gate is a global venture capital team powering tech & innovation from Singapore
              If you want to learn more you can visit our{' '}
              <a 
                href="https://www.goldengate.vc/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="Golden-Gate-link"
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
            The Golden Gate memo generator is an AI powered platform designed to quickly transform
            decks, business plans, and call notes into a first-draft VC
            investment memo. For Founders, we hope this will provide insights
            into how a VC firm might look at your business and streamline the
            process of presenting your company to investors by generating a
            draft memorandum based on the provided context. We recommend giving
            the tool as much context as possible to get the most accurate and
            helpful output (Limit to chatgpt context window token limits). One of the best practices is to record your pitch
            and upload the text transcript along with any supporting materials.
          </p>
          <p>
            <strong>Limitations</strong>
          </p>
          <p>
            The memo generator produces a strong initial draft addressing key investor considerations. However, it serves as a starting point rather than a fully polished memorandum, as human input is essential to refine nuance and exercise judgment. Additionally, the tool's reasoning is influenced by the limitations of OpenAI's o1 model and may reflect biases present in the input data. It is intended for informational purposes only. By submitting your data, you acknowledge that it may be reviewed by a Golden Gate team member but will not be shared externally.
          </p>
          <p>
            <strong>Disclaimer</strong>
          </p>
          <p>
            By submitting your data, you acknowledge that it may be reviewed by a Golden Gate team member but will not be shared externally.
          </p>
           <br /><br />
        </div>
        <form onSubmit={handleSubmit} className="form-container">
          {/* <EmailInput email={email} setEmail={setEmail} /> */}
          <FileUpload
            documents={documents}
            setDocuments={handleDocumentsChange}
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
          <MultiUrlInput urls={urls} setUrls={setUrls} />
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
              handleDownloadWord={handleDownloadWord}
              handleDownloadPDF={handleDownloadPDF}
            />

          </div>
        )}
      </div>
    </div>
  );
}

export default App;