import { X, BookOpen } from "lucide-react";

function SummaryModal({ note, summary, onClose }) {
  const { content } = summary || {};

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!summary) {
    return (
      <div className="summary-modal-overlay" onClick={onClose}>
        <div
          className="summary-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="summary-modal-header">
            <h3>AI Summary</h3>
            <button
              className="summary-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
          <div className="summary-modal-body">
            <p>No summary available for this note.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div
        className="summary-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="summary-modal-header">
          <h3>AI Summary</h3>
          <button
            className="summary-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="summary-modal-body">
          <div className="summary-meta">
            <span className="summary-model">
              <BookOpen size={14} />
              {summary.model}
            </span>
            <span className="summary-date">Generated: {formatDate(summary.generatedAt)}</span>
          </div>

          {content.overview && (
            <div className="summary-section">
              <h3 className="section-title">Overview</h3>
              <p className="section-content">{content.overview}</p>
            </div>
          )}

          {content.mainSummary && (
            <div className="summary-section">
              <h3 className="section-title">Main Summary</h3>
              <p className="section-content">{content.mainSummary}</p>
            </div>
          )}

          {content.importantConcepts && content.importantConcepts.length > 0 && (
            <div className="summary-section">
              <h3 className="section-title">Important Concepts</h3>
              <ul className="concept-list">
                {content.importantConcepts.map((concept, index) => (
                  <li key={index} className="concept-item">
                    • {concept}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.keyDefinitions && content.keyDefinitions.length > 0 && (
            <div className="summary-section">
              <h3 className="section-title">Key Definitions</h3>
              <div className="definition-list">
                {content.keyDefinitions.map((def, index) => (
                  <div key={index} className="definition-item">
                    <dt className="definition-term">{def.term}</dt>
                    <dd className="definition-desc">{def.definition}</dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.importantPoints && content.importantPoints.length > 0 && (
            <div className="summary-section">
              <h3 className="section-title">Important Points</h3>
              <ul className="point-list">
                {content.importantPoints.map((point, index) => (
                  <li key={index} className="point-item">
                    • {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.conclusion && (
            <div className="summary-section">
              <h3 className="section-title">Conclusion</h3>
              <p className="section-content conclusion-text">
                {content.conclusion}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SummaryModal;