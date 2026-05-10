import { useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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
          <section className="burger-wrapper">
            <button
              className="burger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>

            {menuOpen && (
              <section className="dropdown-menu">
                <button className="dropdown-item">Edit Profile</button>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  Logout
                </button>
              </section>
            )}
          </section>
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
        {/* ✅ ROLE REQUESTS */}
        <button
          className="action-block"
          onClick={() => navigate("/dashboard/admin/role-approval")}
        >
          <span className="block-icon">📄</span>
          <h3>Role Requests</h3>
          <p>Review and approve user role upgrades.</p>
        </button>

        {/* USER MANAGEMENT */}
        <button
          className="action-block"
          onClick={() => navigate("/dashboard/admin/users")}
        >
          <span className="block-icon">👤</span>
          <h3>User Management</h3>
          <p>View and manage platform users.</p>
        </button>

        {/* ✅ MANAGE LISTINGS (Changed from Communicate) */}
        <button
          className="action-block"
          onClick={() => navigate("/dashboard/admin/manage-listings")}
        >
          <span className="block-icon">📦</span>
          <h3>Manage Listings</h3>
          <p>Review, flag, or remove marketplace items.</p>
        </button>

        {/* ANALYTICS */}
        <button
          className="action-block"
          onClick={() => navigate("/dashboard/admin/analytics")}
        >
          <span className="block-icon">📊</span>
          <h3>Analytics</h3>
          <p>Monitor platform activity.</p>
        </button>
      </section>
    </main>
  );
}