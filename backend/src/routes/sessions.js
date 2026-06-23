const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// GET /api/sessions — list all sessions, sorted by lastSeen desc
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find()
        .sort({ lastSeen: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Session.countDocuments(),
    ]);

    res.json({
      sessions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Sessions fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/stats — aggregate stats for dashboard
router.get('/stats', async (req, res) => {
  try {
    const [totals] = await Session.aggregate([
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalEvents: { $sum: '$eventCount' },
          totalPageViews: { $sum: '$pageViews' },
          totalClicks: { $sum: '$clicks' },
          avgEventsPerSession: { $avg: '$eventCount' },
        },
      },
    ]);

    const recentSessions = await Session.countDocuments({
      lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    res.json({
      ...totals,
      recentSessions,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
