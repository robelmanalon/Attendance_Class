import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, resetPassword } from '../firebase/auth';
import Modal from '../components/Modal';

function getErrorMessage(err) {
  const code = err?.code || '';
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
  };
  return map[code] || err?.message || 'Failed to log in.';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await loginUser(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openReset = () => {
    setResetEmail(email);
    setResetMsg('');
    setResetErr('');
    setResetOpen(true);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg('');
    setResetErr('');
    setResetBusy(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetMsg('Password reset email sent. Check your inbox.');
      setResetEmail('');
    } catch (err) {
      setResetErr(err?.message || 'Could not send reset email.');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">CT</div>
          <div>
            <strong>ClassTrack</strong>
            <span>Class Attendance Management System</span>
          </div>
        </div>
        <h2>Welcome back</h2>
        <p>Sign in to manage your classes and attendance.</p>

        {error && <div className="alert alert-danger mb-2">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-extra mt-3">
          <button className="btn btn-ghost btn-sm" onClick={openReset}>
            Forgot password?
          </button>
        </div>
        <div className="auth-switch">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password"
        width="420px"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleReset} disabled={resetBusy || !resetEmail.trim()}>
              {resetBusy ? 'Sending...' : 'Send Reset Email'}
            </button>
          </>
        }
      >
        <p className="modal-text mb-2">
          Enter your account email and we will send you a link to reset your password.
        </p>
        <form onSubmit={handleReset}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              autoFocus
            />
          </label>
        </form>
        {resetMsg && <div className="alert alert-success mt-2">{resetMsg}</div>}
        {resetErr && <div className="alert alert-danger mt-2">{resetErr}</div>}
      </Modal>
    </div>
  );
}