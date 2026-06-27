import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, ArrowRight, Loader, ArrowLeft, MailCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data?.session) {
          onLoginSuccess(data.session);
        }
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_login: true,
            },
          },
        });
        if (error) throw error;
        
        if (data?.user) {
          // If native confirmation is enabled, session is usually empty/null on signup.
          setSuccessMsg(`Signup successful! A confirmation email has been sent to ${email}. Please check your inbox and verify your email to log in.`);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        setSuccessMsg(`Password reset link sent! Check your email inbox at ${email} to set a new password.`);
        setEmail('');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let displayError = 'An error occurred. Please try again.';
      if (err) {
        if (typeof err === 'string' && err.trim() !== '') {
          displayError = err;
        } else if (typeof err === 'object') {
          displayError = err.message || err.error_description || err.error || JSON.stringify(err);
          if (displayError === '{}' || !displayError) {
            displayError = 'Invalid credentials or request failed. Please check your inputs.';
          }
        }
      }

      // If we are in signup mode and the error is about registration/exists/credentials
      if (mode === 'signup' && (
        displayError.toLowerCase().includes('already registered') || 
        displayError.toLowerCase().includes('already exists') ||
        displayError.toLowerCase().includes('credentials')
      )) {
        displayError = 'This email has already been invited or registered. If you were invited, please use the "Forgot Password" link on the Sign In tab to set your password and complete your registration.';
      }

      setErrorMsg(displayError);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-overlay">
      <div className="login-background-glows">
        <div className="glow-1" />
        <div className="glow-2" />
      </div>

      <div className="login-card">
        <div className="login-logo-container">
          <div className="login-logo-icon">
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="login-title">Docify</h1>
        <p className="login-subtitle">
          {mode === 'signin' && 'Internal documentation workspace. Please sign in.'}
          {mode === 'signup' && 'Create your new Docify account. Email verification is required.'}
          {mode === 'forgot' && 'Reset your account password via email link.'}
        </p>

        {mode !== 'forgot' && !successMsg && (
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab-btn ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => toggleMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-tab-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => toggleMode('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        {successMsg ? (
          <div className="login-success-container" style={{ textAlign: 'center', padding: '10px 0' }}>
            <div className="login-success-info">
              <MailCheck size={40} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{successMsg}</p>
            </div>
            <button
              type="button"
              className="login-submit-btn"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={() => {
                setSuccessMsg(null);
                setMode('signin');
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'forgot' && (
              <button
                type="button"
                className="login-back-link"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '10px',
                  alignSelf: 'flex-start',
                  padding: 0
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            )}

            <div className="form-group-login">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="developer@emotist.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            {mode !== 'forgot' && (
              <div className="form-group-login">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="login-password">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      className="login-forgot-pwd"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg(null);
                      }}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="form-group-login">
                <label htmlFor="login-confirm-password">Confirm Password</label>
                <input
                  id="login-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {errorMsg && (
              <div className="login-error">
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Sign Up'}
                    {mode === 'forgot' && 'Send Reset Link'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <p className="login-footer-text">
          Access restricted. Only users registered or added by the administrator can access this website.
        </p>
      </div>
    </div>
  );
};
