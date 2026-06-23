import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, ArrowRight, Loader } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        onLoginSuccess(data.session);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
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

        <h1 className="login-title">Emotist Docs</h1>
        <p className="login-subtitle">
          Internal documentation workspace. Please sign in with your credentials to access the contents.
        </p>

        <form onSubmit={handleSignIn} className="login-form">
          <div className="form-group-login">
            <label htmlFor="login-email">Email Address</label>
            <div style={{ position: 'relative' }}>
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
          </div>

          <div className="form-group-login">
            <label htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
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
          </div>

          {errorMsg && (
            <div className="login-error">
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="login-footer-text">
          Access restricted. Only users registered or added by the administrator can access this website.
        </p>
      </div>
    </div>
  );
};
