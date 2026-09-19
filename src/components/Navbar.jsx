import { useLocation } from 'react-router-dom';
import { IconMenu } from './icons';

const titles = {
  '/': 'Dashboard',
  '/classes': 'Classes',
  '/students': 'Students',
  '/attendance': 'Attendance',
  '/attendance-history': 'Attendance History',
  '/reports': 'Reports',
  '/profile': 'Profile',
};

export default function Navbar({ onMenu }) {
  const location = useLocation();
  const title = titles[location.pathname] || 'ClassTrack';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="navbar">
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Open menu">
        <IconMenu size={22} />
      </button>
      <div className="navbar-title">
        <h1>{title}</h1>
        <span>{today}</span>
      </div>
    </header>
  );
}