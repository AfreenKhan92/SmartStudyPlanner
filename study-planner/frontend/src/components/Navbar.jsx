import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import api from '../api/axios';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/planner',   label: 'Planner' },
  { to: '/subjects',  label: 'Subjects' },
  { to: '/progress',  label: 'Progress' },
];

export default function Navbar() {
  const { user, logout }  = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location          = useLocation();
  const navigate          = useNavigate();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef  = useRef(null);
  const notifRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) && !e.target.closest('#hamburger-btn')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // ── Load notifications ────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=10');
      setNotifications(data.data || []);
      setUnread(data.unreadCount || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user, loadNotifications]);

  const handleMarkAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const TYPE_ICON = {
    missed_task:    '⚠️',
    upcoming_exam:  '📅',
    low_progress:   '📉',
    plan_complete:  '🏆',
    streak:         '🔥',
    general:        '🔔',
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-ink/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-teal flex items-center justify-center text-sm font-bold text-white shadow-glow">
            S
          </div>
          <span className="font-display font-700 text-lg text-text tracking-tight">
            Study<span className="text-accent">Flow</span>
          </span>
        </Link>

        {/* Hamburger button (mobile) */}
        <button 
          id="hamburger-btn"
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-ghost hover:text-text hover:bg-surface border border-transparent hover:border-border transition"
          onClick={() => setMobileMenuOpen(p => !p)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${location.pathname === to
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-ghost hover:text-text hover:bg-surface'
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-ghost hover:text-text hover:bg-surface transition"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <Link to="/plan" className="btn-primary text-xs px-3 py-2 hidden sm:flex">
            + New Plan
          </Link>

          {/* ── Notifications ── */}
          <div className="relative hidden sm:block" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen((p) => !p); if (!notifOpen) loadNotifications(); }}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border text-ghost hover:text-text hover:bg-surface transition"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-ink shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-text">Notifications</span>
                  {unread > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-accent hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-muted text-sm text-center py-6">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`px-4 py-3 border-b border-border/50 last:border-0 text-sm
                          ${!n.isRead ? 'bg-accent/5' : ''}`}
                      >
                        <div className="flex gap-2">
                          <span>{TYPE_ICON[n.type] || '🔔'}</span>
                          <div>
                            <p className={`leading-snug ${!n.isRead ? 'text-text' : 'text-ghost'}`}>{n.message}</p>
                            <p className="text-xs text-muted mt-0.5">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── User menu ── */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-border px-2.5 py-1.5 hover:bg-surface transition"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-teal flex items-center justify-center text-xs font-bold text-white">
                {(user?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-text leading-none">{user?.name || 'User'}</p>
                <p className="text-[11px] text-muted mt-0.5">Profile</p>
              </div>
              <span className="text-ghost">▾</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-ink shadow-xl overflow-hidden">
                <Link to="/profile"      onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-ghost hover:text-text hover:bg-surface">View Profile</Link>
                <Link to="/profile/edit" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-ghost hover:text-text hover:bg-surface">Edit Profile</Link>
                <Link to="/progress"     onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-ghost hover:text-text hover:bg-surface">Progress</Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-rose hover:bg-rose/10"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile menu drop-down ── */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden border-t border-border bg-card absolute w-full shadow-card animate-slide-up">
          <nav className="flex flex-col py-2 px-4 gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${location.pathname === to
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-ghost hover:text-text hover:bg-surface'
                  }`}
              >
                {label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            <Link to="/plan" className="px-4 py-3 text-sm font-medium text-accent hover:bg-surface rounded-xl">
              + New Plan
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
