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

function LoadingScreen() {
  return <div style={styles.loading}>Loading UniMart...</div>;
}

function SessionErrorScreen({ message }) {
  return (
    <div style={styles.loading}>
      <h1>Something went wrong</h1>
      <p>{message}</p>
    </div>
  );
}

// Security Wrapper to prevent crashes on dashboard and feature pages
function ProtectedRoute({ loading, session, profile, authError, requiredRole, element }) {
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/" replace />;
  if (authError || !profile) return <SessionErrorScreen message={authError || "We could not load your profile. Please sign out and try again."} />;

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
    // Tracks the latest resolved profile value so onAuthStateChange
    // (e.g. a background token refresh) can check whether a profile
    // is already loaded before deciding to show the loading screen.
    let latestProfile = null;
    const updateProfile = (p) => { latestProfile = p; setProfile(p); };

    const syncSession = async (nextSession) => {
      if (!isMounted) return;

      setAuthError("");
      setSession(nextSession);
      if (!nextSession) { updateProfile(null); setLoading(false); return; }

      // Only show the loading screen if we don't already have a profile.
      // This prevents background token refreshes (e.g. on tab focus) from
      // wiping out the UI with a full-screen loading flash.
      if (!latestProfile) setLoading(true);
      try {
        const nextProfile = await withTimeout(
          ensureProfile(nextSession.user),
          10000,
          "Timed out while loading your profile. Please try again."
        );
        if (isMounted) {
          updateProfile(nextProfile);
          if (!nextProfile) {
            setAuthError("We could not load your profile. Please sign out and try again.");
          }
        }
      } catch (error) {
        console.error("Session sync failed:", error);
        if (isMounted) {
          updateProfile(null);
          setAuthError("We could not load your profile. Please sign out and try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session: cur } }) => syncSession(cur));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Ignore SIGNED_OUT events that fire while the tab is hidden.
      // These are almost always spurious WebSocket disconnections caused by
      // the browser suspending the tab — not real logouts. The session is
      // still valid in localStorage and will be recovered on the next
      // getSession() call. If the user genuinely signs out, the tab is
      // visible and this guard does not trigger.
      if (event === "SIGNED_OUT" && document.hidden) return;
      syncSession(s);
    });
    
    // When the tab becomes visible again, re-validate the session.
    // This catches cases where a SIGNED_OUT event was suppressed above
    // and ensures the UI always reflects the true auth state.
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        supabase.auth.getSession().then(({ data: { session: cur } }) => syncSession(cur));
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => { isMounted = false; subscription.unsubscribe(); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, []);

  if (loading && !session) return <LoadingScreen />;
  if (session && !loading && !profile) return <SessionErrorScreen message={authError || "We could not load your profile. Please sign out and try again."} />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={!session ? <LandingPage /> : (loading ? <LoadingScreen /> : profile ? <Navigate to={getDashboardPath(profile.role, profile.application_status)} replace /> : <SessionErrorScreen message={authError || "We could not load your profile. Please sign out and try again."} />)} />
        <Route path="/auth" element={!session ? <AuthPage /> : (loading ? <LoadingScreen /> : profile ? <Navigate to={getDashboardPath(profile.role, profile.application_status)} replace /> : <SessionErrorScreen message={authError || "We could not load your profile. Please sign out and try again."} />)} />
        <Route path="/waiting-room" element={<div style={styles.loading}><h1>Request Pending</h1><p>An admin is reviewing your role upgrade.</p></div>} />
        
        {/* Dashboards */}
        <Route path="/dashboard/student" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="student" element={<StudentDashboard profile={profile} />} />} />
        <Route path="/dashboard/staff" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="staff" element={<StaffDashboard profile={profile} />} />} />
        <Route path="/dashboard/admin" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="admin" element={<AdminDashboard profile={profile} />} />} />

        {/* Feature Pages */}
        <Route path="/create-listing" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<CreateListing profile={profile} />} />} />
        <Route path="/listing/:id" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<ListingDetail profile={profile} />} />} />
        <Route path="/my-listings" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MyListings profile={profile} />} />} />
        <Route path="/messages" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MessagesPage profile={profile} />} />} />
  
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const styles = {
  loading: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", fontFamily: "sans-serif", backgroundColor: '#fdfaf5', color: "#6b7280" },
};