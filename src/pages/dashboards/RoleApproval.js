import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RoleApproval() {
  const [applications, setApplications] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  // 🔄 Fetch pending applications
  useEffect(() => {
    fetchApplications();
  }, []);

 const fetchApplications = async () => {
  const { data, error } = await supabase
    .from("role_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  console.log("DATA:", data);   // 👈 ADD THIS
  console.log("ERROR:", error); // 👈 ADD THIS

  if (error) {
    console.error("Error fetching applications:", error.message);
  } else {
    setApplications(data);
  }
};

  // ✅ Approve application
  const approveApplication = async (app) => {
    setLoadingId(app.id);

    try {
      // 1. Update user role
      await supabase
        .from("profiles")
        .update({ role: app.requested_role })
        .eq("id", app.user_id);

      // 2. Update application status
      await supabase
        .from("role_applications")
        .update({ status: "approved" })
        .eq("id", app.id);

      fetchApplications();
    } catch (err) {
      console.error("Approve error:", err.message);
    } finally {
      setLoadingId(null);
    }
  };

  // ❌ Reject application
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

      {/* HERO */}
      <section className="hero-section">
        <span className="hero-kicker">ADMIN</span>
        <h1 className="hero-title">Role Applications</h1>
        <p className="hero-description">
          Review and approve role upgrade requests.
        </p>
      </section>

      {/* APPLICATION LIST */}
      <section className="feed-outer-section">

        {applications.length === 0 && (
          <p>No pending applications.</p>
        )}

        {applications.map((app) => (
          <article key={app.id} className="action-block">

            <h3>{app.full_name}</h3>

            <p><strong>Requested Role:</strong> {app.requested_role}</p>
            <p><strong>Campus:</strong> {app.campus_location}</p>
            <p><strong>Motivation:</strong> {app.motivation}</p>
            <p><strong>Experience:</strong> {app.experience}</p>
            <p><strong>Availability:</strong> {app.availability}</p>

            <section style={{ marginTop: "10px" }}>

              <button
                onClick={() => approveApplication(app)}
                disabled={loadingId === app.id}
              >
                Approve
              </button>

              <button
                onClick={() => rejectApplication(app.id)}
                disabled={loadingId === app.id}
                style={{ marginLeft: "10px" }}
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