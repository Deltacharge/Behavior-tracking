/**
 * CausalFunnel Tracker v1.0
 * Drop this script on any page to start capturing user behavior.
 * 
 * Usage:
 *   <script src="tracker.js" data-endpoint="http://localhost:4000/api/events"></script>
 */
(function (window, document) {
  'use strict';

  // ─── Config ────────────────────────────────────────────────────────────────
  const scriptTag = document.currentScript || document.querySelector('script[data-endpoint]');
  const ENDPOINT  = (scriptTag && scriptTag.getAttribute('data-endpoint')) || 'http://localhost:4000/api/events';
  const FLUSH_INTERVAL_MS = 2000;  // batch every 2 s
  const SESSION_KEY = 'cf_session_id';
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min inactivity = new session
  const SESSION_TS_KEY = 'cf_session_ts';

  // ─── Session management ────────────────────────────────────────────────────
  function generateId() {
    // Use crypto.randomUUID if available, otherwise fallback
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getSessionId() {
    try {
      const now = Date.now();
      const stored = localStorage.getItem(SESSION_KEY);
      const lastTs = parseInt(localStorage.getItem(SESSION_TS_KEY) || '0', 10);

      if (stored && now - lastTs < SESSION_TTL_MS) {
        localStorage.setItem(SESSION_TS_KEY, now);
        return stored;
      }

      const newId = generateId();
      localStorage.setItem(SESSION_KEY, newId);
      localStorage.setItem(SESSION_TS_KEY, now);
      return newId;
    } catch (_) {
      // Fallback: cookie-based session
      const match = document.cookie.match(/cf_sid=([^;]+)/);
      if (match) return match[1];
      const id = generateId();
      document.cookie = `cf_sid=${id}; path=/; max-age=${SESSION_TTL_MS / 1000}`;
      return id;
    }
  }

  const SESSION_ID = getSessionId();

  // ─── Event queue ───────────────────────────────────────────────────────────
  let queue = [];

  function enqueue(event) {
    queue.push({
      sessionId: SESSION_ID,
      eventType: event.type,
      pageUrl: window.location.href,
      timestamp: new Date().toISOString(),
      clickData: event.clickData || null,
      metadata: {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        title: document.title,
        ...event.meta,
      },
    });
  }

  function flush() {
    if (!queue.length) return;
    const batch = queue.splice(0, queue.length);

    // Use sendBeacon when available (works on page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
      navigator.sendBeacon(ENDPOINT, blob);
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
        keepalive: true,
      }).catch(() => {
        // Silently fail — don't affect host page
      });
    }
  }

  setInterval(flush, FLUSH_INTERVAL_MS);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  // ─── Page view ─────────────────────────────────────────────────────────────
  function trackPageView() {
    enqueue({
      type: 'page_view',
      meta: {
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        language: navigator.language,
      },
    });
  }

  trackPageView();

  // Handle SPA navigation (pushState / replaceState)
  const origPush    = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPush(...args);
    trackPageView();
  };
  history.replaceState = function (...args) {
    origReplace(...args);
    trackPageView();
  };

  window.addEventListener('popstate', trackPageView);

  // ─── Click tracking ────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    const target = e.target;

    // Truncate innerText to avoid huge payloads
    const rawText = target.innerText || target.value || target.getAttribute('aria-label') || '';
    const targetText = rawText.trim().substring(0, 80);

    enqueue({
      type: 'click',
      clickData: {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
        targetTag: target.tagName.toLowerCase(),
        targetText,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    });
  }, { passive: true });

  // ─── Scroll depth ──────────────────────────────────────────────────────────
  let maxScrollDepth = 0;
  let scrollTimer    = null;

  function onScroll() {
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled   = docHeight > 0 ? Math.round((window.scrollY / docHeight) * 100) : 0;
    const milestones = [25, 50, 75, 90, 100];

    milestones.forEach((m) => {
      if (scrolled >= m && maxScrollDepth < m) {
        maxScrollDepth = m;
        enqueue({
          type: 'scroll_depth',
          meta: { depth: m },
        });
      }
    });
  }

  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(onScroll, 200);
  }, { passive: true });

  // ─── Expose API ────────────────────────────────────────────────────────────
  window.CausalFunnel = {
    track: function (eventType, metadata) {
      enqueue({ type: 'custom', meta: { customType: eventType, ...metadata } });
    },
    getSessionId: function () { return SESSION_ID; },
    flush,
  };

}(window, document));
