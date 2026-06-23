const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Session = require('../models/Session');

// POST /api/events — ingest a single event or batch
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const events = Array.isArray(payload) ? payload : [payload];

    if (!events.length) {
      return res.status(400).json({ error: 'No events provided' });
    }

    const processed = [];

    for (const raw of events) {
      const { sessionId, eventType, pageUrl, timestamp, clickData, metadata } = raw;

      if (!sessionId || !eventType || !pageUrl) {
        continue; // skip malformed
      }

      const event = await Event.create({
        sessionId,
        eventType,
        pageUrl,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        clickData: clickData || null,
        metadata: metadata || {},
      });

      processed.push(event);

      // Upsert session
      const sessionUpdate = {
        lastSeen: event.timestamp,
        $inc: {
          eventCount: 1,
          pageViews: eventType === 'page_view' ? 1 : 0,
          clicks: eventType === 'click' ? 1 : 0,
        },
        $addToSet: { pagesVisited: pageUrl },
      };

      await Session.findOneAndUpdate(
        { sessionId },
        {
          ...sessionUpdate,
          $setOnInsert: {
            firstSeen: event.timestamp,
            userAgent: metadata?.userAgent || '',
            referrer: metadata?.referrer || '',
          },
        },
        { upsert: true, new: true }
      );
    }

    // Broadcast to dashboard via WebSocket
    if (processed.length > 0) {
      req.app.locals.broadcast({
        type: 'new_events',
        count: processed.length,
        latest: processed[processed.length - 1],
      });
    }

    res.status(201).json({ received: processed.length, dropped: events.length - processed.length });
  } catch (err) {
    console.error('Event ingest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:sessionId — full event timeline for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);

    const events = await Event.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean();

    res.json({ sessionId, events, total: events.length });
  } catch (err) {
    console.error('Fetch events error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
