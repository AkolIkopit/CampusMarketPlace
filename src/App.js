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
import MessagesPage from "./pages/Messages/MessagesPage";
import LoadingScreen from "./components/LoadingScreen";

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

  if (existingProfile) {
    clearAuthIntent();
    return existingProfile;
  }

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
      campus: 'Main Campus' 
    }])
    .select("*")
    .maybeSingle();

  if (insertError && insertError.code === '23505') return fetchProfile(user.id);

  clearAuthIntent();
  return newProfile;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function getDashboardPath(role, status) {
  if (status === "pending") return "/waiting-room";
  if (role === "admin") return "/dashboard/admin";
  if (role === "staff") return "/dashboard/staff";
  return "/dashboard/student";
}

function SessionErrorScreen({ message }) {
  return (
    <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#fdfaf5", textAlign: "center", padding: "20px"}}>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button onClick={() => supabase.auth.signOut()} style={{marginTop: "20px", padding: "10px 20px", cursor: "pointer"}}>Sign Out</button>
    </div>
  );
}

function ProtectedRoute({ loading, session, profile, authError, requiredRole, element }) {
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/" replace />;
  if (authError || !profile) return <SessionErrorScreen message={authError || "We could not load your profile."} />;

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
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const syncSession = async (nextSession) => {
      if (!isMounted) return;

      setAuthError("");
      setSession(nextSession);
      if (!nextSession) { setProfile(null); setLoading(false); return; }

      setLoading(true);
      try {
        // Minimum time for animation to be seen
        const animationPromise = new Promise(res => setTimeout(res, 1800));
        
        const profilePromise = withTimeout(
          ensureProfile(nextSession.user),
          10000,
          "Timed out while loading your profile."
        );

        const [nextProfile] = await Promise.all([profilePromise, animationPromise]);

        if (isMounted) {
          setProfile(nextProfile);
          if (!nextProfile) setAuthError("Profile sync failed.");
        }
      } catch (error) {
        if (isMounted) setAuthError(error.message);
      } finally {
        if (isMounted) setLoading(false);
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
        <Route path="/" element={!session ? <LandingPage /> : (loading ? <LoadingScreen /> : <Navigate to={getDashboardPath(profile?.role, profile?.application_status)} replace />)} />
        <Route path="/auth" element={!session ? <AuthPage /> : (loading ? <LoadingScreen /> : <Navigate to={getDashboardPath(profile?.role, profile?.application_status)} replace />)} />
        <Route path="/waiting-room" element={<div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}><h1>Request Pending</h1></div>} />
        
        <Route path="/dashboard/student" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="student" element={<StudentDashboard profile={profile} />} />} />
        <Route path="/dashboard/staff" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="staff" element={<StaffDashboard profile={profile} />} />} />
        <Route path="/dashboard/admin" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="admin" element={<AdminDashboard profile={profile} />} />} />

        <Route path="/create-listing" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<CreateListing />} />} />
        <Route path="/listing/:id" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<ListingDetail />} />} />
        <Route path="/my-listings" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MyListings />} />} />
        <Route path="/messages" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MessagesPage />} />} />
  
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}