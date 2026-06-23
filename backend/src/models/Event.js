const mongoose = require('mongoose');

const clickDataSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  targetTag: { type: String, default: '' },
  targetText: { type: String, default: '' },
  viewportWidth: { type: Number },
  viewportHeight: { type: Number },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: ['page_view', 'click', 'scroll_depth', 'custom'],
    index: true,
  },
  pageUrl: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  clickData: {
    type: clickDataSchema,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Compound index for session timeline queries
eventSchema.index({ sessionId: 1, timestamp: 1 });

// Compound index for heatmap queries
eventSchema.index({ pageUrl: 1, eventType: 1 });

module.exports = mongoose.model('Event', eventSchema);
