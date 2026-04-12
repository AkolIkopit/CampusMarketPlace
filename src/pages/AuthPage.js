import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import './AuthPage.css';

const ROLES = ['Student', 'Trade Facility Staff', 'Admin'];

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'Student',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Google confirmation popup
  const [showGoogleConfirm, setShowGoogleConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState('');

  // Clear messages when switching modes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [mode]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const switchMode = (newMode) => {
    setSearchParams({ mode: newMode });
  };

  // ====================== EMAIL LOGIN / SIGNUP ======================
  const validate = () => {
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';

    if (mode === 'signup') {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName,
              role: form.role,
            },
          },
        });
        if (signUpError) throw signUpError;
        setSuccess('Account created! Check your email to confirm your address before logging in.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;
        navigate('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ====================== GOOGLE SIGN IN ======================
  const handleGoogleClick = () => {
    setPendingRole(form.role);
    setShowGoogleConfirm(true);
  };

  const confirmGoogleLogin = async () => {
    setShowGoogleConfirm(false);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Failed to start Google login');
      setLoading(false);
    }
  };

  // Auto-create profile after Google redirect
  useEffect(() => {
    const handlePostGoogleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();   // Better than .single() to avoid 406 errors

      if (existing) {
        navigate('/');
        return;
      }

      // Get full name from Google
      const googleName = session.user.user_metadata?.full_name ||
                        session.user.user_metadata?.name ||
                        session.user.email?.split('@')[0] || 'Student';

      // Create profile
      const { error } = await supabase
        .from('profiles')
        .insert([{
          id: session.user.id,
          full_name: googleName,
          role: (pendingRole || form.role).toLowerCase(),
        }]);

      if (error) {
        console.error("Profile insert error:", error);
        setError('Failed to create your profile. Please try again.');
      } else {
        navigate('/');
      }
    };

    // Small delay to let Supabase session settle after Google redirect
    const timer = setTimeout(() => {
      if (mode === 'signup') {
        handlePostGoogleAuth();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate, pendingRole, form.role, mode]);

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <a href="/" className="nav-logo auth-logo">
            <span className="nav-logo-mark">CS</span>
            <span className="nav-logo-text">CampusSwap</span>
          </a>

          <div className="auth-left-content">
            <h2 className="auth-tagline">
              The campus<br />
              <em>marketplace</em><br />
              you've been waiting for.
            </h2>
            <p className="auth-tagline-sub">
              Buy, sell, and trade with fellow students securely — through our campus trade hub.
            </p>

            <div className="auth-features">
              {[
                { icon: '🔒', text: 'Verified student-only access' },
                { icon: '🏪', text: 'Safe campus trade facility' },
                { icon: '💬', text: 'In-app chat & negotiation' },
                { icon: '💳', text: 'Secure online payments' },
              ].map((f) => (
                <div key={f.text} className="auth-feature">
                  <span className="auth-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-deco" aria-hidden="true">
            <div className="auth-deco-card">
              <span>📚</span>
              <div>
                <p>Chemistry Textbook</p>
                <p className="deco-price">R 220</p>
              </div>
            </div>
            <div className="auth-deco-card auth-deco-card-2">
              <span>💻</span>
              <div>
                <p>MacBook Air M1</p>
                <p className="deco-price">R 11,500</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          {/* Mode Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Sign up
            </button>
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="auth-form-sub">
              {mode === 'login'
                ? 'Log in to browse listings and manage your trades.'
                : 'Join thousands of students on CampusSwap.'}
            </p>
          </div>

          {/* Google Button */}
          <button
            className="btn-oauth"
            onClick={handleGoogleClick}
            disabled={loading}
            type="button"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {/* Main Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <>
                <div className="field-row">
                  <FormField
                    label="Full name"
                    type="text"
                    placeholder="Jane Doe"
                    value={form.fullName}
                    onChange={(v) => setField('fullName', v)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <div className="role-picker">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`role-btn ${form.role === r ? 'active' : ''}`}
                        onClick={() => setField('role', r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <FormField
              label="University email"
              type="email"
              placeholder="student@wits.ac.za"
              value={form.email}
              onChange={(v) => setField('email', v)}
            />

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap input-icon-right">
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <FormField
                label="Confirm password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={(v) => setField('confirmPassword', v)}
              />
            )}

            {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
            {success && <div className="alert alert-success"><span>✓</span> {success}</div>}

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : mode === 'login' ? 'Log in to CampusSwap' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? (
              <>Don't have an account? <button className="auth-switch-btn" onClick={() => switchMode('signup')}>Sign up free</button></>
            ) : (
              <>Already have an account? <button className="auth-switch-btn" onClick={() => switchMode('login')}>Log in</button></>
            )}
          </p>
        </div>
      </div>

      {/* Google Role Confirmation Popup */}
      {showGoogleConfirm && (
        <div className="google-confirm-overlay">
          <div className="google-confirm-modal">
            <h3>Confirm Your Role</h3>
            <p>
              You have selected <strong>{pendingRole}</strong> as your role.<br />
              Is this correct?
            </p>
            <div className="confirm-buttons">
              <button 
                onClick={() => setShowGoogleConfirm(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={confirmGoogleLogin} 
                className="btn-primary"
              >
                Yes, Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ====================== SUB COMPONENTS ====================== */

const FormField = ({ label, type, placeholder, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="input-wrap">
      <input
        className="form-input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const Eye = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default AuthPage;