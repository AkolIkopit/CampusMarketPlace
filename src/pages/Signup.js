import { useState } from "react";
import { supabase } from "../supabase";

export default function Signup({ onSwitch }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !role) {
      setMessage("Please fill in all fields and select a role");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setMessage("");

    // Step 1 — Create auth account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    // Step 2 — Make sure we have a user id
    if (!data.user) {
      setLoading(false);
      setMessage("Please check your email to confirm your account.");
      return;
    }

    // Step 3 — Save profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert([{
        id: data.user.id,
        full_name: fullName,
        role: role,
      }]);

    if (profileError) {
      setLoading(false);
      setMessage("Profile save failed: " + profileError.message);
      return;
    }

    // Step 4 — Automatically sign in
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setSuccess(true);
      setMessage("Account created! Please log in.");
      setTimeout(() => onSwitch(), 1500);
      return;
    }

    // App.js handles redirect automatically
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
        <p style={styles.subtitle}>Create your account</p>

        {message && (
          <p style={success ? styles.success : styles.error}>{message}</p>
        )}

        <input
          style={styles.input}
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

        <button
          style={loading ? styles.buttonDisabled : styles.button}
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <button style={styles.googleButton} onClick={handleGoogle}>
          Sign Up with Google
        </button>

        <p style={styles.switchText}>
          Already have an account?{" "}
          <span style={styles.link} onClick={onSwitch}>
            Login
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
  select: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "15px", marginBottom: "16px", boxSizing: "border-box", backgroundColor: "white" },
  button: { width: "100%", padding: "12px", backgroundColor: "#1D4ED8", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginBottom: "12px" },
  buttonDisabled: { width: "100%", padding: "12px", backgroundColor: "#93C5FD", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "not-allowed", marginBottom: "12px" },
  googleButton: { width: "100%", padding: "12px", backgroundColor: "white", color: "#111", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginBottom: "16px" },
  error: { color: "#DC2626", fontSize: "13px", marginBottom: "12px" },
  success: { color: "#16A34A", fontSize: "13px", marginBottom: "12px" },
  switchText: { fontSize: "13px", color: "#6b7280" },
  link: { color: "#1D4ED8", cursor: "pointer", fontWeight: "bold" },
};