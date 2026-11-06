import UploadNotes from "./pages/UploadNotes";
import MyNotes from "./pages/MyNotes";
import BrowseNotes from "./pages/BrowseNotes";
import "./student.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import "./index.css";
import "./admin_overrides.css";
import Home from "./pages/Home";
import "./home.css";
import AdminDashboard from "./pages/AdminDashboard";
import "./admin.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    fetch("http://localhost:5000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (token, loggedInUser) => {
    localStorage.setItem("token", token);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return <div className="loading-page">Loading StudyShare...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/upload"
          element={
            user ? (
              <UploadNotes isAdmin={user.role === "admin"} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user?.role === "admin" ? (
              <AdminDashboard
                user={user}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate
                to={user ? "/dashboard" : "/login"}
                replace
              />
            )
          }
        />

        <Route
          path="/my-notes"
          element={
            user ? (
              <MyNotes />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/notes"
          element={user ? <BrowseNotes user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="/"
          element={<Home user={user} />}
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={user.role === "admin" ? "/admin" : "/dashboard"}
                replace
              />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate
                to={user.role === "admin" ? "/admin" : "/dashboard"}
                replace
              />
            ) : (
              <Register onLogin={handleLogin} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            user?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
