import React, { useState } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { 
  X, LogOut, User, 
  FileText, Users, Box, BarChart3, Building2 
} from "lucide-react";
import MyProfile from "./MyProfile"; 

export default function AdminDashboard({ profile }) {
  const [view, setView] = useState('main'); // 'main' or 'profile'
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
          <section 
            className="logo-section" 
            onClick={() => setView('main')} 
            style={{cursor: 'pointer'}}
          >
            {/* UNIMART LOGO IN HEADER */}
            <img src="/UniMartlogo.png" alt="UniMart Logo" className="header-logo" />
            <span className="logo-text">UniMart</span>
          </section>

          <section className="header-right-actions">
            
            {/* BURGER MENU */}
            <div className="burger-wrapper">
              <button className="burger-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
              {menuOpen && (
                <section className="dropdown-menu">
                  <button 
                    className="dropdown-item" 
                    onClick={() => { setView('profile'); setMenuOpen(false); }}
                  >
                    <User size={14} /> Profile
                  </button>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={14} /> Logout
                  </button>
                </section>
              )}
            </div>
          </section>
        </nav>
      </header>

      {/* --- CONDITIONAL RENDERING --- */}
      {view === 'profile' ? (
        <MyProfile 
            profile={profile} 
            onBack={() => setView('main')} 
            navigate={navigate} 
            onOpenRolePopup={() => {}} 
        />
      ) : (
        <>
          {/* HERO SECTION */}
          <section className="hero-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <img src="/UniMartlogo.png" alt="" style={{ width: '40px', height: '40px' }} />
                <span className="hero-kicker">UniMart Administrative Panel</span>
            </div>
            <h1 className="hero-title">Manage your campus marketplace efficiently.</h1>
            <p className="hero-description">Oversee users, moderate listings, and configure trade facilities to ensure a safe student community.</p>
          </section>

          {/* ACTIONS GRID */}
          <section className="quick-actions-grid">
            {/* ROLE REQUESTS */}
            <button className="action-block" onClick={() => navigate("/dashboard/admin/role-approval")}>
              <FileText className="block-icon" color="#f0a500" />
              <h3>Role Requests</h3>
              <p>Review and approve user role upgrades.</p>
            </button>

            {/* USER MANAGEMENT */}
            <button className="action-block" onClick={() => navigate("/dashboard/admin/users")}>
              <Users className="block-icon" color="#f0a500" />
              <h3>User Management</h3>
              <p>View, suspend, or manage platform users.</p>
            </button>

            {/* MANAGE LISTINGS */}
            <button className="action-block" onClick={() => navigate("/dashboard/admin/manage-listings")}>
              <Box className="block-icon" color="#f0a500" />
              <h3>Manage Listings</h3>
              <p>Flag or remove unsafe marketplace items.</p>
            </button>

            {/* ANALYTICS */}
            <button className="action-block" onClick={() => navigate("/dashboard/admin/analytics")}>
              <BarChart3 className="block-icon" color="#f0a500" />
              <h3>Analytics</h3>
              <p>Monitor platform activity and reports.</p>
            </button>

            {/* FACILITY SETTINGS */}
            <button className="action-block full-width-card" onClick={() => navigate("/dashboard/admin/facility-settings")}>
              <Building2 className="block-icon" color="#f0a500" />
              <h3>Facility Settings</h3>
              <p>Configure campus operating hours and slot capacity.</p>
            </button>
          </section>
        </>
      )}
    </main>
  );
}