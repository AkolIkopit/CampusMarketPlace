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

  const approveApplication = async (app) => {
    setLoadingId(app.id);
    try {
      // 1. Upgrade User Role
      await supabase.from("profiles").update({ role: app.requested_role }).eq("id", app.user_id);

      // 2. If it's a Staff member, create their permanent roster rows
      if (app.requested_role === 'staff' && app.availability) {
        try {
            const roster = JSON.parse(app.availability);
            const rosterRows = Object.entries(roster)
                .filter(([day, time]) => time !== "Not Available")
                .map(([day, time]) => ({
                    staff_id: app.user_id,
                    day_of_week: day,
                    time_slot: time
                }));
            
            if (rosterRows.length > 0) {
                await supabase.from('staff_availability').insert(rosterRows);
            }
        } catch (e) {
            console.error("No JSON roster found, likely an old text application.");
        }
      }

      // 3. Mark application as approved
      await supabase.from("role_applications").update({ status: "approved" }).eq("id", app.id);

      alert("Role Approved. The user will be prompted to transition.");
      fetchApplications();
    } catch (err) { console.error(err.message); } finally { setLoadingId(null); }
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
      </section>

      <section className="feed-outer-section" style={{padding: '0 40px'}}>
        {applications.length === 0 && <p>No pending applications.</p>}
        {applications.map((app) => (
          <article key={app.id} className="action-block" style={{marginBottom: '15px', width: '100%', padding: '20px', background: 'white', borderRadius: '15px'}}>
            <h3>{app.full_name}</h3>
            <p><strong>Target Role:</strong> {app.requested_role.toUpperCase()}</p>
            <p><strong>Campus:</strong> {app.campus_location}</p>
            <p><strong>Motivation:</strong> {app.motivation}</p>
            <section style={{ marginTop: "15px" }}>
              <button onClick={() => approveApplication(app)} disabled={loadingId === app.id} style={{background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}>Approve</button>
              <button onClick={() => rejectApplication(app.id)} disabled={loadingId === app.id} style={{ marginLeft: "10px", background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Reject</button>
            </section>
          </article>
        ))}
      </section>
    </main>
  );
}