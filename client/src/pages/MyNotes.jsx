
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SummaryModal from "../components/SummaryModal";
import { API } from "../utils/api";

function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI Summary states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(null);
  const [expandedSummaryId, setExpandedSummaryId] = useState(null);
  const [loadingSummaryId, setLoadingSummaryId] = useState(null);
  const [summaryErrorId, setSummaryErrorId] = useState(null);

  const fetchNotes = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/notes/my-notes",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load notes");
      }

      const data = await response.json();
      setNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/notes/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      setNotes((prev) => prev.filter((note) => note._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchDataAndSummary = async (note) => {
    // Check if PDF has summary
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

  const updateNotesWithSummary = (noteId, summary) => {
    setNotes((prev) => prev.map((n) => (n._id === noteId ? { ...n, aiSummary: summary } : n)));
  };

  return (
    <div className="student-page">
      <div className="student-topbar">
        <Link to="/dashboard" className="brand-link">
          StudyShare
        </Link>
        <Link to="/upload">Upload Notes</Link>
      </div>

      <main className="student-container">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>

        <h1>My Notes</h1>
        <p>Manage your uploaded study materials.</p>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <p>Loading notes...</p>
        ) : notes.length === 0 ? (
          <div className="student-card">
            <h3>No notes uploaded yet</h3>
            <p>Upload your first study material.</p>
            <Link to="/upload" className="student-btn">
              Upload Notes
            </Link>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <div className="student-card note-card" key={note._id}>
                <div className="note-card-header">
                  <span className="file-label">
                    {note.fileType.toUpperCase().replace(".", "")}
                  </span>

                  <span className={`status status-${note.status}`}>
                    {note.status}
                  </span>
                </div>

                <h3>{note.title}</h3>
                <p>{note.subject} • Semester {note.semester}</p>
                <p className="note-description">
                  {note.description || "No description"}
                </p>

                <small>
                  Uploaded {new Date(note.createdAt).toLocaleDateString()}
                </small>

                {note.fileType.toLowerCase().includes(".pdf") && (
                  <button
                    className="summary-btn"
                    onClick={() => fetchDataAndSummary(note)}
                    disabled={loadingSummaryId === note._id}
                  >
                    {loadingSummaryId === note._id ? (
                      <>Loading...</>
                    ) : summaryErrorId === note._id ? (
                      <>Error</>
                    ) : note.aiSummary?.content?.overview ? (
                      <>View Summary</>
                    ) : (
                      <>Generate Summary</>
                    )}
                  </button>
                )}

                <button
                  className="delete-btn"
                  onClick={() => deleteNote(note._id)}
                >
                  Delete
                </button>
              </div>
            ))}
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
          }}
        />
      )}
    </div>
  );
}

export default MyNotes;
