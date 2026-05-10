import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";

export default function TradeStaffDashboard() {

  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  return (
    <main className="dashboard-container">

      {/* HEADER */}
      <header className="main-header">

        <nav className="header-nav">

          {/* LOGO */}
          <section className="logo-section">

            <img
              src="/logo.png"
              alt="logo"
              className="header-logo"
            />

            <span className="logo-text">
              UniMart
            </span>

          </section>

          {/* MENU */}
          <section className="burger-wrapper">

            <button
              className="burger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>

            {menuOpen && (
              <section className="dropdown-menu">

                <button className="dropdown-item">
                  Edit Profile
                </button>

                <button className="dropdown-item logout">
                  Logout
                </button>

              </section>
            )}

          </section>

        </nav>

      </header>

      {/* HERO */}
      <section className="hero-section">

        <span className="hero-kicker">
          TRADE FACILITY STAFF
        </span>

        <h1 className="hero-title">
          Manage marketplace exchanges efficiently.
        </h1>

        <p className="hero-description">
          Confirm item drop-offs, collections, and transaction activity.
        </p>

      </section>

      {/* ACTIONS */}
      <section className="quick-actions-grid">

        {/* BOOKINGS */}
        <button
          className="action-block"
          onClick={() => navigate("/dashboard/staff/bookings")}
        >

          <span className="block-icon">
            📦
          </span>

          <h3>
            Manage Bookings
          </h3>

          <p>
            View and manage drop-off and collection bookings.
          </p>

        </button>

        {/* DROP OFFS */}
        <button className="action-block">

          <span className="block-icon">
            ✅
          </span>

          <h3>
            Confirm Drop-Offs
          </h3>

          <p>
            Confirm receipt of seller items.
          </p>

        </button>

        {/* COLLECTIONS */}
        <button className="action-block">

          <span className="block-icon">
            🎓
          </span>

          <h3>
            Confirm Collections
          </h3>

          <p>
            Release items to buyers and complete transactions.
          </p>

        </button>

        {/* SCHEDULE */}
        <button className="action-block">

          <span className="block-icon">
            📅
          </span>

          <h3>
            Schedule Overview
          </h3>

          <p>
            View upcoming appointments and exchange schedules.
          </p>

        </button>

      </section>

    </main>
  );
}