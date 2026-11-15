import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Hand,
  Home,
  Loader2,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import AccessibilityToggle from '../components/AccessibilityToggle'
import { useAuth } from '../hooks/useAuth'
import type { Theme } from '../hooks/useTheme'

export type AuthMode = 'login' | 'signup' | 'forgot-password'

interface AuthProps {
  initialMode?: AuthMode
  theme: Theme
  onToggleTheme: () => void
  highContrast?: boolean
  onToggleHighContrast?: () => void
  onSuccess: () => void
  onBackToHome: () => void
  promptMessage?: string | null
}

export default function Auth({
  initialMode = 'login',
  theme,
  onToggleTheme,
  highContrast = false,
  onToggleHighContrast,
  onSuccess,
  onBackToHome,
  promptMessage = null,
}: AuthProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const { signIn, signUp, resetPassword } = useAuth()

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Status states
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Reset errors when switching modes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  // Validate email format
  const isValidEmail = (val: string) => {
    return /\S+@\S+\.\S+/.test(val)
  }

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim() || !isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.')
      return
    }
    if (!password) {
      setErrorMsg('Please enter your password.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await signIn(email, password)
      if (error) {
        setErrorMsg(error.message || 'Invalid login credentials. Please try again.')
      } else if (data?.user) {
        setSuccessMsg('Welcome back! Loading your dashboard...')
        setTimeout(() => {
          onSuccess()
        }, 500)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during login.'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).')
      return
    }
    if (!email.trim() || !isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await signUp(email, password, fullName)
      if (error) {
        setErrorMsg(error.message || 'Failed to create account. Please try again.')
      } else if (data?.user) {
        if (data.session) {
          setSuccessMsg('Account created successfully! Redirecting...')
          setTimeout(() => {
            onSuccess()
          }, 600)
        } else {
          setSuccessMsg(
            'Account created! Please check your email inbox to confirm your registration.'
          )
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during signup.'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim() || !isValidEmail(email)) {
      setErrorMsg('Please enter your registered email address.')
      return
    }

    setLoading(true)
    try {
      const { error } = await resetPassword(email)
      if (error) {
        setErrorMsg(error.message || 'Could not send recovery email. Please check the address.')
      } else {
        setSuccessMsg(
          'Password reset link sent! Check your inbox for instructions to securely recover your account.'
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send recovery email.'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Top Navigation Bar */}
      <header className="auth-topbar">
        <button
          type="button"
          className="auth-brand"
          onClick={onBackToHome}
          aria-label="Gestura home"
        >
          <span className="brand-mark" aria-hidden="true">
            <Hand size={20} strokeWidth={1.8} />
          </span>
          <div className="auth-brand-text">
            <span className="auth-brand-name">GESTURA</span>
            <span className="auth-brand-sub">American Sign Language</span>
          </div>
        </button>

        <div className="auth-topbar-actions">
          {onToggleHighContrast && (
            <AccessibilityToggle
              highContrast={highContrast}
              onToggle={onToggleHighContrast}
              showFullLabel={false}
            />
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button type="button" className="btn btn-secondary auth-home-btn" onClick={onBackToHome}>
            <Home size={15} strokeWidth={1.8} />
            Home
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="auth-main">
        <div className="auth-card-wrapper">
          {/* Decorative Eyebrow Banner */}
          <div className="auth-hero-badge">
            <Sparkles size={13} strokeWidth={2.2} />
            <span>Accessible Two-Way ASL Workspace</span>
          </div>

          <div className="auth-card">
            {/* Context Prompt Message (e.g., when redirected from protected feature) */}
            {promptMessage && (
              <div className="auth-prompt-banner" role="alert">
                <Shield size={14} />
                <span>{promptMessage}</span>
              </div>
            )}

            {/* Header Titles */}
            <div className="auth-header">
              <h1 className="auth-title">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot-password' && 'Reset Password'}
              </h1>
              <p className="auth-desc">
                {mode === 'login' &&
                  'Sign in to your GESTURA workspace to access real-time ASL recognition, text-to-sign, and ICU caregiver tools.'}
                {mode === 'signup' &&
                  'Join GESTURA for seamless two-way American Sign Language communication, 3D signing avatars, and personalized settings.'}
                {mode === 'forgot-password' &&
                  "Enter your registered email address and we'll send you a secure link to reset your password."}
              </p>
            </div>

            {/* Mode Switcher Tabs (Only for login and signup) */}
            {mode !== 'forgot-password' && (
              <div className="auth-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => switchMode('login')}
                  aria-selected={mode === 'login'}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => switchMode('signup')}
                  aria-selected={mode === 'signup'}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Alert Notifications */}
            {errorMsg && (
              <div className="auth-alert error" role="alert">
                <AlertCircle size={15} className="alert-icon" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="auth-alert success" role="alert">
                <CheckCircle2 size={15} className="alert-icon" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form className="auth-form" onSubmit={handleLogin} noValidate>
                <div className="auth-input-group">
                  <label htmlFor="login-email" className="auth-label">
                    Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div className="auth-label-row">
                    <label htmlFor="login-password" className="auth-label">
                      Password
                    </label>
                    <button
                      type="button"
                      className="auth-link-btn"
                      onClick={() => switchMode('forgot-password')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-options">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="auth-checkbox"
                    />
                    <span>Remember me on this device</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary btn-lg auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} strokeWidth={2} />
                    </>
                  )}
                </button>

                <div className="auth-switch-footer">
                  <span>Don't have an account yet?</span>
                  <button
                    type="button"
                    className="auth-switch-btn"
                    onClick={() => switchMode('signup')}
                  >
                    Create an account
                  </button>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form className="auth-form" onSubmit={handleSignUp} noValidate>
                <div className="auth-input-group">
                  <label htmlFor="signup-name" className="auth-label">
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <User size={16} className="auth-input-icon" />
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-email" className="auth-label">
                    Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-confirm-password" className="auth-label">
                    Confirm Password
                  </label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight size={16} strokeWidth={2} />
                    </>
                  )}
                </button>

                <div className="auth-switch-footer">
                  <span>Already have a GESTURA account?</span>
                  <button
                    type="button"
                    className="auth-switch-btn"
                    onClick={() => switchMode('login')}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot-password' && (
              <form className="auth-form" onSubmit={handleForgotPassword} noValidate>
                <div className="auth-input-group">
                  <label htmlFor="forgot-email" className="auth-label">
                    Registered Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-lg auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Sending instructions...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions
                      <ArrowRight size={16} strokeWidth={2} />
                    </>
                  )}
                </button>

                <div className="auth-switch-footer">
                  <button
                    type="button"
                    className="auth-switch-btn back-btn"
                    onClick={() => switchMode('login')}
                  >
                    <ArrowLeft size={14} />
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Privacy & Trust Badge */}
          <div className="auth-trust-note">
            <Shield size={13} strokeWidth={2} />
            <span>End-to-end secure authentication powered by Supabase Auth</span>
          </div>
        </div>
      </main>
    </div>
  )
}
