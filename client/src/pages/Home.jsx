
import { Link } from "react-router-dom";
import {
  BookOpen,
  Upload,
  Search,
  Download,
  ShieldCheck,
  ArrowRight,
  FileText
} from "lucide-react";

function Home({ user }) {
  const dashboardPath =
  user?.role === "admin" ? "/admin" : "/dashboard";
  return (
    <div className="home-page">
      {/* Navigation */}
      <header className="home-header">
        <nav className="home-nav">
          <Link to="/" className="home-logo">
            <BookOpen size={26} />
            <span>StudyShare</span>
          </Link>

          <div className="home-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>

            {user ? (
              <Link to={dashboardPath} className="nav-btn">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="login-link">
                  Login
                </Link>
                <Link to="/register" className="nav-btn">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <BookOpen size={15} />
            Your Learning Community
          </div>

          <h1>
            Share Notes.
            <br />
            <span>Learn Together.</span>
          </h1>

          <p>
            A simple platform for students to share,
            discover, and download useful study materials.
            Make learning easier for everyone.
          </p>

          <div className="hero-actions">
            <Link
              to={user ? dashboardPath : "/register"}
              className="primary-btn"
            >
              Get Started <ArrowRight size={18} />
            </Link>

            <Link
              to={user ? "/notes" : "/login"}
              className="secondary-btn"
            >
              Explore Notes
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="illustration-card">
            <div className="illustration-top">
              <div className="illustration-icon">
                <BookOpen size={30} />
              </div>
              <span>Study Materials</span>
            </div>

            <div className="file-preview">
              <FileText size={25} />
              <div>
                <strong>DBMS Unit 1.pdf</strong>
                <small>Database Management</small>
              </div>
              <Download size={18} />
            </div>

            <div className="file-preview">
              <FileText size={25} />
              <div>
                <strong>Java OOP Notes.pdf</strong>
                <small>Programming</small>
              </div>
              <Download size={18} />
            </div>

            <div className="file-preview">
              <FileText size={25} />
              <div>
                <strong>React Basics.pdf</strong>
                <small>Web Development</small>
              </div>
              <Download size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-heading">
          <h2>Everything you need to study better</h2>
          <p>Simple tools to make sharing knowledge easier.</p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Upload size={26} />
            </div>
            <h3>Upload Notes</h3>
            <p>
              Share your PDF, DOC, and PPT study materials
              with other students.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Search size={26} />
            </div>
            <h3>Discover Notes</h3>
            <p>
              Search and find notes by subject, semester,
              or topic.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Download size={26} />
            </div>
            <h3>Download & Learn</h3>
            <p>
              Access approved study materials and download
              them whenever you need.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <h2>How StudyShare Works</h2>
          <p>Start sharing knowledge in three simple steps.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <span className="step-number">01</span>
            <h3>Create an Account</h3>
            <p>Register and join the StudyShare community.</p>
          </div>

          <div className="step-card">
            <span className="step-number">02</span>
            <h3>Share Your Notes</h3>
            <p>
              Upload notes for admin review and approval.
            </p>
          </div>

          <div className="step-card">
            <span className="step-number">03</span>
            <h3>Learn Together</h3>
            <p>
              Discover and download approved notes
              shared by students.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <ShieldCheck size={32} />
          <h2>Ready to start learning?</h2>
          <p>
            Join StudyShare and make your study materials
            useful to others.
          </p>

          <Link
            to={user ? "/dashboard" : "/register"}
            className="cta-btn"
          >
            {user ? "Go to Dashboard" : "Create Free Account"}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="home-logo">
            <BookOpen size={22} />
            <span>StudyShare</span>
          </div>
          <p>© {new Date().getFullYear()} StudyShare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
