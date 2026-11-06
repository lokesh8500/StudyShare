import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function UploadNotes({ isAdmin }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    subject: "",
    semester: "5",
    description: ""
  });

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!file) {
      setError("Please select a file");
      return;
    }

    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
    const extension = file.name.slice(
      file.name.lastIndexOf(".")
    ).toLowerCase();

    if (!allowed.includes(extension)) {
      setError("Unsupported file type");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be smaller than 10 MB");
      return;
    }

    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, value);
    });

    data.append("file", file);

    setLoading(true);

    try {
      // Use different API endpoint for admin
      const endpoint = isAdmin
        ? "http://localhost:5000/api/admin/notes/upload"
        : "http://localhost:5000/api/notes/upload";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: data
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed");
      }

      setMessage(result.message);

      // Redirect based on role
      setTimeout(() => {
        navigate(isAdmin ? "/admin" : "/my-notes");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-page">
      <div className="student-topbar">
        <Link to={isAdmin ? "/admin" : "/dashboard"} className="brand-link">
          StudyShare
        </Link>
        {!isAdmin && <Link to="/my-notes">My Notes</Link>}
      </div>

      <main className="student-container">
        <Link to={isAdmin ? "/admin" : "/dashboard"} className="back-link">
          ← Back to {isAdmin ? "Admin Dashboard" : "Dashboard"}
        </Link>

        <h1>{isAdmin ? "Publish New Note" : "Upload Notes"}</h1>
        <p>{isAdmin ? "Share official notes directly." : "Share useful study materials with other students."}</p>

        <div className="student-card upload-card">
          {error && <div className="error">{error}</div>}

          {message && (
            <div className="success-message">{message}</div>
          )}

          <form onSubmit={handleSubmit} className="note-form">
            <label>Note Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. DBMS Unit 1 Notes"
              maxLength={150}
              required
            />

            <label>Subject</label>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="e.g. DBMS"
              maxLength={100}
              required
            />

            <label>Semester</label>
            <select
              name="semester"
              value={form.semester}
              onChange={handleChange}
            >
              {[1,2,3,4,5,6,7,8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>

            <label>Description (Optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Briefly describe your notes..."
              maxLength={1000}
              rows={4}
            />

            <label>Select File</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files[0] || null)}
              required
            />

            <small>
              Supported: PDF, DOC, DOCX, PPT, PPTX.
              Maximum size: 10 MB.
            </small>

            {!isAdmin && (
              <div className="approval-notice">
                Your note will be reviewed by an admin before
                appearing in Browse Notes.
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Uploading..." : isAdmin ? "Publish Note" : "Upload Note"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default UploadNotes;
