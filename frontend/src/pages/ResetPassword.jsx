import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.newPassword });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-brand">Invalid link</div>
          <p className="auth-sub">This reset link is missing its token. Request a new one.</p>
          <div className="auth-switch">
            <Link to="/forgot-password">Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">Set a new password</div>
        <p className="auth-sub">Choose a new password for your account.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat the password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div className="auth-switch">
          <Link to="/login">Back to log in</Link>
        </div>
      </div>
    </div>
  );
}