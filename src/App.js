import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./supabase";
import { clearAuthIntent, normalizeRole, readAuthIntent } from "./auth";

// Page Imports
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import RolePicker from "./pages/RolePicker";
import CreateListing from "./pages/CreateListing";
import ListingDetail from "./pages/ListingDetail";
import MyListings from "./pages/MyListings";
import MessagesPage from "./pages/Messages/MessagesPage";

// Dashboard Imports
import StudentDashboard from "./pages/dashboards/StudentDashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSession = async (nextSession) => {
      setSession(nextSession);
      
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. Fetch profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", nextSession.user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingProfile) {
          setProfile(existingProfile);
        } else {
          // 2. Create profile if it doesn't exist
          const authIntent = readAuthIntent();
          const role = normalizeRole(nextSession.user?.user_metadata?.role) || normalizeRole(authIntent?.role) || 'student';
          
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert([{ 
              id: nextSession.user.id, 
              full_name: nextSession.user?.user_metadata?.full_name || "New Student", 
              role: role,
              campus: 'Main Campus'
            }])
            .select("*")
            .maybeSingle();

          if (insertError) throw insertError;
          setProfile(newProfile);
        }
      } catch (err) {
        console.error("Auth System Error:", err.message);
      } finally {
        // This is the most important line - it kills the loading screen
        setLoading(false);
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session: cur } }) => {
      syncSession(cur);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      syncSession(s);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const getDashboardPath = (role) => {
    if (role === "student") return "/dashboard/student";
    if (role === "admin") return "/dashboard/admin";
    return "/complete-profile";
  };

  if (loading) {
    return (
      <main style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#fdfaf5'}}>
        <p style={{color: '#666'}}>Loading UniMart...</p>
      </main>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={!session ? <LandingPage /> : <Navigate to={getDashboardPath(profile?.role)} replace />} />
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to={getDashboardPath(profile?.role)} replace />} />
        <Route path="/complete-profile" element={<RolePicker session={session} profile={profile} onProfileCreated={setProfile} />} />
        
        {/* Student Dashboard & Actions */}
        <Route path="/dashboard/student" element={session ? <StudentDashboard profile={profile} /> : <Navigate to="/" />} />
        <Route path="/create-listing" element={session ? <CreateListing /> : <Navigate to="/" />} />
        <Route path="/listing/:id" element={session ? <ListingDetail /> : <Navigate to="/" />} />
        <Route path="/my-listings" element={session ? <MyListings /> : <Navigate to="/" />} />
        <Route path="/messages" element={session ? <MessagesPage profile={profile} /> : <Navigate to="/" />} />
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}