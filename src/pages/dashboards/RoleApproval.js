import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RoleApproval() {
  const [applications, setApplications] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from("role_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error.message);
    } else {
      setApplications(data);
    }
  };

  // ✅ Approve application (Now only sets status to approved)
  const approveApplication = async (app) => {
    setLoadingId(app.id);
    try {
      // 1. Update ONLY the application status
      const { error } = await supabase
        .from("role_applications")
        .update({ status: "approved" })
        .eq("id", app.id);

      if (error) throw error;

      alert("Application approved! The user will be prompted to accept on their dashboard.");
      fetchApplications();
    } catch (err) {
      console.error("Approve error:", err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const rejectApplication = async (id) => {
    setLoadingId(id);
    try {
      await supabase
        .from("role_applications")
        .update({ status: "rejected" })
        .eq("id", id);

      fetchApplications();
    } catch (err) {
      console.error("Reject error:", err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <main className="dashboard-container">
      <section className="hero-section">
        <span className="hero-kicker">ADMIN</span>
        <h1 className="hero-title">Role Applications</h1>
        <p className="hero-description">
          Review and approve role upgrade requests.
        </p>
      </section>

      <section className="feed-outer-section" style={{padding: '0 40px'}}>
        {applications.length === 0 && (
          <p>No pending applications.</p>
        )}

        {applications.map((app) => (
          <article key={app.id} className="action-block" style={{marginBottom: '15px', width: '100%'}}>
            <h3>{app.full_name}</h3>
            <p><strong>Requested Role:</strong> {app.requested_role.toUpperCase()}</p>
            <p><strong>Campus:</strong> {app.campus_location}</p>
            <p><strong>Motivation:</strong> {app.motivation}</p>
            <p><strong>Experience:</strong> {app.experience}</p>
            <p><strong>Availability:</strong> {app.availability}</p>

            <section style={{ marginTop: "10px" }}>
              <button
                onClick={() => approveApplication(app)}
                disabled={loadingId === app.id}
                style={{background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer'}}
              >
                Approve
              </button>
              <button
                onClick={() => rejectApplication(app.id)}
                disabled={loadingId === app.id}
                style={{ marginLeft: "10px", background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}
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