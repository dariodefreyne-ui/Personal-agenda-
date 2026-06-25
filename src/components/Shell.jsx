import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { APP_NAAM } from '../config/appConfig';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { luisterVoorgrond } from '../services/push';
import { IcoHome, IcoAgenda, IcoCheck, IcoHeart, IcoCog, IcoLogout } from './Icons';

const NAV = [
  { to: '/', label: 'Vandaag', Icon: IcoHome, end: true },
  { to: '/week', label: 'Week', Icon: IcoAgenda },
  { to: '/taken', label: 'Taken', Icon: IcoCheck },
  { to: '/gezondheid', label: 'Gezondheid', Icon: IcoHeart },
  { to: '/beheer', label: 'Beheer', Icon: IcoCog },
];

export default function Shell({ children }) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Voorgrondmeldingen: toon push als toast wanneer de app open staat.
  useEffect(() => {
    let stop = () => {};
    luisterVoorgrond((payload) => {
      const n = payload?.notification || {};
      toast(`${n.title || 'Melding'}${n.body ? ' — ' + n.body : ''}`);
    }).then((fn) => { stop = fn; });
    return () => stop();
  }, [toast]);

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Hoofdnavigatie">
        <div className="title" style={{ padding: '8px 12px 16px', fontWeight: 700 }}>{APP_NAAM}</div>
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}>
            <Icon /> <span>{label}</span>
          </NavLink>
        ))}
        <div className="grow" />
        <button className="navitem" onClick={() => logout().then(() => navigate('/login'))}>
          <IcoLogout /> <span>Afmelden</span>
        </button>
      </nav>

      <div className="grow" style={{ minWidth: 0 }}>
        <header className="appbar">
          <span className="title">{APP_NAAM}</span>
        </header>
        <main className="content">
          <div className="container">{children}</div>
        </main>
      </div>

      <nav className="bottomnav" aria-label="Hoofdnavigatie">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => 'navitem' + (isActive ? ' active' : '')}>
            <Icon /> <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
