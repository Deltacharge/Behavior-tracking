# CausalFunnel Analytics

> Full-stack user behavior analytics platform — session tracking, real-time event streaming, and click heatmaps.

Built for the CausalFunnel Full Stack Engineer hiring challenge.

---

## Live Demo - https://behavior-tracking-script.onrender.com

| Service | URL (Docker / production) | URL (local dev) |
|---|---|---|
| Analytics Dashboard | http://localhost:4000 | http://localhost:3000 |
| Demo Storefront | http://localhost:4000/demo/index.html | http://localhost:4000/demo/index.html |
| API | http://localhost:4000/api | http://localhost:4000/api |
| Health Check | http://localhost:4000/health | http://localhost:4000/health |

---

## Quick Start

### Option A — Docker (recommended, one command)

Runs **one app container** (API + dashboard + demo) plus MongoDB:

```bash
git clone https://github.com/Deltacharge/Behavior-tracking.git
cd Behavior-tracking
docker compose up --build
```

Open http://localhost:4000 for the dashboard. Demo store: http://localhost:4000/demo/index.html

### Option B — Local development

**Prerequisites:** Node 20+, MongoDB running locally

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
npm install
npm run dev         # http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev         # http://localhost:3000
```

**Open the demo page**

Open `demo/index.html` in your browser (file:// or via any static server). Interact with the storefront — click products, scroll, add to cart. Events flow into the dashboard in real time.

```bash
# Serve demo with Python (optional)
python3 -m http.server 8080 --directory demo
# → http://localhost:8080
```

---

## Architecture

```
┌─────────────────────┐     events (HTTP POST)    ┌──────────────────────┐
│  tracker.js         │ ─────────────────────────▶ │  Express API         │
│  (any webpage)      │                             │  /api/events         │
└─────────────────────┘                             │  /api/sessions       │
                                                    │  /api/heatmap        │
