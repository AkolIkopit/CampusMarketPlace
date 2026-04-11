import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

type Mode = 'login' | 'signup'
type Role = 'Student' | 'Trade Facility Staff' | 'Admin'

interface FormState {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  studentNumber: string
  role: Role
}

const ROLES: Role[] = ['Student', 'Trade Facility Staff', 'Admin']

const AuthPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode: Mode = (searchParams.get('mode') as Mode) ?? 'login'

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    studentNumber: '',
    role: 'Student',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setError(null)
    setSuccess(null)
  }, [mode])

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const switchMode = (m: Mode) => {
    setSearchParams({ mode: m })
  }

  const validate = (): string | null => {
    if (!form.email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email.'
    if (!form.password) return 'Password is required.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (mode === 'signup') {
      if (!form.fullName.trim()) return 'Full name is required.'
      if (!form.studentNumber.trim()) return 'Student number is required.'
      if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName,
              student_number: form.studentNumber,
              role: form.role,
            },
          },
        })
        if (signUpError) throw signUpError
        setSuccess(
          'Account created! Check your email to confirm your address before logging in.'
        )
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (signInError) throw signInError
        navigate('/')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <Link to="/" className="nav-logo auth-logo">
            <span className="nav-logo-mark">CS</span>
            <span className="nav-logo-text">CampusSwap</span>
          </Link>

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

          {/* Decorative cards */}
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

      {/* Right panel — form */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          {/* Mode tabs */}
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

          {/* Google OAuth */}
          <button
            className="btn-oauth"
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {/* Form */}
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
                    autoComplete="name"
                  />
                  <FormField
                    label="Student number"
                    type="text"
                    placeholder="e.g. 2456789"
                    value={form.studentNumber}
                    onChange={(v) => setField('studentNumber', v)}
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
              autoComplete="email"
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
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
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
                autoComplete="new-password"
              />
            )}

            {mode === 'login' && (
              <div className="forgot-row">
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success" role="status">
                <span>✓</span> {success}
              </div>
            )}

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : mode === 'login' ? (
                'Log in to CampusSwap'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchMode('signup')}>
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchMode('login')}>
                  Log in
                </button>
              </>
            )}
          </p>

          <p className="auth-terms">
            By continuing, you agree to CampusSwap's Terms of Service and Privacy Policy.
            This platform is exclusively for registered university students.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────── */

interface FormFieldProps {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}

const FormField: React.FC<FormFieldProps> = ({
  label, type, placeholder, value, onChange, autoComplete,
}) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="input-wrap">
      <input
        className="form-input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
    </div>
  </div>
)

const Eye = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default AuthPage
