import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function RoleApproval() {
  const [applications, setApplications] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const navigate = useNavigate();

  // --- CUSTOM POPUP STATE ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetApp, setTargetApp] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("role_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error) setApplications(data);
  };

  const renderAvailability = (avail) => {
    if (!avail) return "Not provided";
    let data = avail;
    if (typeof avail === "string") {
      try {
        data = JSON.parse(avail);
      } catch (e) {
        return avail;
      }
    }
    if (typeof data === "object" && data !== null) {
      const activeDays = Object.entries(data)
        .filter(([day, info]) => info.available === true)
        .map(
          ([day, info]) =>
            `${day.substring(0, 3)}: ${info.start}-${info.end}`
        );
      return activeDays.length > 0 ? activeDays.join(" | ") : "No days selected";
    }
    return String(avail);
  };

  const triggerAction = (app, type) => {
    setTargetApp(app);
    setActionType(type);
    setShowConfirm(true);
  };

  const handleFinalAction = async () => {
    setShowConfirm(false);
    const app = targetApp;
    setLoadingId(app.id);
    const toastId = toast.loading(actionType === 'approve' ? "Approving & Syncing..." : "Rejecting...");

    try {
      if (actionType === 'approve') {
        // 1. Update Profile Role
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role: app.requested_role, campus: app.campus_location })
          .eq("id", app.user_id);

        if (profileError) throw profileError;

        // 2. Sync Roster if Staff
        if (app.requested_role === "staff" && app.availability) {
          try {
            const schedule = typeof app.availability === "string" ? JSON.parse(app.availability) : app.availability;
            const rosterRows = Object.entries(schedule)
              .filter(([day, info]) => info.available === true)
              .map(([day, info]) => ({
                staff_id: app.user_id,
                day_of_week: day,
                campus_name: app.campus_location,
                shift_start: info.start,
                shift_end: info.end,
              }));

            if (rosterRows.length > 0) {
              const { error: rosterError } = await supabase.from("staff_roster").insert(rosterRows);
              if (rosterError) throw rosterError;
            }
          } catch (e) {
            console.error("Roster sync failed.");
          }
        }

        await supabase.from("role_applications").update({ status: "approved" }).eq("id", app.id);
        toast.success(`${app.full_name} approved!`, { id: toastId });

      } else {
        const { error } = await supabase.from("role_applications").update({ status: "rejected" }).eq("id", app.id);
        if (error) throw error;
        toast.success("Application rejected.", { id: toastId });
      }

      fetchApplications();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setLoadingId(null);
      setTargetApp(null);
    }
  };

  return (
    <main className="dashboard-container">
      {/* INJECTED CSS FOR THE COOL POPUP */}
      <style>{`
        .custom-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(13, 27, 42, 0.85);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .confirm-modal-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          max-width: 450px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          animation: modalSlideIn 0.3s ease-out;
        }
        @keyframes modalSlideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-sub-text {
          font-size: 0.85rem;
          color: #888;
          margin-top: 10px;
          font-style: italic;
        }
        .modal-btn-row {
          display: flex;
          gap: 15px;
          margin-top: 30px;
          justify-content: center;
        }
        .modal-btn-cancel {
          background: #eee;
          border: none;
          padding: 12px 25px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          color: #333;
          transition: background 0.2s;
        }
        .modal-btn-cancel:hover { background: #e0e0e0; }
        .modal-btn-confirm {
          border: none;
          padding: 12px 25px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          color: white;
          transition: transform 0.2s;
        }
        .modal-btn-confirm:active { transform: scale(0.95); }
        .bg-green { background: #27ae60; }
        .bg-red { background: #e63946; }
        
        .role-card {
          margin-bottom: 15px;
          width: 100%;
          padding: 20px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
      `}</style>

      <Toaster position="top-center" reverseOrder={false} />

      {/* --- COOL POPUP MODAL --- */}
      {showConfirm && (
        <div className="custom-overlay">
          <div className="confirm-modal-card">
            {actionType === 'approve' ? (
                <CheckCircle size={48} color="#27ae60" style={{ marginBottom: '15px' }} />
            ) : (
                <AlertTriangle size={48} color="#e74c3c" style={{ marginBottom: '15px' }} />
            )}
            
            <h2 style={{color: '#0d1b2a', margin: '0 0 10px 0'}}>Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}</h2>
            <p style={{color: '#555', margin: 0}}>
                Are you sure you want to <strong>{actionType}</strong> the application for <strong>{targetApp?.full_name}</strong>?
            </p>
            {actionType === 'approve' && (
                <p className="modal-sub-text">This will update their role to {targetApp?.requested_role.toUpperCase()} and sync their work roster.</p>
            )}
            
            <div className="modal-btn-row">
              <button className="modal-btn-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button 
                className={`modal-btn-confirm ${actionType === 'approve' ? 'bg-green' : 'bg-red'}`}
                onClick={handleFinalAction}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header
        className="main-header"
        style={{
          background: "#0d1b2a",
          padding: "20px 40px",
          borderBottom: "3px solid #f0a500",
        }}
      >
        <nav className="header-nav">
          <button
            className="back-btn-gold"
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              color: "#f0a500",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
            }}
          >
            <ArrowLeft size={20} /> Back
          </button>
        </nav>
      </header>

      <section className="hero-section" style={{padding: '40px'}}>
        <span className="hero-kicker" style={{color: '#f0a500', fontWeight: 'bold', fontSize: '0.8rem'}}>ADMIN PANEL</span>
        {/* CHANGED THIS TO ORANGE BELOW */}
        <h1 className="hero-title" style={{fontSize: '2.5rem', color: '#f0a500', margin: '10px 0'}}>Role Applications</h1>
        <p className="hero-description" style={{color: '#666'}}>Review and process staff and moderator requests.</p>
      </section>

      <section className="feed-outer-section" style={{ padding: "0 40px" }}>
        {applications.length === 0 && <p style={{textAlign: 'center', marginTop: '40px', color: '#999'}}>No pending applications found.</p>}
        {applications.map((app) => (
          <article key={app.id} className="role-card">
            <h3 style={{color: '#0d1b2a', marginBottom: '10px'}}>{app.full_name}</h3>
            <p style={{margin: '5px 0'}}><strong>Requested Role:</strong> <span style={{color: '#f0a500'}}>{app.requested_role.toUpperCase()}</span></p>
            <p style={{margin: '5px 0'}}><strong>Campus:</strong> {app.campus_location}</p>
            <p style={{margin: '5px 0'}}><strong>Motivation:</strong> {app.motivation}</p>
            
            <div style={{ background: "#f8f9fa", padding: "12px", borderRadius: "8px", marginTop: "12px", border: "1px solid #eee" }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Weekly Roster Preference</p>
              <p style={{ margin: "5px 0 0", color: "#0d1b2a", fontWeight: "600", fontSize: '0.9rem' }}>
                {renderAvailability(app.availability)}
              </p>
            </div>

            <section style={{ marginTop: "20px", display: 'flex', gap: '10px' }}>
              <button
                onClick={() => triggerAction(app, 'approve')}
                disabled={loadingId === app.id}
                style={{
                  background: "#27ae60",
                  color: "white",
                  border: "none",
                  padding: "10px 25px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: '600'
                }}
              >
                {loadingId === app.id ? "..." : "Approve"}
              </button>
              <button
                onClick={() => triggerAction(app, 'reject')}
                disabled={loadingId === app.id}
                style={{
                  background: "#e74c3c",
                  color: "white",
                  border: "none",
                  padding: "10px 25px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: '600'
                }}
              >
                Reject
              </button>
            </section>
          </article>
        ))}
      </section>
    </main>
  );
}