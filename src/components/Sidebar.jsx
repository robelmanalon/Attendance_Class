import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/auth';
import { useState } from 'react';
import { InlineSpinner } from './LoadingSpinner';
import { navItems } from '../nav';
import { IconLogout } from './icons';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUser();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error(err);
      setLoggingOut(false);
    }
  };

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">CT</div>
          <div className="brand-text">
            <strong>ClassTrack</strong>
            <span>Attendance System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <item.icon size={19} className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="sidebar-user-info">
              <strong>{user?.displayName || 'Teacher'}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <InlineSpinner size={14} /> : (
              <>
                <IconLogout size={15} />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}