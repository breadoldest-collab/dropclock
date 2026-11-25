import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 32,
  },
  displayUsername: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  defaultEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  defaultPhone: {
    type: String,
    default: '',
    trim: true,
  },
  defaultCity: {
    type: String,
    default: 'hyderabad',
    trim: true,
    lowercase: true,
  },
  defaultNotificationMethod: {
    type: String,
    enum: ['email', 'whatsapp', 'sms', 'all'],
    default: 'email',
  },
}, {
  timestamps: true,
});

userSchema.index({ username: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;
