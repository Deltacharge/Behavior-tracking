const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// GET /api/heatmap?url=<encoded_url>&limit=2000
// Returns click data for heatmap rendering
router.get('/', async (req, res) => {
  try {
    const { url, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 2000, 5000);

    const filter = {
      eventType: 'click',
      'clickData': { $ne: null },
    };

    if (url) {
      filter.pageUrl = decodeURIComponent(url);
    }

    const clicks = await Event.find(filter, {
      'clickData.x': 1,
      'clickData.y': 1,
      'clickData.viewportWidth': 1,
      'clickData.viewportHeight': 1,
      'clickData.targetTag': 1,
      pageUrl: 1,
      timestamp: 1,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Normalize coordinates to 0–1 range based on viewport
    const points = clicks.map((e) => ({
      x: e.clickData.x,
      y: e.clickData.y,
      nx: e.clickData.viewportWidth
        ? e.clickData.x / e.clickData.viewportWidth
        : null,
      ny: e.clickData.viewportHeight
        ? e.clickData.y / e.clickData.viewportHeight
        : null,
      tag: e.clickData.targetTag,
      url: e.pageUrl,
      ts: e.timestamp,
    }));

    // Get unique page URLs that have click data
    const pages = await Event.distinct('pageUrl', { eventType: 'click' });

    res.json({ points, total: points.length, pages });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
