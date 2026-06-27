import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader, KeyRound, CheckCircle2 } from 'lucide-react';

interface ResetPasswordProps {
  onSuccess: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      // Update password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { first_login: false } // Reset first_login flag if set
      });

      if (error) throw error;

      setSuccessMsg('Your password has been successfully updated! Redirecting to Docify...');
      
      // Wait 2 seconds, then transition to app
      setTimeout(() => {
        // Clear recovery hash from URL to prevent re-triggering on reload
        if (window.history.pushState) {
          window.history.pushState('', document.title, window.location.pathname + window.location.search);
        } else {
          window.location.hash = '';
        }
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Password update error:', err);
      setErrorMsg(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <span className="login-logo-text">Docify</span>
          </div>
          <h1 className="login-title">Reset Your Password</h1>
          <p className="login-subtitle">
            Enter your new secure password below to regain access to your account.
          </p>
        </div>

        {successMsg ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--success-color)', marginBottom: '16px' }}>
              <CheckCircle2 size={48} />
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 }}>
              {successMsg}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group-login">
              <label htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ width: '100%' }}
                autoFocus
              />
            </div>

            <div className="form-group-login">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                style={{ width: '100%' }}
              />
            </div>

            {errorMsg && (
              <div className="login-error">
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  <span>Saving Password...</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
