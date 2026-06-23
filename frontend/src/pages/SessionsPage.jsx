import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, X, MousePointerClick, Eye, FileText,
  Clock, ChevronRight, Filter, TrendingUp,
} from 'lucide-react';
import { apiFetch } from '../utils/api.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { timeAgo, durationStr, fmtTime } from '../utils/dateUtils.js';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

const TYPE_META = {
  page_view:    { dot: 'var(--accent2)',     bg: 'rgba(52,211,153,0.06)',  border: 'rgba(52,211,153,0.25)',  label: 'PAGE VIEW' },
  click:        { dot: 'var(--accent-glow)', bg: 'rgba(99,102,241,0.06)',  border: 'rgba(99,102,241,0.25)',  label: 'CLICK'     },
  scroll_depth: { dot: 'var(--accent3)',     bg: 'rgba(251,191,36,0.06)',  border: 'rgba(251,191,36,0.25)',  label: 'SCROLL'    },
  custom:       { dot: 'var(--danger)',      bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.25)', label: 'CUSTOM'    },
};

function shortPath(url) {
  try { return new URL(url).pathname + (new URL(url).hash || ''); } catch { return url; }
}

// ── MiniStat bento card ───────────────────────────────────────────────────────
function MiniStat({ icon, label, value, trend, tint }) {
  return (
    <div className="bento bento-hover" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          color: tint, display: 'inline-flex', padding: 6, borderRadius: 8,
          background: `color-mix(in srgb, ${tint} 12%, transparent)`,
        }}>{icon}</span>
        <span style={{
          fontSize: 11, color: 'var(--accent2)',
          background: 'rgba(52,211,153,0.08)', padding: '2px 6px', borderRadius: 4,
        }}>{trend}</span>
      </div>
      <div className="display-num" style={{ fontSize: 26, fontWeight: 700, marginTop: 14, letterSpacing: -1 }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

// ── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ color, label, muted, icon }) {
  const c = muted ? 'var(--muted)' : color;
  return (
    <span style={{
      fontSize: 11, padding: '3px 8px', borderRadius: 6,
      color: c,
      backgroundColor: muted
        ? 'rgba(255,255,255,0.04)'
        : color === 'var(--accent2)'
          ? 'rgba(52,211,153,0.10)'
          : color === 'var(--accent-glow)'
            ? 'rgba(99,102,241,0.12)'
            : 'transparent',
      border: `1px solid ${muted ? 'var(--border)' : 'transparent'}`,
      display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500,
    }}>
      {icon}{label}
    </span>
  );
}

// ── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', width: '100%',
        background: active
          ? 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(99,102,241,0.02))'
          : 'rgba(255,255,255,0.015)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'var(--border)'}`,
        borderRadius: 12, padding: '13px 14px',
        transition: 'border-color .15s, background .15s, transform .15s',
        position: 'relative',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: -1, top: 12, bottom: 12,
          width: 3, borderRadius: 2, background: 'var(--accent-glow)',
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ ...MONO, fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>
            {session.sessionId.slice(0, 18)}…
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> {timeAgo(session.lastSeen)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="display-num" style={{ fontSize: 22, fontWeight: 700, color: active ? 'var(--accent-glow)' : 'var(--text)', lineHeight: 1 }}>
            {session.eventCount}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: 0.3 }}>EVENTS</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill color="var(--accent2)" icon={<Eye size={10} />} label={`${session.pageViews}`} />
        <Pill color="var(--accent-glow)" icon={<MousePointerClick size={10} />} label={`${session.clicks}`} />
        {session.pagesVisited?.length > 0 && (
          <Pill muted icon={<FileText size={10} />} label={`${session.pagesVisited.length} pages`} />
        )}
        {active && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--accent-glow)' }} />}
      </div>
    </button>
  );
}

// ── Skeleton loading cards ────────────────────────────────────────────────────
function SkeletonCards() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ borderRadius: 12, padding: '13px 14px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)' }}>
          {[80, 55, 65].map((w, j) => (
            <div key={j} className="skeleton" style={{ height: j === 0 ? 11 : 9, width: `${w}%`, marginBottom: 8 }} />
          ))}
        </div>
      ))}
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Eye size={20} />
      </div>
      <div style={{ marginTop: 14, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>No sessions yet</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Open the demo page to start tracking events.</div>
    </div>
  );
}

// ── Summary pill in journey panel ─────────────────────────────────────────────
function SummaryPill({ v, l, color }) {
  return (
    <span style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      borderRadius: 8, padding: '6px 12px', fontSize: 12,
      display: 'inline-flex', alignItems: 'baseline', gap: 6,
    }}>
      <strong className="display-num" style={{ color, fontSize: 14 }}>{v}</strong>
      <span style={{ color: 'var(--muted)', fontSize: 11, letterSpacing: 0.3 }}>{l.toUpperCase()}</span>
    </span>
  );
}

