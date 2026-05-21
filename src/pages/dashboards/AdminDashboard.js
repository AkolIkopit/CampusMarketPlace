import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { 
  Bell, BellDot, X, LogOut, User, 
  FileText, Users, Box, BarChart3, Building2 
} from "lucide-react";
import MyProfile from "./MyProfile"; // Make sure this path is correct

export default function AdminDashboard({ profile }) {
  const [view, setView] = useState('main'); // NEW: 'main' or 'profile'
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const subscription = subscribeToNotifications();
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  };

  const subscribeToNotifications = () => {
    return supabase
      .channel('admin-notifs')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'admin_notifications' 
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();
  };

  const markAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_notifications').update({ is_read: true }).eq('admin_id', user.id);
    setUnreadCount(0);
  };

  return (
    <main className="dashboard-container">
      <header className="main-header">
        <nav className="header-nav">
          <section className="logo-section" onClick={() => setView('main')} style={{cursor: 'pointer'}}>
            <img src="/UniMartlogo.png" alt="logo" className="header-logo" />
            <span className="logo-text">UniMart</span>
          </section>

          <section className="header-right-actions">
            <div className="notif-wrapper">
              <button 
                className="notif-bell-btn" 
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAsRead(); }}
              >
                {unreadCount > 0 ? <BellDot color="#f0a500" /> : <Bell color="#2c3e50" />}
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <header><h4>Recent Activity</h4><button onClick={() => setNotifOpen(false)}><X size={14}/></button></header>
                  <div className="notif-list">
                    {notifications.length === 0 ? <p className="empty-notif">No new alerts.</p> : 
                      notifications.map(n => <div key={n.id} className="notif-item"><p>{n.message}</p></div>)
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="burger-wrapper">
              <button className="burger-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
              {menuOpen && (
                <section className="dropdown-menu">
                  {/* FIXED: Added onClick to switch to profile view */}
                  <button 
                    className="dropdown-item" 
                    onClick={() => { setView('profile'); setMenuOpen(false); }}
                  >
                    <User size={14} /> Profile
                  </button>
                  <button className="dropdown-item logout" onClick={handleLogout}><LogOut size={14} /> Logout</button>
                </section>
              )}
            </div>
          </section>
        </nav>
      </header>

      {/* --- CONDITIONAL RENDERING --- */}
      {view === 'profile' ? (
        /* This renders your teammate's MyProfile component exactly as it is */
        <MyProfile 
            profile={profile} 
            onBack={() => setView('main')} 
            navigate={navigate} 
        />
      ) : (
        /* This is your standard Admin Dashboard content */
        <>
          <section className="hero-section">
            <span className="hero-kicker">UniMart Management</span>
            <h1 className="hero-title">Manage your campus marketplace efficiently.</h1>
            <p className="hero-description">Monitor users, moderate listings, and configure trade facilities.</p>
          </section>

          <section className="quick-actions-grid">
            <button className="action-block" onClick={() => navigate("/dashboard/admin/role-approval")}>
              <FileText className="block-icon" color="#f0a500" />
              <h3>Role Requests</h3>
              <p>Review and approve user role upgrades.</p>
            </button>

            <button className="action-block" onClick={() => navigate("/dashboard/admin/users")}>
              <Users className="block-icon" color="#f0a500" />
              <h3>User Management</h3>
              <p>View, suspend, or manage platform users.</p>
            </button>

            <button className="action-block" onClick={() => navigate("/dashboard/admin/manage-listings")}>
              <Box className="block-icon" color="#f0a500" />
              <h3>Manage Listings</h3>
              <p>Flag or remove unsafe marketplace items.</p>
            </button>

            <button className="action-block" onClick={() => navigate("/dashboard/admin/analytics")}>
              <BarChart3 className="block-icon" color="#f0a500" />
              <h3>Analytics</h3>
              <p>Monitor platform activity and reports.</p>
            </button>

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