import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RoleApproval() {
  const [applications, setApplications] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => { fetchApplications(); }, []);

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
    if (typeof avail === 'string') {
      try { data = JSON.parse(avail); } catch (e) { return avail; }
    }
    if (typeof data === 'object' && data !== null) {
      const activeDays = Object.entries(data)
        .filter(([day, info]) => info.available === true)
        .map(([day, info]) => `${day.substring(0, 3)}: ${info.start}-${info.end}`);
      return activeDays.length > 0 ? activeDays.join(" | ") : "No days selected";
    }
    return String(avail);
  };

  const approveApplication = async (app) => {
    setLoadingId(app.id);
    try {
      // 1. Update Profile Role
      await supabase.from("profiles").update({ role: app.requested_role, campus: app.campus_location }).eq("id", app.user_id);

      // 2. If Staff: Transfer JSON schedule to the official staff_roster table
      if (app.requested_role === 'staff' && app.availability) {
        const schedule = typeof app.availability === 'string' ? JSON.parse(app.availability) : app.availability;
        
        const rosterRows = Object.entries(schedule)
          .filter(([day, info]) => info.available === true)
          .map(([day, info]) => ({
            staff_id: app.user_id,
            day_of_week: day,
            campus_name: app.campus_location,
            shift_start: info.start,
            shift_end: info.end
          }));

        if (rosterRows.length > 0) {
          await supabase.from('staff_roster').insert(rosterRows);
        }
      }

      // 3. Mark application approved
      await supabase.from("role_applications").update({ status: "approved" }).eq("id", app.id);

      alert("Staff member approved and schedule synchronized to roster!");
      fetchApplications();
    } catch (err) {
      alert("Approval Error: " + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const rejectApplication = async (id) => {
    setLoadingId(id);
    await supabase.from("role_applications").update({ status: "rejected" }).eq("id", id);
    fetchApplications();
    setLoadingId(null);
  };

  return (
    <main className="dashboard-container">
      <section className="hero-section">
        <span className="hero-kicker">ADMIN</span>
        <h1 className="hero-title">Role Applications</h1>
        <p className="hero-description">Review and approve role upgrade requests.</p>
      </section>

      <section className="feed-outer-section" style={{padding: '0 40px'}}>
        {applications.length === 0 && <p>No pending applications.</p>}
        {applications.map((app) => (
          <article key={app.id} className="action-block" style={{marginBottom: '15px', width: '100%', padding: '20px', background: 'white', borderRadius: '15px'}}>
            <h3>{app.full_name}</h3>
            <p><strong>Role:</strong> {app.requested_role.toUpperCase()}</p>
            <p><strong>Campus:</strong> {app.campus_location}</p>
            <p><strong>Motivation:</strong> {app.motivation}</p>
            <div style={{background: '#f8f9fa', padding: '10px', borderRadius: '8px', marginTop: '10px', border: '1px solid #ddd'}}>
                <p style={{margin: 0, fontSize: '0.8rem'}}><strong>Weekly Roster Preference:</strong></p>
                <p style={{margin: '5px 0 0', color: '#0d1b2a', fontWeight: 'bold'}}>{renderAvailability(app.availability)}</p>
            </div>
            <section style={{ marginTop: "15px" }}>
              <button onClick={() => approveApplication(app)} disabled={loadingId === app.id} style={{background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer'}}>Approve</button>
              <button onClick={() => rejectApplication(app.id)} disabled={loadingId === app.id} style={{ marginLeft: "10px", background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Reject</button>
            </section>
          </article>
        ))}
      </section>
    </main>
  );
}