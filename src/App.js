import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./supabase";
import { clearAuthIntent, getDefaultFullName, normalizeRole, readAuthIntent } from "./auth";

// Page Imports
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import CreateListing from "./pages/CreateListing";
import ListingDetail from "./pages/ListingDetail";
import MyListings from "./pages/MyListings";

// Dashboard Imports
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

async function fetchProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data || null;
}

async function ensureProfile(user) {
  const existingProfile = await fetchProfile(user.id);
  const authIntent = readAuthIntent();
  const provider = user.app_metadata.provider;

  // 1. If profile exists, admit immediately
  if (existingProfile) {
    clearAuthIntent();
    return existingProfile;
  }

  // 2. GATEKEEPER: Block Google users trying to LOGIN without an account
  if (provider === 'google' && (!authIntent || authIntent.mode === "login")) {
    await supabase.auth.signOut();
    clearAuthIntent();
    window.location.href = "/auth?mode=login&error=Account+not+found.+Please+sign+up+first.";
    return null;
  }

  // 3. Create Student Profile (Auto-approved)
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
      campus: 'Main Campus' 
    }])
    .select("*")
    .maybeSingle();

  if (insertError && insertError.code === '23505') return fetchProfile(user.id);

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

// Security Wrapper to prevent crashes on dashboard and feature pages
function ProtectedRoute({ loading, session, profile, requiredRole, element }) {
  if (loading || (session && !profile)) return <LoadingScreen />; 
  if (!session) return <Navigate to="/" replace />;

  const role = normalizeRole(profile?.role) || "student";
  const status = profile?.application_status || "approved";

  if (status === "pending") return <Navigate to="/waiting-room" replace />;
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={getDashboardPath(role, status)} replace />;
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
      if (isMounted) {
        setProfile(nextProfile);
        setLoading(false);
      }
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
        
        {/* Dashboards */}
        <Route path="/dashboard/student" element={<ProtectedRoute loading={loading} session={session} profile={profile} requiredRole="student" element={<StudentDashboard profile={profile} />} />} />
        <Route path="/dashboard/staff" element={<ProtectedRoute loading={loading} session={session} profile={profile} requiredRole="staff" element={<StaffDashboard profile={profile} />} />} />
        <Route path="/dashboard/admin" element={<ProtectedRoute loading={loading} session={session} profile={profile} requiredRole="admin" element={<AdminDashboard profile={profile} />} />} />

        {/* Feature Pages from Main Branch */}
        <Route path="/create-listing" element={<ProtectedRoute loading={loading} session={session} profile={profile} element={<CreateListing profile={profile} />} />} />
        <Route path="/listing/:id" element={<ProtectedRoute loading={loading} session={session} profile={profile} element={<ListingDetail profile={profile} />} />} />
        <Route path="/my-listings" element={<ProtectedRoute loading={loading} session={session} profile={profile} element={<MyListings profile={profile} />} />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const styles = {
  loading: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", fontFamily: "sans-serif", backgroundColor: '#fdfaf5', color: "#6b7280" },
};