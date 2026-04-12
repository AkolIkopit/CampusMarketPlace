import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "./supabase";
import {
  clearAuthIntent,
  getDefaultFullName,
  normalizeRole,
  readAuthIntent,
} from "./auth";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import RolePicker from "./pages/RolePicker";

import StudentDashboard from "./pages/dashboards/StudentDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";

async function fetchProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return data || null;
}

async function syncExistingProfile(profile) {
  const normalizedRole = normalizeRole(profile?.role);

  if (!normalizedRole || normalizedRole === profile.role) {
    return profile;
  }

  const { data } = await supabase
    .from("profiles")
    .update({ role: normalizedRole })
    .eq("id", profile.id)
    .select("*")
    .maybeSingle();

  return data || { ...profile, role: normalizedRole };
}

async function ensureProfile(user) {
  const existingProfile = await fetchProfile(user.id);

  if (existingProfile) {
    clearAuthIntent();
    return syncExistingProfile(existingProfile);
  }

  const authIntent = readAuthIntent();
  const role =
    normalizeRole(user?.user_metadata?.role) ||
    normalizeRole(authIntent?.role);
  const fullName = getDefaultFullName(user);

  if (!role || !fullName) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .insert([
      {
        id: user.id,
        full_name: fullName,
        role,
      },
    ])
    .select("*")
    .maybeSingle();

  if (data) {
    clearAuthIntent();
    return data;
  }

  return fetchProfile(user.id);
}

function getDashboardPath(role) {
  if (role === "student") return "/dashboard/student";
  if (role === "staff") return "/dashboard/staff";
  if (role === "admin") return "/dashboard/admin";
  return null;
}

function LoadingScreen() {
  return <div style={styles.loading}>Loading...</div>;
}

function HomeRoute({ loading, session, profileRole }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LandingPage />;
  }

  return <Navigate to={getDashboardPath(profileRole) || "/complete-profile"} replace />;
}

function AuthRoute({ loading, session, profileRole }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthPage />;
  }

  return <Navigate to={getDashboardPath(profileRole) || "/complete-profile"} replace />;
}

function CompleteProfileRoute({ loading, session, profile, setProfile }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const profileRole = normalizeRole(profile?.role);

  if (profileRole) {
    return <Navigate to={getDashboardPath(profileRole)} replace />;
  }

  return (
    <RolePicker
      session={session}
      profile={profile}
      onProfileCreated={setProfile}
    />
  );
}

function ProtectedDashboardRoute({
  loading,
  session,
  profile,
  requiredRole,
  element,
}) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const profileRole = normalizeRole(profile?.role);

  if (!profileRole) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (profileRole !== requiredRole) {
    return <Navigate to={getDashboardPath(profileRole)} replace />;
  }

  return element;
}

function AppRoutes({ loading, session, profile, setProfile }) {
  const profileRole = normalizeRole(profile?.role);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeRoute
            loading={loading}
            session={session}
            profileRole={profileRole}
          />
        }
      />
      <Route
        path="/auth"
        element={
          <AuthRoute
            loading={loading}
            session={session}
            profileRole={profileRole}
          />
        }
      />
      <Route
        path="/complete-profile"
        element={
          <CompleteProfileRoute
            loading={loading}
            session={session}
            profile={profile}
            setProfile={setProfile}
          />
        }
      />
      <Route
        path="/dashboard/student"
        element={
          <ProtectedDashboardRoute
            loading={loading}
            session={session}
            profile={profile}
            requiredRole="student"
            element={<StudentDashboard profile={{ ...profile, role: profileRole }} />}
          />
        }
      />
      <Route
        path="/dashboard/staff"
        element={
          <ProtectedDashboardRoute
            loading={loading}
            session={session}
            profile={profile}
            requiredRole="staff"
            element={<StaffDashboard profile={{ ...profile, role: profileRole }} />}
          />
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedDashboardRoute
            loading={loading}
            session={session}
            profile={profile}
            requiredRole="admin"
            element={<AdminDashboard profile={{ ...profile, role: profileRole }} />}
          />
        }
      />
      <Route
        path="*"
        element={<Navigate to={session ? getDashboardPath(profileRole) || "/complete-profile" : "/"} replace />}
      />
    </Routes>
  );
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

      if (!nextSession) {
        setProfile(null);
        clearAuthIntent();
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextProfile = await ensureProfile(nextSession.user);

      if (!isMounted) return;

      setProfile(nextProfile);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      syncSession(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        syncSession(nextSession);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <AppRoutes
        loading={loading}
        session={session}
        profile={profile}
        setProfile={setProfile}
      />
    </Router>
  );
}

const styles = {
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "18px",
    color: "#6b7280",
  },
};
