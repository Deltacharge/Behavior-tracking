import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Activity, Flame, PanelLeftClose, PanelLeftOpen,
  Hexagon, Radio, ExternalLink,
} from 'lucide-react';
import SessionsPage from './pages/SessionsPage.jsx';
import HeatmapPage from './pages/HeatmapPage.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';
import { apiFetch } from './utils/api.js';
import { formatDateLong } from './utils/dateUtils.js';

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

function NavItem({ to, icon: Icon, label, collapsed, exact }) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      title={collapsed ? label : undefined}
    >
      <Icon className="nav-icon" size={16} />
      <span className="nav-label">{label}</span>
    </NavLink>
  );
}

function Stat({ value, label, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '6px 14px',
      minWidth: 78,
      textAlign: 'center',
    }}>
      <div className="display-num" style={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.1 }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(new Date());

  // Tick date every 30 seconds
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Real WebSocket — live event counter
  useWebSocket((msg) => {
    if (msg.type === 'new_events') {
      setLiveCount((c) => c + msg.count);
      setPulsing(true);
      setTimeout(() => setPulsing(false), 700);
    }
  });

  // Real stats from API, refresh whenever live counter increments
  useEffect(() => {
    apiFetch('/api/sessions/stats').then(setStats).catch(() => {});
  }, [liveCount]);

  const sidebarW = collapsed ? 64 : 232;
  const pageTitle = location.pathname === '/heatmap' ? 'Heatmap' : 'Sessions';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside
        className={collapsed ? 'collapsed' : ''}
        style={{
          width: sidebarW,
          minWidth: sidebarW,
          background: 'rgba(15,15,31,0.7)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width .2s ease, min-width .2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 10,
          borderBottom: '1px solid var(--border)',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                flexShrink: 0,
              }}>
                <Hexagon size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <div className="display" style={{ fontWeight: 700, fontSize: 14 }}>CausalFunnel</div>
                <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: -1, letterSpacing: 0.5 }}>ANALYTICS</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Hexagon size={14} color="#fff" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 0', flex: 1 }}>
          {!collapsed && (
            <div style={{ padding: '6px 20px 8px', fontSize: 10, color: 'var(--muted2)', letterSpacing: 1.2, fontWeight: 600 }}>
              WORKSPACE
            </div>
          )}
          <NavItem to="/" icon={Activity} label="Sessions" collapsed={collapsed} exact />
          <NavItem to="/heatmap" icon={Flame} label="Heatmap" collapsed={collapsed} />
        </nav>

        {/* Live stream widget + collapse button */}
        <div style={{ padding: collapsed ? 8 : 12 }}>
          {!collapsed ? (
            <div style={{
              background: 'linear-gradient(180deg, rgba(52,211,153,0.06), rgba(52,211,153,0.02))',
              border: '1px solid rgba(52,211,153,0.18)',
              borderRadius: 12,
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className={pulsing ? 'live-dot-on' : ''}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: pulsing ? 'var(--accent2)' : '#2a6a52',
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: 0.3 }}>LIVE STREAM</span>
              </div>
              <div className="display-num" style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: 'var(--accent2)' }}>
                {String(liveCount).padStart(3, '0')}
              </div>
              <div style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 2 }}>events this session</div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }} title={`${liveCount} live events`}>
              <Radio size={16} color={pulsing ? 'var(--accent2)' : 'var(--muted)'} className={pulsing ? 'live-dot-on' : ''} />
            </div>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              marginTop: 10, width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '8px 0',
              color: 'var(--muted)',
              borderRadius: 8,
              fontSize: 12,
              transition: 'background .15s ease, color .15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <><PanelLeftClose size={14} /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'rgba(7,7,15,0.7)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '16px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
        }}>
          <div>
            <div className="display" style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>{pageTitle}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatDateLong(now)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={`${BACKEND_URL}/demo`}
              target="_blank"
              rel="noopener noreferrer"
              className="chip-btn"
              style={{ padding: '8px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ExternalLink size={13} /> Demo Website
            </a>
            {stats && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Stat value={stats.totalSessions} label="Sessions" accent="var(--accent-glow)" />
                <Stat value={stats.totalEvents} label="Events" accent="var(--accent2)" />
                <Stat value={stats.recentSessions} label="Active" accent="var(--accent3)" />
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<SessionsPage />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