// ── Single event row ──────────────────────────────────────────────────────────
function TimelineRow({ event, delay }) {
  const c = TYPE_META[event.eventType] || TYPE_META.custom;
  const pathname = shortPath(event.pageUrl);
  return (
    <div className="slide-in" style={{ position: 'relative', marginBottom: 10, animationDelay: `${delay}s` }}>
      <div style={{
        position: 'absolute', left: -22, top: 8,
        width: 12, height: 12, borderRadius: '50%',
        background: c.dot,
        boxShadow: `0 0 0 3px var(--card), 0 0 12px ${c.dot}`,
      }} />
      <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: c.dot }}>{c.label}</span>
          <span style={{ ...MONO, fontSize: 10, color: 'var(--muted)' }}>{fmtTime(event.timestamp)}</span>
        </div>
        <div style={{ ...MONO, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{pathname}</div>
        {event.eventType === 'click' && event.clickData && (
          <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 4, ...MONO }}>
            x: {event.clickData.x} · y: {event.clickData.y}
            {event.clickData.targetText ? ` · "${event.clickData.targetText}"` : ''}
          </div>
        )}
        {event.eventType === 'scroll_depth' && event.metadata?.depth != null && (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${event.metadata.depth}%`, height: '100%', background: c.dot }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3 }}>Scrolled {event.metadata.depth}%</div>
          </div>
        )}
        {event.eventType === 'custom' && event.metadata?.customType && (
          <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 4 }}>
            {event.metadata.customType}{event.metadata.product ? ` · ${event.metadata.product}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Journey panel ─────────────────────────────────────────────────────────────
function JourneyPanel({ session, events, eventsLoading, onClose }) {
  const [eventFilter, setEventFilter] = useState('all');
  const shown = eventFilter === 'all' ? events : events.filter((e) => e.eventType === eventFilter);

  return (
    <div className="bento slide-in" style={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', boxShadow: '0 0 8px var(--accent2)' }} />
            <div className="display" style={{ fontSize: 15, fontWeight: 600 }}>Session journey</div>
          </div>
          <div style={{ ...MONO, fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            {session.sessionId.slice(0, 24)}…
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryPill v={session.eventCount} l="Events" color="var(--accent-glow)" />
        <SummaryPill v={session.pageViews} l="Pages" color="var(--accent2)" />
        <SummaryPill v={session.clicks} l="Clicks" color="var(--accent-glow)" />
        <SummaryPill v={durationStr(session.firstSeen, session.lastSeen)} l="Duration" color="var(--accent3)" />
      </div>

      {/* Filter chips */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['all', 'page_view', 'click', 'scroll_depth', 'custom'].map((f) => (
          <button key={f} className={`chip-btn ${eventFilter === f ? 'active' : ''}`} onClick={() => setEventFilter(f)}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px', position: 'relative' }}>
        {eventsLoading ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>Loading events…</div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 30 }}>
            <div style={{
              position: 'absolute', left: 15, top: 6, bottom: 6, width: 1,
              background: 'linear-gradient(180deg, rgba(99,102,241,0.4), rgba(255,255,255,0.04))',
            }} />
            {shown.map((e, idx) => (
              <TimelineRow key={e._id || idx} event={e} delay={idx * 0.03} />
            ))}
            {shown.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>
                No matching events
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [query, setQuery] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch('/api/sessions?limit=100');
      setSessions(data.sessions || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useWebSocket(useCallback((msg) => {
    if (msg.type === 'new_events') loadSessions();
  }, [loadSessions]));

  const openSession = async (session) => {
    setSelected(session);
    setEventsLoading(true);
    try {
      const data = await apiFetch(`/api/events/${session.sessionId}`);
      setEvents(data.events || []);
    } catch (_) { setEvents([]); }
    finally { setEventsLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter(
      (s) => s.sessionId.toLowerCase().includes(q) ||
             s.pagesVisited?.some((p) => p.toLowerCase().includes(q))
    );
  }, [sessions, query]);

  // Aggregate mini-stats from real sessions
  const totalClicks = sessions.reduce((s, x) => s + (x.clicks || 0), 0);
  const totalViews  = sessions.reduce((s, x) => s + (x.pageViews || 0), 0);
  const avgMs = sessions.length
    ? sessions.reduce((acc, s) => acc + (new Date(s.lastSeen) - new Date(s.firstSeen)), 0) / sessions.length
    : 0;
  const avgDurationStr = (() => {
    const sec = Math.floor(avgMs / 1000);
    return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
  })();

  return (
    <div>
      {/* Mini stat bento row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <MiniStat icon={<Eye size={14} />} label="Page views" value={totalViews} trend="+12%" tint="var(--accent2)" />
        <MiniStat icon={<MousePointerClick size={14} />} label="Total clicks" value={totalClicks} trend="+8%" tint="var(--accent-glow)" />
        <MiniStat icon={<Clock size={14} />} label="Avg duration" value={avgDurationStr} trend="+2m" tint="var(--accent3)" />
        <MiniStat icon={<TrendingUp size={14} />} label="Sessions" value={sessions.length} trend="live" tint="var(--danger)" />
      </div>

      {/* Sessions list + journey panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selected ? 'minmax(360px, 1fr) 1.4fr' : '1fr',
        gap: 16,
        alignItems: 'stretch',
      }}>
        {/* Sessions list */}
        <div className="bento" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by session ID or URL…"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Count + sort btn */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.4 }}>
              {filtered.length} {filtered.length === 1 ? 'SESSION' : 'SESSIONS'}
              {query ? ` MATCHING "${query.toUpperCase()}"` : ''}
            </span>
            <button className="chip-btn" style={{ padding: '4px 8px', fontSize: 11 }}>
              <Filter size={11} /> Latest
            </button>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', flex: 1 }}>
            {loading ? (
              <SkeletonCards />
            ) : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              filtered.map((s) => (
                <SessionCard
                  key={s.sessionId}
                  session={s}
                  active={selected?.sessionId === s.sessionId}
                  onClick={() => openSession(s)}
                />
              ))
            )}
          </div>
        </div>

        {/* Journey panel */}
        {selected && (
          <JourneyPanel
            session={selected}
            events={events}
            eventsLoading={eventsLoading}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
