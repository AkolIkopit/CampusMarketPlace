import React, { useEffect, useState } from "react";
/*
Module: AuthPage.js
Purpose: Authentication UI for sign-in and sign-up flows.
Units: forms for email/social logins, role selection, and intent persistence
Flow: Presents login/signup forms and uses `auth` helpers to persist intent and redirect.
*/
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveAuthIntent } from "../auth";
import { supabase } from "../supabase";
import "./AuthPage.css";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [mode]);

  useEffect(() => {
    const oauthError = searchParams.get("error_description") || searchParams.get("error");
    if (!oauthError) return;
    setError(oauthError.replace(/\+/g, " "));
  }, [searchParams]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const switchMode = (nextMode) => setSearchParams({ mode: nextMode });

  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/");
  };

  const validate = () => {
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email.";
    if (!form.password) return "Password is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "signup") {
      if (!form.fullName.trim()) return "Full name is required.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // CRITICAL: App.js needs this to allow profile creation
    saveAuthIntent({ mode, role: "student" });

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: form.fullName.trim(), role: "student" },
          },
        });
        if (signUpError) throw signUpError;
        setSuccess("Account created! Check your email to confirm your address.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    saveAuthIntent({ mode, role: "student" });
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?mode=${mode}` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <aside className="auth-left">
        <header className="auth-left-inner">
          <a href="/" className="nav-logo auth-logo">
            <span className="nav-logo-mark">UM</span>
            <span className="nav-logo-text">UniMart</span>
          </a>
          <section className="auth-left-content">
            <h2 className="auth-tagline">The campus <br /> <em>marketplace</em> <br /> you&apos;ve been waiting for.</h2>
            <p className="auth-tagline-sub">Buy, sell, and trade with fellow students securely.</p>
            <div className="auth-features">
              {["Verified student access", "Safe trade facility", "In-app chat", "Secure payments"].map((text, i) => (
                <div key={text} className="auth-feature">
                  <span className="auth-feature-icon">0{i+1}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </section>
          <div className="auth-deco" aria-hidden="true">
            <div className="auth-deco-card"><span>BK</span><div><p>Chemistry Textbook</p><p className="deco-price">R 220</p></div></div>
            <div className="auth-deco-card auth-deco-card-2"><span>LP</span><div><p>MacBook Air M1</p><p className="deco-price">R 11,500</p></div></div>
          </div>
        </header>
      </aside>

      <section className="auth-right">
        <div className="auth-form-wrap">
          <button type="button" className="auth-back-btn" onClick={handleBack}><ArrowLeftIcon /> Back</button>
          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>Log in</button>
            <button type="button" className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => switchMode("signup")}>Sign up</button>
          </div>
          <h1 className="auth-form-title">{mode === "login" ? "Welcome back" : "Join UniMart"}</h1>
          <button className="btn-oauth" onClick={startGoogleLogin} disabled={loading} type="button"><GoogleIcon /> Continue with Google</button>
          <div className="auth-divider"><span>or use email</span></div>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === "signup" && (
              <FormField label="Full name" type="text" placeholder="Jane Doe" value={form.fullName} onChange={(val) => setField("fullName", val)} />
            )}
            <FormField label="University email" type="email" placeholder="student@wits.ac.za" value={form.email} onChange={(val) => setField("email", val)} />
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <input className="form-input" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setField("password", e.target.value)} />
                <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>
            </div>
            {mode === "signup" && (
              <FormField label="Confirm password" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(val) => setField("confirmPassword", val)} />
            )}
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <button className="btn-submit" type="submit" disabled={loading}>{loading ? "Processing..." : mode === "login" ? "Log in" : "Create account"}</button>
          </form>
        </div>
      </section>
    </main>
  );
};

const FormField = ({ label, type, placeholder, value, onChange }) => (
  <div className="form-group"><label className="form-label">{label}</label><div className="input-wrap"><input className="form-input" type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} /></div></div>
);

const ArrowLeftIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg> );
const Eye = () => ( <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> );
const EyeOff = () => ( <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg> );
const GoogleIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg> );

export default AuthPage;