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
import RoleApproval from "./pages/dashboards/RoleApproval";
// Dashboard Imports
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import UserManagement from "./pages/dashboards/UserManagement";
import TradeStaffDashboard from "./pages/dashboards/TradeStaffDashboard";
import MarketTrades from "./pages/dashboards/MarketTrades";
import MyTrades from "./pages/dashboards/MyTrades";
export async function fetchProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data || null;
}

export async function ensureProfile(user) {
  const existingProfile = await fetchProfile(user.id);
  const authIntent = readAuthIntent();
  const provider = user.app_metadata.provider;

  if (existingProfile) {
    if (existingProfile.is_banned) {
        await supabase.auth.signOut();
        alert("Your account has been suspended.");
        return null;
    }

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

export function withTimeout(promise, timeoutMs, timeoutMessage) {
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

export function getDashboardPath(role, status) {
  if (status === "pending") return "/waiting-room";
  if (role === "admin") return "/dashboard/admin";
  if (role === "staff") return "/dashboard/staff";
  return "/dashboard/student";
}

export function SessionErrorScreen({ message }) {
  return (
    <div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#fdfaf5", textAlign: "center", padding: "20px"}}>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button onClick={() => supabase.auth.signOut()} style={{marginTop: "20px", padding: "10px 20px", cursor: "pointer"}}>Sign Out</button>
    </div>
  );
}

export function ProtectedRoute({ loading, session, profile, authError, requiredRole, element }) {
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
        // Minimum time for animation to be seen
        const animationPromise = new Promise(res => setTimeout(res, 1800));
        
        const profilePromise = withTimeout(
          ensureProfile(nextSession.user),
          10000,
          "Timed out while loading your profile."
        );

        const [nextProfile] = await Promise.all([profilePromise, animationPromise]);

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
        if (isMounted) setLoading(false);
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

  return (
    <Router>
      <Routes>
        <Route path="/" element={!session ? <LandingPage /> : (loading ? <LoadingScreen /> : <Navigate to={getDashboardPath(profile?.role, profile?.application_status)} replace />)} />
        <Route path="/auth" element={!session ? <AuthPage /> : (loading ? <LoadingScreen /> : <Navigate to={getDashboardPath(profile?.role, profile?.application_status)} replace />)} />
        <Route path="/waiting-room" element={<div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}><h1>Request Pending</h1></div>} />
        
        <Route path="/dashboard/student" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="student" element={<StudentDashboard profile={profile} />} />} />
     
        <Route path="/dashboard/admin" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="admin" element={<AdminDashboard profile={profile} />} />} />
        <Route
  path="/dashboard/admin/role-approval"
  element={session ? <RoleApproval /> : <Navigate to="/" />}
/>
<Route
  path="/dashboard/admin/users"
  element={session ? <UserManagement /> : <Navigate to="/" />}
/>
<Route
  path="/dashboard/staff"
  element={
    <ProtectedRoute
      loading={loading}
      session={session}
      profile={profile}
      authError={authError}
      requiredRole="staff"
      element={<TradeStaffDashboard profile={profile} />}
    />
  }
/>
<Route
  path="/dashboard/staff/market"
  element={
    <ProtectedRoute
      loading={loading}
      session={session}
      profile={profile}
      authError={authError}
      requiredRole="staff"
      element={<MarketTrades />}
    />
  }
/>
<Route
  path="/dashboard/staff/my-trades"
  element={
    <ProtectedRoute
      loading={loading}
      session={session}
      profile={profile}
      authError={authError}
      requiredRole="staff"
      element={<MyTrades />}
    />
  }
/>
        <Route path="/create-listing" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<CreateListing />} />} />
        <Route path="/listing/:id" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<ListingDetail />} />} />
        <Route path="/my-listings" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MyListings />} />} />
        <Route path="/messages" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MessagesPage />} />} />
  
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const styles = {
  loading: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", fontFamily: "sans-serif", backgroundColor: '#fdfaf5', color: "#6b7280" },
};