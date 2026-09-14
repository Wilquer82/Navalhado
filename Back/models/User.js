const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  usuario: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  senha: { type: String, required: true }
}, { collection: 'users' });

module.exports = mongoose.model('User', userSchema);
