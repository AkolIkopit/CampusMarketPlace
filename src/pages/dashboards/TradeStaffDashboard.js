import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "./AdminDashboard.css";
import EditProfile from "./EditProfile";
import { supabase } from "../../supabase";
export default function TradeStaffDashboard({ profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState("dashboard");
  const [currentProfile, setCurrentProfile] = useState(profile);

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const navigate = useNavigate();
  const handleLogout = async () => {

  await supabase.auth.signOut();

  navigate("/");

};
  if (view === "edit") {
    return (
      <EditProfile
        profile={currentProfile}
        onCancel={() => setView("dashboard")}
        onSaveSuccess={(updatedData) => {
          setCurrentProfile((prev) => ({ ...prev, ...updatedData }));
          setView("dashboard");
        }}
      />
    );
  }

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

           
            <button
              className="dropdown-item logout"
              onClick={handleLogout}
            >
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
      Manage marketplace sales or trades and exchanges.
    </h1>

    <p className="hero-description">
      Claim trades,sales, manage collections, and oversee secure marketplace transactions.
    </p>

  </section>

  {/* ACTIONS */}
  <section className="quick-actions-grid">

    {/* MARKET */}
    <button
      className="action-block"
      onClick={() => navigate("/dashboard/staff/market")}
    >

      <span className="block-icon">
        🏪
      </span>

      <h3>
        Market
      </h3>

      <p>
        View all active marketplace trades or sales and claim responsibility.
      </p>

    </button>

    {/* MY TRADES */}
    <button
      className="action-block"
      onClick={() => navigate("/dashboard/staff/my-trades")}
    >

      <span className="block-icon">
        📦
      </span>

      <h3>
        My Assigned Trades & Sales
      </h3>

      <p>
        Manage the trades and sales currently assigned to you.
      </p>

    </button>

    {/* COMPLETED */}
    <button
      className="action-block"
      onClick={() => navigate("/dashboard/staff/completed")}
    >

      <span className="block-icon">
        ✅
      </span>

      <h3>
        Completed Trades & Sales
      </h3>

      <p>
        Review recently completed marketplace exchanges.
      </p>

    </button>

    {/* PROFILE */}
    <button className="action-block" onClick={() => setView("edit")}>

      <span className="block-icon">
        👤
      </span>

      <h3>
        My Profile
      </h3>

      <p>
        View your staff activity and account information.
      </p>

    </button>

  </section>

</main>
  );
}