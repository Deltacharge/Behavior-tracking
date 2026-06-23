const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  firstSeen: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    required: true,
    default: Date.now,
  },
  eventCount: {
    type: Number,
    default: 0,
  },
  pageViews: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  pagesVisited: {
    type: [String],
    default: [],
  },
  userAgent: {
    type: String,
    default: '',
  },
  referrer: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
  versionKey: false,
});

module.exports = mongoose.model('Session', sessionSchema);
