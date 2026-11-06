import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Files,
  Clock3,
  CheckCircle2,
  XCircle,
  Users,
  LogOut,
  Trash2,
  Eye,
  Download,
  Search,
  UserX,
  X,
  Plus
} from "lucide-react";

const API = "http://localhost:5000/api/admin";

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("notes"); // 'notes' or 'users'
  const [stats, setStats] = useState(null);
  const [notes, setNotes] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Filters
  const [noteStatusFilter, setNoteStatusFilter] = useState("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState(null); // { id, name }
  const [noteSearch, setNoteSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`
  });

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/stats`, { headers: headers() });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Stats load failed", err);
    }
  };

  const loadNotes = async () => {
    setLoading(true);
    setError("");

    try {
      let queryParams = new URLSearchParams();
      queryParams.append("status", noteStatusFilter);
      if (selectedUserFilter) {
        queryParams.append("userId", selectedUserFilter.id);
      }

      const res = await fetch(`${API}/notes?${queryParams.toString()}`, {
        headers: headers()
      });

      if (!res.ok) {
        throw new Error("Failed to load notes");
      }

      setNotes(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/users`, { headers: headers() });
      if (!res.ok) {
        throw new Error("Failed to load users");
      }
      setUsersList(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === "notes") {
      loadNotes();
    } else if (activeTab === "users") {
      loadUsers();
    }
  }, [activeTab, noteStatusFilter, selectedUserFilter]);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/notes/${id}/status`, {
        method: "PATCH",
        headers: {
          ...headers(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);
      await Promise.all([loadNotes(), loadStats()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteNote = async (id, title) => {
    if (!window.confirm(`Permanently delete note "${title}"?`)) {
      return;
    }

    setBusyId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/notes/${id}`, {
        method: "DELETE",
        headers: headers()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);
      await Promise.all([loadNotes(), loadStats()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteUserAccount = async (targetUser) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user account "${targetUser.name}" (${targetUser.email})?\n\nWARNING: This will permanently delete their account AND all study notes uploaded by them!`
      )
    ) {
      return;
    }

    setBusyId(targetUser._id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/users/${targetUser._id}`, {
        method: "DELETE",
        headers: headers()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setMessage(result.message);

      // If we were filtering by this user, clear filter
      if (selectedUserFilter?.id === targetUser._id) {
        setSelectedUserFilter(null);
      }

      await Promise.all([
        loadUsers(),
        loadStats(),
        activeTab === "notes" ? loadNotes() : Promise.resolve()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (note) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/notes/${note._id}/download`,
        { headers: headers() }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

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
    const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
      `http://localhost:5000/api/notes/${note._id}/download`
    )}`;
    window.open(viewerUrl, "_blank");
  };

  const viewUserNotes = (u) => {
    setSelectedUserFilter({ id: u._id, name: u.name });
    setActiveTab("notes");
  };

  const filteredNotes = notes.filter((n) => {
    if (!noteSearch) return true;
    const q = noteSearch.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      (n.uploadedBy?.name && n.uploadedBy.name.toLowerCase().includes(q)) ||
      (n.uploadedBy?.email && n.uploadedBy.email.toLowerCase().includes(q))
    );
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const statCards = stats
    ? [
        {
          label: "Total Notes",
          value: stats.totalNotes,
          icon: Files,
          color: "#2563eb",
          onClick: () => {
            setActiveTab("notes");
            setNoteStatusFilter("all");
          }
        },
        {
          label: "Pending",
          value: stats.pending,
          icon: Clock3,
          color: "#ca8a04",
          onClick: () => {
            setActiveTab("notes");
            setNoteStatusFilter("pending");
          }
        },
        {
          label: "Approved",
          value: stats.approved,
          icon: CheckCircle2,
          color: "#16a34a",
          onClick: () => {
            setActiveTab("notes");
            setNoteStatusFilter("approved");
          }
        },
        {
          label: "Rejected",
          value: stats.rejected,
          icon: XCircle,
          color: "#dc2626",
          onClick: () => {
            setActiveTab("notes");
            setNoteStatusFilter("rejected");
          }
        },
        {
          label: "Total Users",
          value: stats.totalUsers,
          icon: Users,
          color: "#7c3aed",
          onClick: () => {
            setActiveTab("users");
          }
        }
      ]
    : [];

  return (
    <div className="admin-page">
      <nav className="admin-navbar">
        <Link to="/" className="admin-logo">
          StudyShare <span>Admin</span>
        </Link>

        <div className="admin-nav-actions">
          <span>{user.name}</span>
          <button onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="admin-container">
        <div className="admin-heading">
          <h1>Admin Dashboard</h1>
          <p>Manage users, review notes, and control study submissions.</p>
        </div>

        {error && <div className="error">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <div className="admin-action-banner">
          <div>
            <h3>Share Official Notes</h3>
            <p>Upload important materials directly as a featured Admin Note.</p>
          </div>
          <Link to="/upload" className="admin-upload-btn">
            <Plus size={20} /> Publish New Note
          </Link>
        </div>

        {stats && (
          <div className="admin-stats">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className="admin-stat-card clickable"
                  key={item.label}
                  onClick={item.onClick}
                  title={`Click to view ${item.label}`}
                >
                  <Icon size={24} color={item.color} />
                  <h2>{item.value}</h2>
                  <p>{item.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Selection */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            <Files size={18} /> Manage Notes ({stats?.totalNotes || 0})
          </button>
          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={18} /> Manage Users ({stats?.totalUsers || 0})
          </button>
        </div>

        {/* TAB 1: NOTES MANAGEMENT */}
        {activeTab === "notes" && (
          <section className="admin-notes-section">
            <div className="admin-section-header">
              <div>
                <h2>Notes Management</h2>
                <p>View, preview, approve, reject, or delete any student note.</p>
              </div>

              <div className="admin-controls">
                <div className="admin-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search note, subject or user..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                  />
                  {noteSearch && (
                    <button
                      className="clear-search"
                      onClick={() => setNoteSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <select
                  value={noteStatusFilter}
                  onChange={(e) => setNoteStatusFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {selectedUserFilter && (
              <div className="user-filter-badge">
                <span>
                  Filtering notes for user: <strong>{selectedUserFilter.name}</strong>
                </span>
                <button
                  onClick={() => setSelectedUserFilter(null)}
                  title="Clear user filter"
                >
                  <X size={14} /> Clear Filter
                </button>
              </div>
            )}

            {loading ? (
              <p className="admin-empty">Loading notes...</p>
            ) : filteredNotes.length === 0 ? (
              <p className="admin-empty">No notes found matching your criteria.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Note Details</th>
                      <th>Uploaded By</th>
                      <th>Subject & Sem</th>
                      <th>Status</th>
                      <th>Preview / Download</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredNotes.map((note) => {
                      const isAdminNote = note.uploadedBy?.role === "admin";

                      return (
                        <tr key={note._id} className={isAdminNote ? "row-admin-note" : ""}>
                          <td>
                            <strong>{note.title}</strong>
                            <small>{note.fileName}</small>
                            {isAdminNote && <span className="table-admin-badge">Admin Official</span>}
                          </td>

                          <td>
                            {note.uploadedBy ? (
                              <>
                                <button
                                  className="user-link-btn"
                                  onClick={() => viewUserNotes(note.uploadedBy)}
                                  title="View all notes by this user"
                                >
                                  {note.uploadedBy.name}
                                </button>
                                <small>{note.uploadedBy.email}</small>
                              </>
                            ) : (
                              <span>Unknown User</span>
                            )}
                          </td>

                          <td>
                            {note.subject}
                            <small>Semester {note.semester}</small>
                          </td>

                          <td>
                            <span className={`status status-${note.status}`}>
                              {note.status}
                            </span>
                          </td>

                          <td>
                            <div className="admin-row-actions">
                              <button
                                className="admin-icon-btn preview"
                                onClick={() => handlePreview(note)}
                                title="Preview file"
                              >
                                <Eye size={15} />
                                Preview
                              </button>
                              <button
                                className="admin-icon-btn download"
                                onClick={() => handleDownload(note)}
                                title="Download file"
                              >
                                <Download size={15} />
                                Download
                              </button>
                            </div>
                          </td>

                          <td>
                            <div className="admin-row-actions">
                              {note.status === "pending" && (
                                <>
                                  <button
                                    className="approve-btn"
                                    disabled={busyId === note._id}
                                    onClick={() =>
                                      updateStatus(note._id, "approved")
                                    }
                                  >
                                    Approve
                                  </button>

                                  <button
                                    className="reject-btn"
                                    disabled={busyId === note._id}
                                    onClick={() =>
                                      updateStatus(note._id, "rejected")
                                    }
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              <button
                                  className="admin-delete-btn"
                                  disabled={busyId === note._id}
                                  onClick={() => deleteNote(note._id, note.title)}
                                  title="Delete note permanently"
                                  aria-label={`Delete ${note.title}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: USERS MANAGEMENT */}
        {activeTab === "users" && (
          <section className="admin-notes-section">
            <div className="admin-section-header">
              <div>
                <h2>User Accounts Management</h2>
                <p>View registered users, inspect their notes, or delete accounts.</p>
              </div>

              <div className="admin-controls">
                <div className="admin-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  {userSearch && (
                    <button
                      className="clear-search"
                      onClick={() => setUserSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <p className="admin-empty">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="admin-empty">No users found matching your search.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Info</th>
                      <th>Role</th>
                      <th>Notes Uploaded</th>
                      <th>Joined Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>

                        <td>
                          <span className={`role-badge role-${u.role}`}>
                            {u.role}
                          </span>
                        </td>

                        <td>
                          <strong>{u.noteCount} notes</strong>
                        </td>

                        <td>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td>
                          <div className="admin-row-actions">
                            <button
                              className="admin-icon-btn view-notes"
                              onClick={() => viewUserNotes(u)}
                              title="View notes uploaded by this user"
                            >
                              <Files size={15} />
                              View Notes ({u.noteCount})
                            </button>

                            {u._id !== user._id ? (
                              <button
                                className="admin-delete-btn user-delete"
                                disabled={busyId === u._id}
                                onClick={() => deleteUserAccount(u)}
                                title="Delete user account and all their notes"
                              >
                                <UserX size={15} />
                                Delete User
                              </button>
                            ) : (
                              <span className="current-user-tag">Current Admin</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
