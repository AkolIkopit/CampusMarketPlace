import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./supabase";
import { clearAuthIntent, getDefaultFullName, normalizeRole, readAuthIntent } from "./auth";

// Page Imports
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import RolePicker from "./pages/RolePicker";
import CreateListing from "./pages/CreateListing";
import ListingDetail from "./pages/ListingDetail";
import MyListings from "./pages/MyListings";

// Dashboard Imports
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("App.js: Initializing Auth...");

    const syncUserAndProfile = async (currentSession) => {
  try {
    if (!currentSession) {
      setProfile(null);
      return;
    }

    const user = currentSession.user;
    const authIntent = readAuthIntent();

    // 1. Fetch Profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile) {
      setProfile(existingProfile);
      clearAuthIntent();
      return;
    }

    // 2. Updated Gatekeeper Logic
    // Only block if: It's a Google Login AND no profile exists.
    // If it's Email/Password, and they got this far, they are verified.
    const isGoogle = user.app_metadata.provider === 'google';
    
    if (isGoogle && (!authIntent || authIntent.mode === "login")) {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
      clearAuthIntent();
      window.history.replaceState(null, '', '/auth?mode=login&error=Account+not+found.+Please+sign+up+first.');
      return;
    }

    // 3. Create Profile (For Signups OR Email users missing a profile)
    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || getDefaultFullName(user) || "New Student";
    
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

    if (insertError && insertError.code === '23505') {
       const { data: retry } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
       setProfile(retry);
    } else {
       setProfile(newProfile);
    }
    clearAuthIntent();

  } catch (err) {
    console.error("Critical Auth Error:", err.message);
  } finally {
    setLoading(false);
  }
};

    // Run initial check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      syncUserAndProfile(initialSession);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      console.log("App.js: Auth state changed:", _event);
      setSession(nextSession);
      syncUserAndProfile(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array is KEY here

  const getDashboardPath = (p) => {
    if (!p) return "/auth";
    const role = normalizeRole(p.role);
    if (p.application_status === "pending") return "/waiting-room";
    if (role === "admin") return "/dashboard/admin";
    if (role === "staff") return "/dashboard/staff";
    return "/dashboard/student";
  };

  // The Master Loading Switch
  if (loading) {
    return (
      <main style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#fdfaf5'}}>
        <p style={{color: '#666'}}>Initializing UniMart...</p>
      </main>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={!session ? <LandingPage /> : <Navigate to={getDashboardPath(profile)} replace />} />
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to={getDashboardPath(profile)} replace />} />
        
        <Route path="/waiting-room" element={<div style={styles.centeredPage}><h1>Request Pending</h1><p>An admin is reviewing your upgrade.</p></div>} />
        <Route path="/complete-profile" element={<RolePicker session={session} profile={profile} onProfileCreated={setProfile} />} />

        {/* Dashboards */}
        <Route path="/dashboard/student" element={session && profile?.role === 'student' ? <StudentDashboard profile={profile} /> : <Navigate to="/" />} />
        <Route path="/dashboard/staff" element={session && profile?.role === 'staff' ? <StaffDashboard profile={profile} /> : <Navigate to="/" />} />
        <Route path="/dashboard/admin" element={session && profile?.role === 'admin' ? <AdminDashboard profile={profile} /> : <Navigate to="/" />} />

        {/* Listings */}
        <Route path="/create-listing" element={session ? <CreateListing profile={profile} /> : <Navigate to="/" />} />
        <Route path="/listing/:id" element={session ? <ListingDetail profile={profile} /> : <Navigate to="/" />} />
        <Route path="/my-listings" element={session ? <MyListings profile={profile} /> : <Navigate to="/" />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const styles = {
  centeredPage: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', fontFamily: 'sans-serif' }
};