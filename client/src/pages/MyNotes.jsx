
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    </div>
  );
}

export default MyNotes;
