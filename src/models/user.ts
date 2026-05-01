import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  healthConditions: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
