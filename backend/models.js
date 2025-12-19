const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true } // Storing hashed password
});

const ExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitType: { type: String, enum: ['EQUAL', 'EXACT', 'PERCENTAGE'], required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    owed: { type: Number, required: true },
    settled: { type: Boolean, default: false } // Tracks if this specific person paid back
  }]
});

// backend/models.js - Add this new Schema
const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdDate: { type: Date, default: Date.now }
});

// Update exports
module.exports = {
  User: mongoose.model('User', UserSchema),
  Expense: mongoose.model('Expense', ExpenseSchema),
  Group: mongoose.model('Group', GroupSchema) // <--- NEW
};