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
    </div>
  );
}

export default BrowseNotes;
