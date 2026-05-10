import { useState } from "react";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="dashboard-container">

      {/* HEADER */}
      <header className="main-header">
        <nav className="header-nav">

          {/* LOGO */}
          <section className="logo-section">
            <img src="/logo.png" alt="logo" className="header-logo" />
            <span className="logo-text">UniMart</span>
          </section>

          {/* BURGER MENU */}
          <div className="burger-wrapper">
            <button
              className="burger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item">Edit Profile</button>
                <button className="dropdown-item logout">Logout</button>
              </div>
            )}
          </div>

        </nav>
      </header>

      {/* HERO */}
      <section className="hero-section">
        <span className="hero-kicker">ADMIN PANEL</span>
        <h1 className="hero-title">
          Manage your campus marketplace efficiently.
        </h1>
        <p className="hero-description">
          Oversee users, listings, and platform activity.
        </p>
      </section>

      {/* ACTIONS */}
      <section className="quick-actions-grid">

        <button className="action-block">
          <span className="block-icon">📄</span>
          <h3>Role Requests</h3>
          <p>Review and approve user role upgrades.</p>
        </button>

        <button className="action-block">
          <span className="block-icon">👤</span>
          <h3>User Management</h3>
          <p>View and manage platform users.</p>
        </button>

        <button className="action-block">
          <span className="block-icon">💬</span>
          <h3>Communicate</h3>
          <p>Message users and staff.</p>
        </button>

        <button className="action-block">
          <span className="block-icon">📊</span>
          <h3>Analytics</h3>
          <p>Monitor platform activity.</p>
        </button>

      </section>

    </main>
  );
}