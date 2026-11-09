import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Upload, X, FileText, Copy, Check } from "lucide-react";

function AISummarizer() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setError("");
    setSummary(null);
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10 MB limit");
      return;
    }
    setFile(selectedFile);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setSummary(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const generateSummary = async () => {
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    setLoading(true);
    setError("");
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/ai/summarize-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate summary");
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    const text = JSON.stringify(summary.content, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="student-page">
      <div className="student-topbar">
        <Link to="/dashboard" className="brand-link">
          StudyShare
        </Link>
        <Link to="/dashboard">Dashboard</Link>
      </div>

      <main className="student-container">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <h1>AI PDF Summarizer</h1>
        <p>Upload your own PDF to generate a structured AI summary. Files are not saved.</p>

        {error && <div className="error">{error}</div>}

        <div className="student-card">
          <div
            className={`upload-area ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="upload-prompt">
                <Upload size={48} />
                <p>Drag & drop PDF here or</p>
                <button
                  type="button"
                  className="student-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />
                <p className="upload-hint">Maximum file size: 10 MB</p>
              </div>
            ) : (
              <div className="file-info">
                <FileText size={32} />
                <div className="file-details">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={removeFile}
                  aria-label="Remove file"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {file && (
            <button
              className="student-btn"
              onClick={generateSummary}
              disabled={loading}
              style={{ marginTop: "1rem" }}
            >
              {loading ? "Generating..." : "Generate Summary"}
            </button>
          )}
        </div>

        {summary && (
          <div className="student-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2>Summary</h2>
              <button
                className="summary-btn"
                onClick={copySummary}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="summary-section">
              <h3 className="section-title">Overview</h3>
              <p className="section-content">{summary.content.overview}</p>
            </div>

            <div className="summary-section">
              <h3 className="section-title">Main Summary</h3>
              <p className="section-content">{summary.content.mainSummary}</p>
            </div>

            {summary.content.importantConcepts?.length > 0 && (
              <div className="summary-section">
                <h3 className="section-title">Important Concepts</h3>
                <ul className="concept-list">
                  {summary.content.importantConcepts.map((concept, idx) => (
                    <li key={idx} className="concept-item">• {concept}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.content.keyDefinitions?.length > 0 && (
              <div className="summary-section">
                <h3 className="section-title">Key Definitions</h3>
                <div className="definition-list">
                  {summary.content.keyDefinitions.map((def, idx) => (
                    <div key={idx} className="definition-item">
                      <dt className="definition-term"><strong>{def.term}</strong></dt>
                      <dd className="definition-desc">{def.definition}</dd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.content.importantPoints?.length > 0 && (
              <div className="summary-section">
                <h3 className="section-title">Important Points</h3>
                <ul className="point-list">
                  {summary.content.importantPoints.map((point, idx) => (
                    <li key={idx} className="point-item">• {point}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.content.conclusion && (
              <div className="summary-section">
                <h3 className="section-title">Conclusion</h3>
                <p className="section-content conclusion-text">{summary.content.conclusion}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AISummarizer;
