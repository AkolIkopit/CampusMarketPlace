import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RolePicker from "./pages/RolePicker";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) fetchProfile(session.user.id);
        else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      setProfile(null);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  // Loading screen
  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  // Logged in but no profile yet — Google user needs to pick role
  if (session && !profile) {
    return <RolePicker session={session} />;
  }

  // Logged in with profile — route to correct dashboard
  if (session && profile) {
    if (profile.role === "student") return <StudentDashboard profile={profile} />;
    if (profile.role === "staff") return <StaffDashboard profile={profile} />;
    if (profile.role === "admin") return <AdminDashboard profile={profile} />;
  }

  // Not logged in
  if (page === "login") {
    return <Login onSwitch={() => setPage("signup")} />;
  }

  return <Signup onSwitch={() => setPage("login")} />;
}

const styles = {
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", color: "#6b7280" },
};