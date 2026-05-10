import { useEffect, useState, useCallback } from "react";
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
import CartPage from "./pages/CartPage";
import PaymentStatus from "./pages/PaymentStatus";
import LoadingScreen from "./components/LoadingScreen";
import RoleApproval from "./pages/dashboards/RoleApproval";

// Dashboard Imports
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import UserManagement from "./pages/dashboards/UserManagement";

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
    <main style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "#fdfaf5", textAlign: "center", padding: "20px"}}>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button onClick={() => supabase.auth.signOut()} style={{marginTop: "20px", padding: "10px 20px", cursor: "pointer"}}>Sign Out</button>
    </main>
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

  // Logic to handle session changes without creating a re-render loop
  const syncSession = useCallback(async (nextSession) => {
    setAuthError("");
    setSession(nextSession);

    if (!nextSession) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Optimization: If we already have the correct profile, just stop loading
    // This is what prevents the tab-switch "freeze"
    setProfile((currentProfile) => {
      if (currentProfile && currentProfile.id === nextSession.user.id) {
        setLoading(false);
        return currentProfile;
      }
      
      // If no profile or wrong profile, start the fetch
      setLoading(true);
      (async () => {
        try {
          const animationPromise = new Promise(res => setTimeout(res, 1800));
          const profilePromise = withTimeout(
            ensureProfile(nextSession.user),
            10000,
            "Timed out while loading your profile."
          );

          const [nextProfile] = await Promise.all([profilePromise, animationPromise]);

          if (nextProfile) {
            setProfile(nextProfile);
          } else {
            setAuthError("We could not load your profile. Please sign out and try again.");
          }
        } catch (error) {
          setAuthError(error.message);
        } finally {
          setLoading(false);
        }
      })();
      
      return currentProfile;
    });
  }, []);

  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session: cur } }) => syncSession(cur));

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT" && document.hidden) return;
      syncSession(s);
    });
    
    return () => subscription.unsubscribe();
  }, [syncSession]);

  if (loading && !session) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={!session ? <LandingPage /> : (loading ? <LoadingScreen /> : (profile ? <Navigate to={getDashboardPath(profile.role, profile.application_status)} replace /> : <LoadingScreen />))} />
        <Route path="/auth" element={!session ? <AuthPage /> : (loading ? <LoadingScreen /> : (profile ? <Navigate to={getDashboardPath(profile.role, profile.application_status)} replace /> : <LoadingScreen />))} />
        <Route path="/waiting-room" element={<div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}><h1>Request Pending</h1></div>} />
        
        <Route path="/dashboard/student" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="student" element={<StudentDashboard profile={profile} />} />} />
        <Route path="/dashboard/staff" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="staff" element={<StaffDashboard profile={profile} />} />} />
        <Route path="/dashboard/admin" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} requiredRole="admin" element={<AdminDashboard profile={profile} />} />} />
        
        <Route path="/dashboard/admin/role-approval" element={session ? <RoleApproval /> : <Navigate to="/" />} />
        <Route path="/dashboard/admin/users" element={session ? <UserManagement /> : <Navigate to="/" />} />

        <Route path="/create-listing" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<CreateListing />} />} />
        <Route path="/listing/:id" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<ListingDetail />} />} />
        <Route path="/my-listings" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MyListings />} />} />
        <Route path="/messages" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<MessagesPage />} />} />
        <Route path="/cart" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<CartPage />} />} />
        <Route path="/payment-status" element={<ProtectedRoute loading={loading} session={session} profile={profile} authError={authError} element={<PaymentStatus />} />} />
  
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}