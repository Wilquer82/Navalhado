const mongoose = require('mongoose');

const profissionalSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  especialidade: { type: String, required: true },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Profissional', profissionalSchema);