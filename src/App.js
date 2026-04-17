import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./supabase";
import { clearAuthIntent, getDefaultFullName, normalizeRole, readAuthIntent } from "./auth";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

async function fetchProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data || null;
}

async function ensureProfile(user) {
  const existingProfile = await fetchProfile(user.id);
  if (existingProfile) {
    clearAuthIntent();
    return existingProfile;
  }

  const authIntent = readAuthIntent();
  const provider = user.app_metadata.provider;

  // GATEKEEPER: Only block Google users who haven't signed up.
  // Email users are already verified by password, so we allow profile creation.
  if (provider === 'google' && (!authIntent || authIntent.mode === "login")) {
    await supabase.auth.signOut();
    clearAuthIntent();
    window.location.href = "/auth?mode=login&error=Account+not+found.+Please+sign+up+first.";
    return null;
  }

  const fullName = 
    user?.user_metadata?.full_name || 
    user?.user_metadata?.name || 
    user?.user_metadata?.display_name ||
    getDefaultFullName(user) || "New Student";

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert([{
      id: user.id,
      full_name: fullName,
      role: "student",
      application_status: "approved",
      requested_role: "student",
    }])
    .select("*")
    .maybeSingle();

  if (insertError && insertError.code === '23505') { return fetchProfile(user.id); }

  clearAuthIntent();
  return newProfile;
}

function getDashboardPath(role, status) {
  if (status === "pending") return "/waiting-room";
  if (role === "admin") return "/dashboard/admin";
  if (role === "staff") return "/dashboard/staff";
  return "/dashboard/student";
}

function LoadingScreen() {
  return <div style={styles.loading}>Loading UniMart...</div>;
}

function ProtectedDashboardRoute({ loading, session, profile, requiredRole, element }) {
  // CRITICAL: Prevent crash if profile is still syncing
  if (loading || (session && !profile)) return <LoadingScreen />; 
  if (!session) return <Navigate to="/" replace />;

  const profileRole = normalizeRole(profile?.role) || "student";
  const status = profile?.application_status || "approved";

  if (status === "pending") return <Navigate to="/waiting-room" replace />;
  if (profileRole !== requiredRole) {
    return <Navigate to={getDashboardPath(profileRole, status)} replace />;
  }

  return element;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const syncSession = async (nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) { setProfile(null); setLoading(false); return; }

      setLoading(true);
      const nextProfile = await ensureProfile(nextSession.user);
      if (!isMounted) return;
      setProfile(nextProfile);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: cur } }) => syncSession(cur));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => syncSession(s));
    
    return () => { isMounted = false; subscription.unsubscribe(); };
  }, []);

  if (loading && !session) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={!session ? <LandingPage /> : (!profile ? <LoadingScreen /> : <Navigate to={getDashboardPath(profile.role, profile.application_status)} replace />)} />
        <Route path="/auth" element={!session ? <AuthPage /> : (!profile ? <LoadingScreen /> : <Navigate to={getDashboardPath(profile.role, profile.application_status)} replace />)} />
        <Route path="/waiting-room" element={<div style={styles.loading}><h1>Request Pending</h1><p>An admin is reviewing your role upgrade.</p></div>} />
        
        <Route path="/dashboard/student" element={<ProtectedDashboardRoute loading={loading} session={session} profile={profile} requiredRole="student" element={<StudentDashboard profile={profile} />} />} />
        <Route path="/dashboard/staff" element={<ProtectedDashboardRoute loading={loading} session={session} profile={profile} requiredRole="staff" element={<StaffDashboard profile={profile} />} />} />
        <Route path="/dashboard/admin" element={<ProtectedDashboardRoute loading={loading} session={session} profile={profile} requiredRole="admin" element={<AdminDashboard profile={profile} />} />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const styles = {
  loading: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", fontFamily: "sans-serif", color: "#6b7280" },
};