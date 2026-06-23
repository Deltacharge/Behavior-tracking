import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCw, Flame, MousePointerClick, Maximize2 } from 'lucide-react';
import { apiFetch } from '../utils/api.js';

// ── 7-stop perceptual colour ramp (cool → hot) ────────────────────────────────
const RAMP = [
  [0.00, [10, 14, 60]],
  [0.18, [79, 70, 229]],
  [0.36, [6, 182, 212]],
  [0.54, [52, 211, 153]],
  [0.70, [251, 191, 36]],
  [0.85, [249, 115, 22]],
  [1.00, [239, 68, 68]],
];

function sampleRamp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, c1] = RAMP[i];
    if (t <= t1) {
      const [t0, c0] = RAMP[i - 1];
      const k = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function HeatmapCanvas({ points, radius, alpha, showDots }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 700;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    // Page skeleton background
    ctx.fillStyle = 'rgba(255,255,255,0.018)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(0, 0, W, 60); // nav
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(W / 2 - 280, 150, 560, 220); // hero
    const cardY = 410, cardH = 180, gap = 24;
    const cardW = (W - 80 - gap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      const x = 40 + i * (cardW + gap);
      ctx.beginPath();
      const r = 10;
      ctx.moveTo(x + r, cardY);
      ctx.lineTo(x + cardW - r, cardY);
      ctx.quadraticCurveTo(x + cardW, cardY, x + cardW, cardY + r);
      ctx.lineTo(x + cardW, cardY + cardH - r);
      ctx.quadraticCurveTo(x + cardW, cardY + cardH, x + cardW - r, cardY + cardH);
      ctx.lineTo(x + r, cardY + cardH);
      ctx.quadraticCurveTo(x, cardY + cardH, x, cardY + cardH - r);
      ctx.lineTo(x, cardY + r);
      ctx.quadraticCurveTo(x, cardY, x + r, cardY);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(W / 2 - 100, 630, 200, 40); // CTA

    if (points.length === 0) return;

    // 1. Accumulate greyscale intensity on offscreen canvas
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    points.forEach((p) => {
      const x = p.nx != null ? p.nx * W : p.x;
      const y = p.ny != null ? p.ny * H : p.y;
      const g = octx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      octx.fillStyle = g;
      octx.beginPath();
      octx.arc(x, y, radius, 0, Math.PI * 2);
      octx.fill();
    });

    // 2. Remap alpha channel → colour ramp
    const img = octx.getImageData(0, 0, W, H);
    const data = img.data;
    let maxA = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > maxA) maxA = data[i];
    if (maxA < 1) maxA = 1;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const t = Math.pow(a / maxA, 0.75);
      const [rr, gg, bb] = sampleRamp(t);
      data[i] = rr; data[i + 1] = gg; data[i + 2] = bb;
      data[i + 3] = Math.min(255, Math.round(Math.pow(a / maxA, 0.6) * 255 * alpha));
    }
    octx.putImageData(img, 0, 0);

    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // 3. Individual click dots
    if (showDots) {
      points.forEach((p) => {
        const x = p.nx != null ? p.nx * W : p.x;
        const y = p.ny != null ? p.ny * H : p.y;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    }
  }, [points, radius, alpha, showDots]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ── Label helper ──────────────────────────────────────────────────────────────
function Label({ children, style: s }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 0.5, fontWeight: 600, marginBottom: 8, ...s }}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HeatmapPage() {
  const [allPoints, setAllPoints] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageFilter, setPageFilter] = useState('all');
  const [spinning, setSpinning] = useState(false);
  const [radius, setRadius] = useState(38);
  const [opacity, setOpacity] = useState(0.85);
  const [showDots, setShowDots] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/heatmap');
      setAllPoints(data.points || []);
      setPages(data.pages || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHeatmap(); }, [loadHeatmap, refreshKey]);

  const points = useMemo(() => {
    if (pageFilter === 'all') return allPoints;
    return allPoints.filter((p) => p.url === pageFilter);
  }, [allPoints, pageFilter]);

  const onRefresh = () => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 700);
    setRefreshKey((k) => k + 1);
  };

  const rampCss = RAMP.map(([t, c]) => `rgb(${c[0]},${c[1]},${c[2]}) ${t * 100}%`).join(', ');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

      {/* ── Left controls sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 16 }}>

        {/* Click count card */}
        <div className="bento" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ color: 'var(--danger)', display: 'inline-flex', padding: 6, borderRadius: 8, background: 'rgba(239,68,68,0.1)' }}>
              <MousePointerClick size={14} />
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.4 }}>CLICKS MAPPED</span>
          </div>
          <div className="display-num" style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1.5 }}>
            {loading ? '…' : points.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {loading ? 'loading…' : `across ${new Set(points.map((p) => p.url)).size} page(s)`}
          </div>
        </div>

        {/* Controls card */}
        <div className="bento" style={{ padding: 16 }}>
          <Label>Page URL</Label>
          <select
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)',
              color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, outline: 'none',
            }}
          >
            <option value="all">All pages</option>
            {pages.map((p) => {
              let label = p;
              try { label = new URL(p).pathname + (new URL(p).hash || ''); } catch {}
              return <option key={p} value={p}>{label}</option>;
            })}
          </select>

          <Label style={{ marginTop: 18 }}>
            Blob radius{' '}
            <span style={{ color: 'var(--accent-glow)' }}>{radius}px</span>
          </Label>
          <input
            type="range" min={16} max={80} value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />

          <Label style={{ marginTop: 14 }}>
            Intensity{' '}
            <span style={{ color: 'var(--accent-glow)' }}>{Math.round(opacity * 100)}%</span>
          </Label>
          <input
            type="range" min={0.2} max={1} step={0.05} value={opacity}
            onChange={(e) => setOpacity(+e.target.value)}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />

          <label style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showDots} onChange={(e) => setShowDots(e.target.checked)} />
            Show individual click dots
          </label>
        </div>

        {/* Density legend card */}
        <div className="bento" style={{ padding: 16 }}>
          <Label>Density legend</Label>
          <div style={{
            height: 14, borderRadius: 4, marginTop: 6,
            background: `linear-gradient(90deg, ${rampCss})`,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--muted)' }}>
            <span>Low</span><span>Medium</span><span>High</span>
          </div>
        </div>
      </div>

      {/* ── Canvas panel ── */}
      <div className="bento" style={{ padding: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={14} color="var(--danger)" />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Aggregated density map</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {loading && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Loading…</span>}
            <button className="chip-btn" onClick={onRefresh}>
              <RotateCw size={13} className={spinning ? 'spin' : ''} /> Refresh
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Maximize2 size={11} /> 1200 × 700
            </span>
          </div>
        </div>

        <div style={{
          position: 'relative', background: '#08081a',
          borderRadius: 12, overflow: 'hidden',
          aspectRatio: '1200 / 700',
          border: '1px solid var(--border)',
        }}>
          <HeatmapCanvas points={points} radius={radius} alpha={opacity} showDots={showDots} />
          {points.length === 0 && !loading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)',
            }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MousePointerClick size={22} />
              </div>
              <div style={{ color: 'var(--text)', marginTop: 12, fontWeight: 500 }}>No click data yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Visit the demo page and click around to populate the heatmap.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
