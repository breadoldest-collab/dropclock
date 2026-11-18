import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  // Direct BMS URL (e.g. /cinemas/HYD/prasads-multiplex-hyderabad/buytickets/PRHN/20261217)
  bmsUrl: {
    type: String,
    default: null,
    trim: true,
  },
  targetDate: {
    type: String, // YYYYMMDD e.g. 20261217
    default: null,
    trim: true,
  },
  watchType: {
    type: String,
    enum: ['new_shows', 'booking_open'],
    default: 'new_shows',
  },
  knownShows: {
    type: [String], // Array of existing showtimes e.g. ["09:00 AM", "11:05 AM"]
    default: [],
  },
  newShowsDetected: {
    type: [String],
    default: [],
  },

  // What to watch
  movieName: {
    type: String,
    required: true,
    trim: true,
  },
  eventCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  
  // Where to watch  
  theatreName: {
    type: String,
    required: true,
    trim: true,
  },
  venueCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  // Who to notify
  email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    default: null,
    trim: true,
  },
  notificationMethod: {
    type: String,
    enum: ['email', 'whatsapp', 'sms', 'telegram', 'all'],
    default: 'email',
  },
  telegramChatId: {
    type: String,
    default: null,
  },
  pushSubscription: {
    type: Object,  // Web Push subscription object
    default: null,
  },

  // Polling state
  status: {
    type: String,
    enum: ['watching', 'triggered', 'expired', 'paused'],
    default: 'watching',
  },
  
  // Smart polling phase
  pollPhase: {
    type: String,
    enum: ['cold', 'warm', 'hot'],
    default: 'cold',
  },
  
  // Tracking
  lastCheckedAt: {
    type: Date,
    default: null,
  },
  triggeredAt: {
    type: Date,
    default: null,
  },
  bookingUrl: {
    type: String,
    default: null,
  },
  checkCount: {
    type: Number,
    default: 0,
  },

}, {
  timestamps: true,
});

// Index for efficient polling queries
alertSchema.index({ status: 1, pollPhase: 1 });
alertSchema.index({ eventCode: 1, city: 1 });
alertSchema.index({ telegramChatId: 1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;

