import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  BookOpen,
  Award
} from "lucide-react";
import SummaryModal from "../components/SummaryModal";
import { API } from "../utils/api";

function BrowseNotes({ user }) {
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Summary states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(null);
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [loadingSummaryId, setLoadingSummaryId] = useState(null);
  const [summaryErrorId, setSummaryErrorId] = useState(null);

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`
  });

  const fetchNotes = async () => {
    setLoading(true);
    setError("");

    try {
      let url = "http://localhost:5000/api/notes/";

      const response = await fetch(url, {
        headers: headers()
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const data = await response.json();
      setNotes(data);
    } catch (err) {
      setError(err.message);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchNotes, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };


  const handleDownload = async (note) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notes/${note._id}/download`,
        {
          headers: headers()
        }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Create a temporary link to trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = note.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Download failed. Please try again.");
    }
  };

  const handlePreview = (note) => {
    const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(`http://localhost:5000/api/notes/${note._id}/download`)}`;
    window.open(viewerUrl, "_blank");
  };

  const fetchDataAndSummary = async (note) => {
    // Only show button for approved PDF notes
    if (note.status !== "approved") {
      setError("Only approved PDF notes can be summarized.");
      return;
    }

    if (!note.fileType.toLowerCase().includes(".pdf")) {
      setError("Only PDF files can be summarized.");
      return;
    }

    // Check if summary already exists
    if (note.aiSummary?.content?.overview) {
      setCurrentSummary(note.aiSummary);
      setShowSummaryModal(true);
      return;
    }

    const noteId = note._id;
    setLoadingSummaryId(noteId);
    setSummaryErrorId(null);

    try {
      // Try to fetch existing summary
      const getResponse = await API.notes.getSummary(noteId);
      if (getResponse.ok && getResponse.status !== 404) {
        const { summary } = await getResponse.json();
        setCurrentSummary(summary);
        setShowSummaryModal(true);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }

    // Generate new summary if not exists
    try {
      const postResponse = await API.notes.generateSummary(noteId);

      if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate summary");
      }

      const { summary } = await postResponse.json();
      setCurrentSummary(summary);
      setShowSummaryModal(true);
      setNotes((prev) =>
        prev.map((n) => (n._id === noteId ? { ...n, aiSummary: summary } : n))
      );
    } catch (err) {
      setSummaryErrorId(noteId);
      setError(err.message || "Failed to generate summary. Please try again.");
    } finally {
      setLoadingSummaryId(null);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const lowerSearch = search.toLowerCase();
    return (
      note.title.toLowerCase().includes(lowerSearch) ||
      note.subject.toLowerCase().includes(lowerSearch)
    );
  });

  return (
    <div className="browse-page">
      <div className="browse-navbar">
        <Link to="/" className="browse-logo">
          <BookOpen size={24} />
          <span>StudyShare</span>
        </Link>

        <div className="browse-search-bar">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search notes by title or subject..."
            value={search}
            onChange={handleSearchChange}
            className="browse-search-input"
          />
        </div>

        <div className="browse-filters">
          <Link to="/dashboard" className="browse-dashboard-link">
            Dashboard
          </Link>
        </div>
      </div>

      <main className="browse-container">
        <div className="browse-header">
          <h1>Browse Notes</h1>
          <p>
            {filteredNotes.length} material{filteredNotes.length !== 1 ? "s" : ""}{" "}
            available
          </p>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading-browse">
            <FileText size={48} className="loading-icon" />
            Loading notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No notes found matching your search.</p>
            <p>Be the first to share study materials!</p>
          </div>
        ) : (
          <div className="notes-grid">
            {filteredNotes.map((note) => {
              const isAdminNote = note.uploadedBy?.role === "admin";

              return (
                <div
                  className={`note-card ${isAdminNote ? "admin-note" : ""}`}
                  key={note._id}
                >
                  <div className="note-card-header">
                    <div className="note-icon">
                      <FileText size={28} />
                    </div>

                    {isAdminNote ? (
                      <span className="admin-note-badge">
                        <Award size={13} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                        Admin Note
                      </span>
                    ) : (
                      <span className="note-status approved">Approved</span>
                    )}
                  </div>

                  <div className="note-card-body">
                    <h3 className="note-title">{note.title}</h3>

                    <div className="note-meta">
                      <span className="note-subject">{note.subject}</span>
                      <span className="note-separator">•</span>
                      <span className="note-semester">
                        Semester {note.semester}
                      </span>
                    </div>

                    {note.description && (
                      <p className="note-description">{note.description}</p>
                    )}

                    <div className="note-info-row">
                      <div className="note-info">
                        <User size={14} />
                        <span>{note.uploadedBy?.name || "Unknown"}</span>
                      </div>

                      <div className="note-info">
                        <Calendar size={14} />
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="note-info">
                        <Download size={14} />
                        <span>{note.downloads || 0} downloads</span>
                      </div>
                    </div>
                  </div>

                  <div className="note-card-footer">
                    <button
                      className="note-preview-btn"
                      onClick={() => handlePreview(note)}
                      title="Preview PDF"
                    >
                      <Eye size={16} />
                      Preview
                    </button>

                    {(loadingSummaryId === note._id || summaryErrorId === note._id || note.aiSummary?.content?.overview) && note.fileType.toLowerCase().includes(".pdf") && note.status === "approved" && (
                      <button
                        className="summary-btn"
                        onClick={() => fetchDataAndSummary(note)}
                        disabled={loadingSummaryId === note._id}
                      >
                        {loadingSummaryId === note._id ? "Loading..." : (summaryErrorId === note._id ? "Error - View" : "View Summary")}
                      </button>
                    )}

                    <button
                      className="note-download-btn"
                      onClick={() => handleDownload(note)}
                      title="Download file"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showSummaryModal && (
        <SummaryModal
          note={{ title: currentSummary?.content }}
          summary={currentSummary}
          onClose={() => {
            setShowSummaryModal(false);
            setCurrentSummary(null);
            setError("");
          }}
        />
      )}
    </div>
  );
}

export default BrowseNotes;
