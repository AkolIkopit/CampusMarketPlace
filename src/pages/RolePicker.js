import { useState } from "react";
import { supabase } from "../supabase";

export default function RolePicker({ session }) {
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName || !role) {
      setMessage("Please fill in your name and select a role");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .insert([{
        id: session.user.id,
        full_name: fullName,
        role: role,
      }]);

    setLoading(false);

    if (error) {
      setMessage("Something went wrong. Try again.");
      return;
    }

    // App.js will automatically re-render with the new profile
    window.location.reload();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>One Last Step!</h2>
        <p style={styles.subtitle}>
          Welcome {session.user.email}! Please tell us who you are.
        </p>

        {message && <p style={styles.error}>{message}</p>}

        <input
          style={styles.input}
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <select
          style={styles.select}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select your role...</option>
          <option value="student">Student</option>
          <option value="staff">Trade Facility Staff</option>
          <option value="admin">Admin</option>
        </select>

        <button style={styles.button} onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f3f4f6" },
  card: { backgroundColor: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "380px", textAlign: "center" },
  title: { fontSize: "24px", fontWeight: "bold", marginBottom: "8px", color: "#111" },
  subtitle: { fontSize: "14px", color: "#6b7280", marginBottom: "24px" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px", marginBottom: "16px", boxSizing: "border-box" },
  select: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px", marginBottom: "16px", boxSizing: "border-box", backgroundColor: "white" },
  button: { width: "100%", padding: "12px", backgroundColor: "#1D4ED8", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" },
  error: { color: "#DC2626", fontSize: "13px", marginBottom: "12px" },
};