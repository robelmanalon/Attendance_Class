import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, logoutUser, resetPassword } from '../firebase/auth';
import { updateUser } from '../services/userService';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function Profile() {
  const { user, profile, setProfile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [starred, setStarred] = useState('••••••••');
  const [signature, setSignature] = useState('');
  const [sigBusy, setSigBusy] = useState(false);

  useEffect(() => {
    if (profile?.signature) setSignature(profile.signature);
  }, [profile?.signature]);

  const processSignatureFile = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file selected.'));
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_W = 360;
          const MAX_H = 240;
          const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const { data } = imageData;
          const threshold = 230;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const saveSignature = async (next) => {
    setSigBusy(true);
    try {
      await updateUser(user.uid, {
        name: profile?.name || user?.displayName || '',
        email: user?.email || '',
        signature: next.dataUrl,
        signatureWidth: next.width,
        signatureHeight: next.height,
      });
      setSignature(next.dataUrl);
      setProfile((p) => ({ ...p, signature: next.dataUrl, signatureWidth: next.width, signatureHeight: next.height }));
      push('Signature saved.', 'success');
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to save signature.', 'error');
    } finally {
      setSigBusy(false);
    }
  };

  const handleSignatureFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const next = await processSignatureFile(file);
      await saveSignature(next);
    } catch (err) {
      console.error(err);
      push(err.message || 'Could not read that image.', 'error');
    }
  };

  const handleRemoveSignature = async () => {
    setSigBusy(true);
    try {
      await updateUser(user.uid, {
        name: profile?.name || user?.displayName || '',
        email: user?.email || '',
        signature: '',
        signatureWidth: null,
        signatureHeight: null,
      });
      setSignature('');
      setProfile((p) => ({ ...p, signature: '', signatureWidth: null, signatureHeight: null }));
      push('Signature removed.', 'success');
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to remove signature.', 'error');
    } finally {
      setSigBusy(false);
    }
  };

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      push('Name cannot be empty.', 'warning');
      return;
    }
    setBusy(true);
    try {
      await updateUserProfile({ name: name.trim() });
      if (user?.uid) await updateUser(user.uid, { name: name.trim() });
      setProfile((p) => ({ ...p, name: name.trim() }));
      push('Profile updated.', 'success');
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to update profile.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!user?.email) return;
    setPasswordBusy(true);
    try {
      await resetPassword(user.email);
      push('Password reset email sent to your inbox.', 'success');
    } catch (err) {
      console.error(err);
      push(err.message || 'Failed to send reset email.', 'error');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Profile</h2>
          <p>Manage your account details.</p>
        </div>
      </div>

      <div className="card card-pad mb-3">
        <div className="profile-head">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h3>{user?.displayName || profile?.name || 'Teacher'}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Edit Profile</h3>
        <form className="form-grid" onSubmit={handleSaveName}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              defaultValue={user?.displayName || profile?.name || ''}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={user?.email || ''} disabled />
          </label>
          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Signature</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Your signature will appear on the class attendance record PDF when you export reports. The background
          of the image you upload is removed automatically so only your signature remains — clear and clean.
        </p>
        <div className="profile-head" style={{ gap: 16 }}>
          {signature ? (
            <img
              src={signature}
              alt="Your signature"
              style={{ height: 56, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }}
            />
          ) : (
            <div
              className="profile-avatar"
              style={{ background: '#eef2ff', color: '#6366f1', fontSize: 11, width: 84, height: 56, borderRadius: 6 }}
            >
              No signature
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer', margin: 0 }}>
              {sigBusy ? 'Uploading...' : signature ? 'Replace Signature' : 'Upload Signature'}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={sigBusy}
                onChange={handleSignatureFile}
              />
            </label>
            {signature && (
              <button className="btn btn-danger-ghost" onClick={handleRemoveSignature} disabled={sigBusy}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card card-pad mt-3">
        <h3 style={{ marginBottom: 14 }}>Security</h3>
        <div className="flex-between">
          <div>
            <div>
              <strong>Password</strong>
            </div>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {starred}
            </span>
          </div>
          <button className="btn btn-ghost" onClick={handleReset} disabled={passwordBusy}>
            {passwordBusy ? 'Sending...' : 'Reset Password'}
          </button>
        </div>
      </div>

      <div className="card card-pad mt-3">
        <div className="flex-between">
          <div>
            <div>
              <strong>Log out</strong>
            </div>
            <span className="muted" style={{ fontSize: 12.5 }}>
              End this session on this device.
            </span>
          </div>
          <button className="btn btn-danger-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}