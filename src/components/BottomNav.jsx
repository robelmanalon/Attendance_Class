import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { primaryNav, moreNav } from '../nav';
import { IconMenu } from './icons';

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [moreOpen]);

  return (
    <nav className="bottom-nav" ref={ref}>
      {primaryNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}
          onClick={() => setMoreOpen(false)}
        >
          <item.icon size={22} className="bn-icon" />
          <span className="bn-label">{item.label}</span>
        </NavLink>
      ))}

      <div className="bn-more">
        <button
          type="button"
          className={`bn-item ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
        >
          <IconMenu size={22} className="bn-icon" />
          <span className="bn-label">More</span>
        </button>

        {moreOpen && (
          <div className="more-sheet" role="menu">
            {moreNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="more-item"
                onClick={() => setMoreOpen(false)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}