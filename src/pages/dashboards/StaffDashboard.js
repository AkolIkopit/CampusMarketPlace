import { supabase } from "../../supabase";

export default function StaffDashboard({ profile }) {
  return (
    <div style={styles.container}>
      <div style={styles.navbar}>
        <h1 style={styles.logo}>Campus Marketplace</h1>
        <div style={styles.navRight}>
          <span style={styles.welcome}>👋 {profile.full_name}</span>
          <span style={styles.badge}>Staff</span>
          <button
            style={styles.logout}
            onClick={() => supabase.auth.signOut()}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={styles.content}>
        <h2 style={styles.heading}>Staff Dashboard</h2>
        <p style={styles.sub}>Manage drop-offs and collections here.</p>
        <div style={styles.grid}>
          <div style={styles.card}>📥 Incoming Drop-offs</div>
          <div style={styles.card}>📤 Ready for Collection</div>
          <div style={styles.card}>📋 Booking Schedule</div>
          <div style={styles.card}>✅ Confirm Transactions</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#f3f4f6" },
  navbar: { backgroundColor: "#065F46", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { color: "white", fontSize: "20px", fontWeight: "bold", margin: 0 },
  navRight: { display: "flex", alignItems: "center", gap: "16px" },
  welcome: { color: "white", fontSize: "14px" },
  badge: { backgroundColor: "#D1FAE5", color: "#065F46", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
  logout: { backgroundColor: "transparent", color: "white", border: "1px solid white", padding: "6px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px" },
  content: { padding: "40px 32px" },
  heading: { fontSize: "28px", fontWeight: "bold", color: "#111", marginBottom: "8px" },
  sub: { color: "#6b7280", marginBottom: "32px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", maxWidth: "500px" },
  card: { backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", fontSize: "16px", fontWeight: "bold", color: "#111", textAlign: "center", cursor: "pointer" },
};