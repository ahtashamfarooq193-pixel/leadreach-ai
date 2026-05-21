import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// 1. User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isOnboarded: { type: Boolean, default: false },
  niche: { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  targetKeywords: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 2. Settings Schema
const SettingsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  smtp_host: { type: String, default: 'smtp.gmail.com' },
  smtp_port: { type: Number, default: 465 },
  smtp_user: { type: String, default: '' },
  smtp_pass: { type: String, default: '' },
  sender_name: { type: String, default: '' },
  niche: { type: String, default: '' },
  portfolio_url: { type: String, default: '' },
  github_url: { type: String, default: '' },
  resume_url: { type: String, default: '' },
  target_keywords: { type: String, default: '' },
  daily_limit: { type: Number, default: 30 },
  default_template: { type: String, default: '' },
  gemini_api_key: { type: String, default: '' },
  google_places_api_key: { type: String, default: '' },
  groq_api_key: { type: String, default: '' },
  auto_apply: { type: Number, default: 0 },
  updated_at: { type: Date, default: Date.now }
});

// 3. Job Schema
const JobSchema = new Schema({
  id: { type: String, required: true }, // unique hash per job listing
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  company: { type: String },
  url: { type: String },
  company_url: { type: String },
  email: { type: String },
  description: { type: String },
  platform: { type: String },
  posted_at: { type: Date },
  status: { type: String, default: 'pending' }, // pending, applied, rejected, skipped
  customized_pitch: { type: String },
  created_at: { type: Date, default: Date.now }
});

// Compound index to ensure uniqueness per user
JobSchema.index({ id: 1, userId: 1 }, { unique: true });

// 4. Local Lead Schema
const LocalLeadSchema = new Schema({
  id: { type: String, required: true }, // unique maps place_id or hash
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String },
  niche: { type: String },
  location: { type: String },
  website: { type: String },
  phone: { type: String },
  whatsapp: { type: String },
  email: { type: String },
  instagram_url: { type: String },
  facebook_url: { type: String },
  rating: { type: Number },
  reviews_count: { type: Number },
  status: { type: String, default: 'active' },
  outreach_status: { type: String, default: 'pending' }, // pending, emailed, skipped
  customized_pitch: { type: String },
  needs_optimization: { type: Number, default: 0 },
  optimization_reasons: { type: String },
  created_at: { type: Date, default: Date.now }
});

// Compound index for B2B Leads uniqueness per user
LocalLeadSchema.index({ id: 1, userId: 1 }, { unique: true });

// 5. Outreach Log Schema
const OutreachLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  job_id: { type: String }, // jobId (custom string ID of the job or null if B2B)
  recipient_email: { type: String },
  subject: { type: String },
  body: { type: String },
  status: { type: String }, // success, failed
  error_message: { type: String },
  sent_at: { type: Date, default: Date.now }
});

// 6. Login Log Schema
const LoginLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String },
  email: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  action: { type: String, required: true }, // 'login_success', 'login_failed', 'signup_success', 'signup_failed'
  failureReason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Export Models
export const User = mongoose.model('User', UserSchema);
export const Settings = mongoose.model('Settings', SettingsSchema);
export const Job = mongoose.model('Job', JobSchema);
export const LocalLead = mongoose.model('LocalLead', LocalLeadSchema);
export const OutreachLog = mongoose.model('OutreachLog', OutreachLogSchema);
export const LoginLog = mongoose.model('LoginLog', LoginLogSchema);
export { mongoose };
