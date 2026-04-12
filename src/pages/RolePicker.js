import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthIntent, getDefaultFullName, normalizeRole, ROLE_OPTIONS } from "../auth";
import { supabase } from "../supabase";
import "./RolePicker.css";

export default function RolePicker({ session, profile, onProfileCreated }) {
  const navigate = useNavigate();
  const [role, setRole] = useState(
    normalizeRole(profile?.role) || normalizeRole(session.user.user_metadata?.role) || ""
  );
  const [fullName, setFullName] = useState(profile?.full_name || getDefaultFullName(session.user));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim() || !role) {
      setMessage("Please add your name and choose a role.");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      id: session.user.id,
      full_name: fullName.trim(),
      role,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload)
      .select("*")
      .maybeSingle();

    setLoading(false);

    if (error) {
      setMessage("Something went wrong. Please try again.");
      return;
    }

    clearAuthIntent();
    onProfileCreated(data || payload);
  };

  const handleBack = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    clearAuthIntent();
    navigate("/", { replace: true });
  };

  return (
    <div className="role-picker-page">
      <div className="role-picker-card">
        <button type="button" className="role-picker-back" onClick={handleBack} disabled={loading}>
          <ArrowLeftIcon />
          Back
        </button>

        <div className="role-picker-header">
          <span className="role-picker-kicker">Complete setup</span>
          <h1>One last step</h1>
          <p>
            You are signed in as <strong>{session.user.email}</strong>. Add your name and role so
            UniMart can open the right workspace.
          </p>
        </div>

        {message && <div className="role-picker-alert">{message}</div>}

        <div className="role-picker-group">
          <label htmlFor="role-picker-name">Full name</label>
          <input
            id="role-picker-name"
            className="role-picker-input"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>

        <div className="role-picker-group">
          <label>Role</label>
          <div className="role-picker-options">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`role-picker-option ${role === option.value ? "active" : ""}`}
                onClick={() => setRole(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button className="role-picker-submit" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);
