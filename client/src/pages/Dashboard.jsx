
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Files,
  Clock3,
  CheckCircle2,
  XCircle,
  LogOut
} from "lucide-react";

function Dashboard({ user, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
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

        if (!response.ok) throw new Error("Could not load notes");

        setNotes(await response.json());
      } catch (err) {
        setError(err.message);
      }
    };

    fetchNotes();
  }, []);

  const pending = notes.filter((n) => n.status === "pending").length;
  const approved = notes.filter((n) => n.status === "approved").length;
  const rejected = notes.filter((n) => n.status === "rejected").length;

  return (
    <div className="student-page">
      <nav className="student-topbar">
        <Link to="/" className="brand-link">StudyShare</Link>

        <div className="student-nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/my-notes">My Notes</Link>
          <Link to="/upload">Upload</Link>
          <button onClick={onLogout} className="logout-btn">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="student-container">
        <h1>Welcome back, {user.name}!</h1>
        <p>Manage your notes and track their approval status.</p>

        {error && <div className="error">{error}</div>}

        <div className="stats-grid">
          <div className="student-card stat-card">
            <Files size={24} color="#2563eb" />
            <h2>{notes.length}</h2>
            <p>Total Uploads</p>
          </div>

          <div className="student-card stat-card">
            <Clock3 size={24} color="#ca8a04" />
            <h2>{pending}</h2>
            <p>Pending</p>
          </div>

          <div className="student-card stat-card">
            <CheckCircle2 size={24} color="#16a34a" />
            <h2>{approved}</h2>
            <p>Approved</p>
          </div>

          <div className="student-card stat-card">
            <XCircle size={24} color="#dc2626" />
            <h2>{rejected}</h2>
            <p>Rejected</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <div className="student-card">
            <Upload size={28} color="#2563eb" />
            <h3>Share Your Notes</h3>
            <p>Upload PDF, Word, or PowerPoint study materials.</p>
            <Link to="/upload" className="student-btn">
              Upload Notes
            </Link>
          </div>

          <div className="student-card">
            <Files size={28} color="#2563eb" />
            <h3>Explore Notes</h3>
            <p>Discover and preview approved study materials from the community.</p>
            <Link to="/notes" className="student-btn">
              Browse Notes
            </Link>
          </div>

          <div className="student-card">
            <Files size={28} color="#2563eb" />
            <h3>My Uploads</h3>
            <p>View your uploaded files and approval status.</p>
            <Link to="/my-notes" className="student-btn">
              View My Notes
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
