import { useState } from "react";
import { supabase } from "../supabase";

export default function Login({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Please fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "http://localhost:3000" },
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Campus Marketplace</h2>
        <p style={styles.subtitle}>Login to your account</p>

        {message && <p style={styles.error}>{message}</p>}

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={styles.button} onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        <button style={styles.googleButton} onClick={handleGoogle}>
          Continue with Google
        </button>
        <p style={styles.switchText}>
          Don't have an account?{" "}
          <span style={styles.link} onClick={onSwitch}>
            Sign Up
          </span>
        </p>
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
  button: { width: "100%", padding: "12px", backgroundColor: "#1D4ED8", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginBottom: "12px" },
  googleButton: { width: "100%", padding: "12px", backgroundColor: "white", color: "#111", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginBottom: "16px" },
  error: { color: "#DC2626", fontSize: "13px", marginBottom: "12px" },
  switchText: { fontSize: "13px", color: "#6b7280" },
  link: { color: "#1D4ED8", cursor: "pointer", fontWeight: "bold" },
};