┌─────────────────────┐     WebSocket (ws://)       │                      │
│  React Dashboard    │ ◀─────────────────────────  │  WebSocket Server    │
│  Sessions View      │     real-time push          └──────────┬───────────┘
│  Heatmap View       │                                        │
└─────────────────────┘                             ┌──────────▼───────────┐
                                                    │  MongoDB             │
                                                    │  events collection   │
                                                    │  sessions collection │
                                                    └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Tracker | Vanilla JS (zero deps) | Ships to any page without bundle overhead |
| Backend | Node.js + Express | Fast I/O, native WebSocket support |
| Database | MongoDB + Mongoose | Flexible schema for mixed event shapes |
| Real-time | WebSocket (ws library) | Live dashboard updates without polling |
| Frontend | React + Vite | Fast HMR, clean component model |
| Heatmap | HTML Canvas API | High-performance rendering of thousands of points |
| Infrastructure | Docker (single container) + MongoDB Atlas on Render |


## API Reference

### POST `/api/events`
Ingest one event or a batch array.

```json
{
  "sessionId": "uuid-v4",
  "eventType": "click",
  "pageUrl": "https://example.com/products",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "clickData": {
    "x": 340,
    "y": 220,
    "targetTag": "button",
    "targetText": "Add to cart",
    "viewportWidth": 1440,
    "viewportHeight": 900
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "referrer": ""
  }
}
```

Responds: `{ "received": 1, "dropped": 0 }`

---

### GET `/api/sessions`
List all sessions, sorted by most recent.

Query params: `page`, `limit` (default 50)

---

### GET `/api/sessions/stats`
Aggregate totals for the dashboard header.

```json
{
  "totalSessions": 42,
  "totalEvents": 1337,
  "totalPageViews": 380,
  "totalClicks": 720,
  "avgEventsPerSession": 31.8,
  "recentSessions": 12
}
```

---

### GET `/api/events/:sessionId`
Full ordered event timeline for a session.

---

### GET `/api/heatmap?url=<encoded_url>`
Click coordinates for heatmap rendering. Returns normalized `nx`/`ny` values (0–1) based on viewport dimensions, as well as raw pixel coordinates.

---

## Tracker Script

Drop one line into any webpage:

```html
<script src="https://your-cdn.com/tracker.js" data-endpoint="https://your-api.com/api/events"></script>
```

### What it captures

| Event | Trigger | Data |
|---|---|---|
| `page_view` | On load, SPA navigation | URL, viewport size, language |
| `click` | Any click | x/y coords, target tag & text |
| `scroll_depth` | 25/50/75/90/100% milestones | Depth percentage |
| `custom` | Manual via API | Arbitrary metadata |

### Manual tracking

```javascript
window.CausalFunnel.track('checkout_started', { cart_value: 129.99 });
window.CausalFunnel.getSessionId(); // returns current session UUID
```

### Session management
- Stored in `localStorage` with 30-minute inactivity timeout
- Falls back to cookies if localStorage is blocked
- Uses `crypto.randomUUID()` when available, otherwise RFC 4122 compliant fallback

### Performance
- Events are batched and sent every 2 seconds (configurable)
- Uses `sendBeacon` on page unload to ensure final events aren't lost
- Passive event listeners — zero impact on scroll/click performance

---

## Dashboard Features

### Sessions View
- All sessions listed by recency with event counts, page views, and click counts
- Click a session to open a side-panel event timeline (the user journey)
- Timeline shows ordered events with timestamps, click coordinates, scroll milestones
- Search/filter sessions by ID or URL
- Live session list updates via WebSocket — no page refresh needed

### Heatmap View
- Select a page URL from the dropdown (auto-populated from tracked data)
- Canvas renders a radial gradient heatmap overlaid on a page skeleton
- Normalized coordinates account for different viewport sizes
- Individual click dots shown underneath the heat layer

---

## Database Schema

### `events` collection
```javascript
{
  sessionId: String,        // session UUID
  eventType: String,        // page_view | click | scroll_depth | custom
  pageUrl: String,          // full URL
  timestamp: Date,
  clickData: {              // only for click events
    x: Number,              // pixel x from viewport left
    y: Number,              // pixel y from viewport top
    targetTag: String,      // 'button', 'a', 'div', etc.
    targetText: String,     // first 80 chars of innerText
    viewportWidth: Number,
    viewportHeight: Number,
  },
  metadata: Object,         // userAgent, referrer, custom fields
}
```

**Indexes:** `sessionId`, `eventType`, `pageUrl`, `timestamp`, compound `(sessionId, timestamp)`, compound `(pageUrl, eventType)`

### `sessions` collection
```javascript
{
  sessionId: String,        // unique
  firstSeen: Date,
  lastSeen: Date,
  eventCount: Number,
  pageViews: Number,
  clicks: Number,
  pagesVisited: [String],   // deduped list of URLs
  userAgent: String,
  referrer: String,
}
```

---

## Assumptions & Trade-offs

**Session definition:** A 30-minute inactivity window resets the session, matching the Google Analytics standard. This is configurable in `tracker.js`.

**Coordinate normalization:** The heatmap normalizes click coordinates as `x / viewportWidth` to compare clicks across different screen sizes. This trades pixel-perfect placement for cross-device comparability.

**Batch ingestion:** Tracker batches events every 2 seconds rather than firing immediately to reduce API calls. The trade-off is a small delay before events appear in the dashboard. `sendBeacon` ensures the final batch sends even when the user closes the tab.

**No authentication:** The API is open — suitable for a demo. In production, you'd add API key validation on the ingestion endpoint and JWT auth on the dashboard.

**Heatmap coordinate space:** The canvas renders a 1200×700 logical space. Real production heatmaps would capture a screenshot of the page and overlay clicks at pixel-perfect positions using the normalized coordinates.

**WebSocket reconnection:** The dashboard WebSocket reconnects automatically with a 3-second backoff. For production, exponential backoff with jitter would be more appropriate.

---

## Project Structure

```
causalfunnel/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express + WebSocket server
│   │   ├── models/
│   │   │   ├── Event.js
│   │   │   └── Session.js
│   │   └── routes/
│   │       ├── events.js
│   │       ├── sessions.js
│   │       └── heatmap.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Layout, sidebar, header, stats
│   │   ├── pages/
│   │   │   ├── SessionsPage.jsx   # Session list + event timeline
│   │   │   └── HeatmapPage.jsx    # Canvas heatmap
│   │   ├── hooks/
│   │   │   └── useWebSocket.js
│   │   └── utils/
│   │       └── api.js
│   ├── Dockerfile
│   └── package.json
├── tracker/
│   └── tracker.js            # Drop-in tracking script
├── demo/
│   └── index.html            # Demo storefront
├── docker-compose.yml
└── README.md
```
